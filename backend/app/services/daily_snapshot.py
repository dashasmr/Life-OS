"""
Daily snapshot builder: aggregates real DB state and events into a persisted row.
UTC calendar day alignment matches /analytics/daily-summary.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.crud import finance_totals_in_range, get_daily_summary, list_cleaning_zones
from app.models import DailySnapshot, FocusSession, PomodoroSession


def day_bounds_utc(d: date) -> tuple[datetime, datetime]:
    day_start = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
    return day_start, day_start + timedelta(days=1)


def month_bounds_utc_for_date(d: date) -> tuple[datetime, datetime]:
    first = date(d.year, d.month, 1)
    if d.month == 12:
        next_first = date(d.year + 1, 1, 1)
    else:
        next_first = date(d.year, d.month + 1, 1)
    return (
        datetime.combine(first, time.min).replace(tzinfo=timezone.utc),
        datetime.combine(next_first, time.min).replace(tzinfo=timezone.utc),
    )


def _focus_sessions_overlapping_day(db: Session, day_start: datetime, day_end: datetime) -> list[FocusSession]:
    stmt = select(FocusSession).where(
        FocusSession.started_at < day_end,
        or_(FocusSession.ended_at.is_(None), FocusSession.ended_at >= day_start),
    )
    return list(db.execute(stmt).scalars().all())


def _focus_minutes_from_sessions(db: Session, day_start: datetime, day_end: datetime) -> int:
    stmt = select(func.coalesce(func.sum(FocusSession.duration_seconds), 0)).where(
        FocusSession.started_at >= day_start,
        FocusSession.started_at < day_end,
    )
    seconds = int(db.execute(stmt).scalar_one() or 0)
    return max(0, int(round(seconds / 60)))


def _pomodoro_work_minutes_on_day(db: Session, day_start: datetime, day_end: datetime) -> int:
    stmt = select(func.coalesce(func.sum(PomodoroSession.work_minutes), 0)).where(
        PomodoroSession.status == "completed",
        PomodoroSession.ended_at.is_not(None),
        PomodoroSession.ended_at >= day_start,
        PomodoroSession.ended_at < day_end,
    )
    return int(db.execute(stmt).scalar_one() or 0)


def _has_focus_touch_on_day(sessions: list[FocusSession], day_start: datetime, day_end: datetime) -> bool:
    for s in sessions:
        if s.started_at >= day_end:
            continue
        if s.ended_at is None:
            return True
        if s.ended_at >= day_start:
            return True
    return False


def _compute_home_health_score_percent(zones: list[dict]) -> int | None:
    if not zones:
        return None
    points = {"ok": 100, "soon": 60, "overdue": 20}
    total = sum(points.get(z.get("status", "overdue"), 20) for z in zones)
    return int(round(total / len(zones)))


def _compute_system_state_labels(
    *,
    tasks_completed: int,
    focus_sessions: list[FocusSession],
    zones: list[dict],
    monthly_balance_delta: float | None,
    day_start: datetime,
    day_end: datetime,
) -> dict[str, str]:
    mind = "Distracted"
    if tasks_completed >= 5:
        mind = "Productive"
    elif _has_focus_touch_on_day(focus_sessions, day_start, day_end):
        mind = "Focused"

    overdue = sum(1 for z in zones if z.get("status") == "overdue")
    if overdue > 2:
        home = "Critical"
    elif overdue == 1:
        home = "Needs attention"
    else:
        home = "Stable"

    if monthly_balance_delta is None:
        finance = "Stable"
    elif monthly_balance_delta < 0:
        finance = "Warning"
    else:
        finance = "Stable"

    return {"mind": mind, "home": home, "finance": finance}


def build_daily_snapshot_payload(db: Session, target_date: date) -> dict:
    """
    Aggregate metrics for snapshot_date from events, finance, focus, pomodoro, and current zones.
    Zone-derived fields reflect DB state at generation time (no historical time-travel).
    """
    summary = get_daily_summary(db, target_date)
    day_start, day_end = day_bounds_utc(target_date)

    focus_minutes = _focus_minutes_from_sessions(db, day_start, day_end) + _pomodoro_work_minutes_on_day(
        db, day_start, day_end
    )

    month_start, month_end = month_bounds_utc_for_date(target_date)
    month_totals = finance_totals_in_range(db, month_start, month_end)
    monthly_balance_delta = month_totals["balance_delta"]

    zones = list_cleaning_zones(db)
    home_health = _compute_home_health_score_percent(zones)
    sessions = _focus_sessions_overlapping_day(db, day_start, day_end)

    system_state = _compute_system_state_labels(
        tasks_completed=int(summary["tasks_completed"]),
        focus_sessions=sessions,
        zones=zones,
        monthly_balance_delta=monthly_balance_delta,
        day_start=day_start,
        day_end=day_end,
    )

    return {
        "tasks_completed": int(summary["tasks_completed"]),
        "focus_minutes": focus_minutes,
        "expenses_total": float(summary["expense_total"]),
        "cleaning_completed": int(summary["cleanings_done"]),
        "home_health_score": home_health,
        "system_state": system_state,
    }


def generate_daily_snapshot(db: Session, target_date: date) -> DailySnapshot:
    """
    Upsert a row for target_date from current aggregates (refreshes values if the row exists).
    """
    payload = build_daily_snapshot_payload(db, target_date)
    now = datetime.now(timezone.utc)

    existing = db.execute(
        select(DailySnapshot).where(DailySnapshot.snapshot_date == target_date)
    ).scalar_one_or_none()

    if existing:
        existing.tasks_completed = payload["tasks_completed"]
        existing.focus_minutes = payload["focus_minutes"]
        existing.expenses_total = payload["expenses_total"]
        existing.cleaning_completed = payload["cleaning_completed"]
        existing.home_health_score = payload["home_health_score"]
        existing.system_state = payload["system_state"]
        existing.updated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    row = DailySnapshot(
        id=str(uuid.uuid4()),
        snapshot_date=target_date,
        tasks_completed=payload["tasks_completed"],
        focus_minutes=payload["focus_minutes"],
        expenses_total=payload["expenses_total"],
        cleaning_completed=payload["cleaning_completed"],
        home_health_score=payload["home_health_score"],
        system_state=payload["system_state"],
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_daily_snapshot(db: Session, target_date: date) -> DailySnapshot | None:
    return db.execute(select(DailySnapshot).where(DailySnapshot.snapshot_date == target_date)).scalar_one_or_none()


def list_daily_snapshots(db: Session, limit: int = 60) -> list[DailySnapshot]:
    stmt = select(DailySnapshot).order_by(desc(DailySnapshot.snapshot_date)).limit(limit)
    return list(db.execute(stmt).scalars().all())


def ensure_today_snapshot(db: Session) -> DailySnapshot:
    """MVP daily reset hook: materialize or refresh today's row when the app touches snapshots."""
    return generate_daily_snapshot(db, date.today())
