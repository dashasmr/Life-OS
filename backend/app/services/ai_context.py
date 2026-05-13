"""
Server-side AI context: same role as `frontend/lib/ai/context-builder.ts`, but sourced from the DB.

Daily snapshot boundaries still follow existing analytics (UTC midnight on `target_date` through next day;
see `get_daily_summary` in crud). Behavior pattern bucketing uses the timezone on each pattern window's
`range_start` (see `run_behavior_pattern_engine`) so client-built local ISO ranges stay consistent.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud import finance_totals_in_range, list_cleaning_zones, list_focus_sessions, list_tasks
from app.models import Event, FinanceTransaction, Task
from app.services.habits import run_habit_detection_engine
from app.services.patterns import run_behavior_pattern_engine
from app.services.risk_detection import run_risk_detection_engine

_TIMELINE_HEADLINE: dict[str, str] = {
    "work_started": "Manual event logged",
    "focus_started": "Focus session started",
    "focus_ended": "Focus session ended",
    "focus_session_completed": "Focus session completed",
    "pomodoro_completed": "Pomodoro completed",
    "task_completed": "Task completed",
    "income_added": "Income added",
    "expense_added": "Expense added",
    "cleaning_done": "Cleaning completed",
}


def _utc_day_bounds(d: date) -> tuple[datetime, datetime]:
    start = datetime.combine(d, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def _month_bounds_utc(d: date) -> tuple[datetime, datetime]:
    first = date(d.year, d.month, 1)
    start = datetime.combine(first, time.min, tzinfo=timezone.utc)
    if d.month == 12:
        nxt = date(d.year + 1, 1, 1)
    else:
        nxt = date(d.year, d.month + 1, 1)
    end = datetime.combine(nxt, time.min, tzinfo=timezone.utc)
    return start, end


def _focus_seconds_from_event(ev: Event) -> float:
    p = ev.payload or {}
    if ev.type == "focus_session_completed":
        sec = float(p.get("duration_seconds") or 0)
        if sec > 0:
            return sec
        return float(p.get("duration_minutes") or 0) * 60.0
    if ev.type == "focus_ended":
        return float(p.get("duration_seconds") or 0)
    return 0.0


def _timeline_detail(ev: Event) -> str | None:
    p = ev.payload or {}
    if ev.type == "task_completed":
        t = p.get("title")
        return str(t) if t else None
    if ev.type in ("expense_added", "income_added"):
        parts: list[str] = []
        amt = p.get("amount")
        if amt is not None:
            parts.append(f"€{float(amt):.2f}")
        cat = p.get("category")
        if cat:
            parts.append(str(cat))
        return " · ".join(parts) if parts else None
    if ev.type == "cleaning_done":
        zn = p.get("zone_name")
        return str(zn) if zn else None
    return None


def _compute_daily_stats_from_events(events: list[Event]) -> dict[str, Any]:
    tasks_completed = sum(1 for e in events if e.type == "task_completed")
    cleaning_actions = sum(1 for e in events if e.type == "cleaning_done")
    expenses_total = 0.0
    for e in events:
        if e.type != "expense_added":
            continue
        p = e.payload or {}
        amt = float(p.get("amount") or 0)
        if amt > 0:
            expenses_total += amt
    focus_sec = 0.0
    for e in events:
        if e.type not in ("focus_ended", "focus_session_completed"):
            continue
        sec = _focus_seconds_from_event(e)
        if sec > 0:
            focus_sec += sec
    focus_minutes = max(0, int(round(focus_sec / 60.0)))
    return {
        "tasksCompleted": tasks_completed,
        "focusMinutes": focus_minutes,
        "cleaningActions": cleaning_actions,
        "expensesTotal": round(expenses_total, 2),
    }


def _has_focus_touch_on_day(
    sessions: list[Any], day_start: datetime, day_end: datetime
) -> bool:
    for s in sessions:
        st = s.started_at
        if st is None:
            continue
        et = s.ended_at
        if et is None and st < day_end:
            return True
        if day_start <= st < day_end:
            return True
        if et is not None and day_start <= et < day_end:
            return True
    return False


def _compute_system_status(
    *,
    tasks_completed_today: int,
    focus_sessions: list[Any],
    zones: list[dict[str, Any]],
    monthly_balance_delta: float | None,
    day_start: datetime,
    day_end: datetime,
) -> list[dict[str, str]]:
    focus_touch = _has_focus_touch_on_day(focus_sessions, day_start, day_end)
    if tasks_completed_today >= 5:
        mind = ("Productive", "positive")
    elif focus_touch:
        mind = ("Focused", "positive")
    else:
        mind = ("Distracted", "caution")

    overdue = sum(1 for z in zones if z.get("status") == "overdue")
    if overdue > 2:
        home = ("Critical", "critical")
    elif overdue == 1:
        home = ("Needs attention", "caution")
    else:
        home = ("Stable", "positive")

    if monthly_balance_delta is None:
        finance = ("Stable", "neutral")
    elif monthly_balance_delta < 0:
        finance = ("Warning", "caution")
    else:
        finance = ("Stable", "positive")

    return [
        {"key": "mind", "title": "Mind", "statusLabel": mind[0], "tone": mind[1]},
        {"key": "home", "title": "Home", "statusLabel": home[0], "tone": home[1]},
        {"key": "finance", "title": "Finance", "statusLabel": finance[0], "tone": finance[1]},
    ]


def _top_open_tasks(tasks: list[Task], limit: int = 5) -> list[dict[str, Any]]:
    pri = {"high": 0, "medium": 1, "low": 2}
    open_tasks = [t for t in tasks if t.status != "done"]

    def sort_key(t: Task) -> tuple[int, int, float]:
        p = pri.get(t.priority, 99)
        due_ord = t.due_date.toordinal() if t.due_date else 3_000_000
        ts = -t.created_at.timestamp() if t.created_at else 0.0
        return (p, due_ord, ts)

    open_tasks.sort(key=sort_key)
    out: list[dict[str, Any]] = []
    for t in open_tasks[:limit]:
        out.append(
            {
                "id": t.id,
                "title": (t.title or "").strip() or "(untitled)",
                "priority": t.priority,
                "status": t.status,
                "due_date": t.due_date.isoformat() if t.due_date else None,
            }
        )
    return out


def build_daily_ai_context(db: Session, target_date: date) -> dict[str, Any]:
    """
    JSON-serializable snapshot for LLM prompts. Not identical byte-for-byte to the TS builder,
    but carries the same semantic sections.
    """
    day_start, day_end = _utc_day_bounds(target_date)
    month_start, month_end = _month_bounds_utc(target_date)

    stmt = (
        select(Event)
        .where(Event.created_at >= day_start, Event.created_at < day_end)
        .order_by(Event.created_at.asc())
        .limit(2000)
    )
    day_events = list(db.execute(stmt).scalars().all())

    daily_stats = _compute_daily_stats_from_events(day_events)

    timeline: list[dict[str, Any]] = []
    for ev in day_events[-40:]:
        timeline.append(
            {
                "at": ev.created_at.isoformat() if ev.created_at else "",
                "type": ev.type,
                "headline": _TIMELINE_HEADLINE.get(ev.type, "Event"),
                "detail": _timeline_detail(ev),
            }
        )

    zones = list_cleaning_zones(db)
    overdue = [
        {
            "id": z["id"],
            "name": (z.get("name") or "").strip() or "Zone",
            "status": z["status"],
            "frequency_days": z["frequency_days"],
        }
        for z in zones
        if z.get("status") == "overdue"
    ]

    focus_sessions = list_focus_sessions(db, limit=100, offset=0)
    fin_day = finance_totals_in_range(db, day_start, day_end)
    fin_month = finance_totals_in_range(db, month_start, month_end)

    system_status = _compute_system_status(
        tasks_completed_today=daily_stats["tasksCompleted"],
        focus_sessions=focus_sessions,
        zones=zones,
        monthly_balance_delta=fin_month["balance_delta"],
        day_start=day_start,
        day_end=day_end,
    )

    all_tasks = list_tasks(db, limit=300, offset=0)
    top_tasks = _top_open_tasks(all_tasks, 5)

    rule_hints: list[str] = []
    if overdue:
        rule_hints.append(f"{len(overdue)} cleaning zone(s) overdue — home maintenance needs attention.")
    if daily_stats["expensesTotal"] > 100:
        rule_hints.append("Expense events today exceed €100 — review spending if that was unintentional.")
    if daily_stats["focusMinutes"] < 30 and daily_stats["tasksCompleted"] == 0:
        rule_hints.append("Low execution signals today — consider one small win tomorrow morning.")

    pattern_from = day_start - timedelta(days=30)
    behavior_patterns, behavior_patterns_insufficient = run_behavior_pattern_engine(db, pattern_from, day_end)

    risk_from = day_start - timedelta(days=13)
    risk_signals = run_risk_detection_engine(db, risk_from, day_end)

    detected_habits = run_habit_detection_engine(db, lookback_days=45)

    return {
        "date": target_date.isoformat(),
        "dailyStats": daily_stats,
        "systemStatus": system_status,
        "timelineSummary": timeline,
        "topTasks": top_tasks,
        "overdueCleaningZones": overdue,
        "financeSummary": {
            "income_total": fin_day["income_total"],
            "expense_total": fin_day["expense_total"],
            "balance_delta": fin_day["balance_delta"],
        },
        "financeMonth": {
            "income_total": fin_month["income_total"],
            "expense_total": fin_month["expense_total"],
            "balance_delta": fin_month["balance_delta"],
        },
        "behaviorPatterns": behavior_patterns,
        "behaviorPatternsInsufficientHistory": behavior_patterns_insufficient,
        "riskSignals": risk_signals,
        "ruleBasedHints": rule_hints,
        "detectedHabits": detected_habits,
    }


def _top_expense_category_in_range(
    db: Session, range_start: datetime, range_end: datetime
) -> tuple[str | None, float]:
    expense_total = func.sum(FinanceTransaction.amount).label("expense_total")
    stmt = (
        select(FinanceTransaction.category, expense_total)
        .where(
            FinanceTransaction.kind == "expense",
            FinanceTransaction.created_at >= range_start,
            FinanceTransaction.created_at < range_end,
        )
        .group_by(FinanceTransaction.category)
        .order_by(expense_total.desc())
        .limit(1)
    )
    row = db.execute(stmt).first()
    if not row:
        return None, 0.0
    cat = str(row[0] or "").strip() or "Uncategorized"
    return cat, float(row[1] or 0.0)


def _home_health_percent(zones: list[dict[str, Any]]) -> int | None:
    if not zones:
        return None
    points = {"ok": 100, "soon": 60, "overdue": 20}
    total = sum(points.get(z.get("status", "overdue"), 20) for z in zones)
    return int(round(total / len(zones)))


def build_monthly_ai_context(db: Session, month_start: datetime, month_end: datetime) -> dict[str, Any]:
    """
    JSON-serializable month rollup for LLM prompts.
    `month_start` / `month_end` are half-open [start, end), timezone-aware (client-local month from ISO).
    """
    if month_end <= month_start:
        raise ValueError("month_end must be after month_start")

    label_anchor = month_start
    month_label = label_anchor.strftime("%B %Y")

    stmt = (
        select(Event)
        .where(Event.created_at >= month_start, Event.created_at < month_end)
        .order_by(Event.created_at.asc())
        .limit(5000)
    )
    month_events = list(db.execute(stmt).scalars().all())

    month_stats = _compute_daily_stats_from_events(month_events)

    by_day: dict[date, dict[str, float | int]] = defaultdict(lambda: {"tasks": 0, "focus_sec": 0.0})
    for ev in month_events:
        if ev.created_at is None:
            continue
        d = ev.created_at.astimezone(timezone.utc).date()
        if ev.type == "task_completed":
            by_day[d]["tasks"] = int(by_day[d]["tasks"]) + 1
        if ev.type in ("focus_ended", "focus_session_completed"):
            sec = _focus_seconds_from_event(ev)
            if sec > 0:
                by_day[d]["focus_sec"] = float(by_day[d]["focus_sec"]) + sec

    best_day: date | None = None
    best_score = -1
    for d, v in by_day.items():
        focus_min = int(round(float(v["focus_sec"]) / 60.0))
        score = int(v["tasks"]) + focus_min
        if score > best_score:
            best_score = score
            best_day = d
    most_productive_label = best_day.isoformat() if best_day is not None and best_score > 0 else None

    zones = list_cleaning_zones(db)
    overdue = [
        {
            "id": z["id"],
            "name": (z.get("name") or "").strip() or "Zone",
            "status": z["status"],
            "frequency_days": z["frequency_days"],
        }
        for z in zones
        if z.get("status") == "overdue"
    ]
    overdue_count = len(overdue)

    fin_month = finance_totals_in_range(db, month_start, month_end)
    top_cat, top_amt = _top_expense_category_in_range(db, month_start, month_end)

    rule_hints: list[str] = []
    if overdue_count:
        rule_hints.append(f"{overdue_count} cleaning zone(s) overdue at month end.")
    if fin_month["balance_delta"] < 0:
        rule_hints.append("Monthly balance delta is negative — review discretionary spend.")
    if month_stats["focusMinutes"] < 120:
        rule_hints.append("Focus minutes are light for a full month — consider protecting blocks.")

    behavior_patterns, behavior_patterns_insufficient = run_behavior_pattern_engine(db, month_start, month_end)
    risk_signals = run_risk_detection_engine(db, month_start, month_end)

    detected_habits = run_habit_detection_engine(db, lookback_days=56)

    return {
        "monthLabel": month_label,
        "monthRange": {
            "from": month_start.isoformat(),
            "to": month_end.isoformat(),
        },
        "monthStats": month_stats,
        "financeMonth": {
            "income_total": fin_month["income_total"],
            "expense_total": fin_month["expense_total"],
            "balance_delta": fin_month["balance_delta"],
        },
        "topExpenseCategory": top_cat,
        "topExpenseAmount": round(top_amt, 2),
        "mostProductiveDayLabel": most_productive_label,
        "overdueCleaningZones": overdue,
        "cleaningZonesOverdueCount": overdue_count,
        "currentHomeHealthPercent": _home_health_percent(zones),
        "behaviorPatterns": behavior_patterns,
        "behaviorPatternsInsufficientHistory": behavior_patterns_insufficient,
        "riskSignals": risk_signals,
        "ruleBasedHints": rule_hints,
        "detectedHabits": detected_habits,
    }
