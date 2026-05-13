"""
Loads historical rows for [range_start, range_end) and runs all pattern detectors.

Event-day bucketing uses the timezone of `range_start` (same instant semantics as client-built
local ranges from `toISOString()`). Snapshot rows use local calendar dates derived from the same
half-open window so they stay aligned with finance ranges.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone, tzinfo
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DailySnapshot, Event, FinanceTransaction
from app.services.patterns.detectors import (
    detect_cleaning_productivity_pattern,
    detect_focus_productivity_pattern,
    detect_spending_top_category_pattern,
)


def _anchor_tz(range_start: datetime) -> tzinfo:
    return range_start.tzinfo or timezone.utc


def _bucket_date(ev: Event, anchor_tz: tzinfo) -> date | None:
    if ev.created_at is None:
        return None
    return ev.created_at.astimezone(anchor_tz).date()


def _local_calendar_span_days(range_start: datetime, range_end: datetime) -> int:
    tz = _anchor_tz(range_start)
    start_d = range_start.astimezone(tz).date()
    end_excl = range_end.astimezone(tz).date()
    return max(0, (end_excl - start_d).days)


def _distinct_event_days(events: list[Event], anchor_tz: tzinfo) -> set[date]:
    out: set[date] = set()
    for e in events:
        d = _bucket_date(e, anchor_tz)
        if d is not None:
            out.add(d)
    return out


def _history_too_thin(events: list[Event], range_start: datetime, range_end: datetime) -> bool:
    """Do not emit confident behavioral patterns on tiny or single-cluster samples."""
    calendar_span = _local_calendar_span_days(range_start, range_end)
    if calendar_span < 7:
        return True
    if len(events) < 12:
        return True
    anchor_tz = _anchor_tz(range_start)
    if len(_distinct_event_days(events, anchor_tz)) < 5:
        return True
    return False


def _aggregate_events(events: list[Event], anchor_tz: tzinfo) -> tuple[dict[date, int], set[date]]:
    task_by_day: dict[date, int] = defaultdict(int)
    focus_days: set[date] = set()
    for e in events:
        d = _bucket_date(e, anchor_tz)
        if d is None:
            continue
        if e.type == "task_completed":
            task_by_day[d] += 1
        if e.type in ("focus_started", "focus_ended", "focus_session_completed"):
            focus_days.add(d)
    return dict(task_by_day), focus_days


def _load_snapshots_health_by_day(
    db: Session, range_start: datetime, range_end: datetime
) -> dict[date, int]:
    tz = _anchor_tz(range_start)
    start_d = range_start.astimezone(tz).date()
    end_excl = range_end.astimezone(tz).date()
    stmt = select(DailySnapshot).where(
        DailySnapshot.snapshot_date >= start_d,
        DailySnapshot.snapshot_date < end_excl,
    )
    rows = list(db.execute(stmt).scalars().all())
    out: dict[date, int] = {}
    for r in rows:
        if r.home_health_score is not None:
            out[r.snapshot_date] = int(r.home_health_score)
    return out


def _load_expense_totals_by_category(
    db: Session, range_start: datetime, range_end: datetime
) -> dict[str, float]:
    stmt = select(FinanceTransaction).where(
        FinanceTransaction.kind == "expense",
        FinanceTransaction.created_at >= range_start,
        FinanceTransaction.created_at < range_end,
    )
    rows = list(db.execute(stmt).scalars().all())
    sums: dict[str, float] = defaultdict(float)
    for r in rows:
        cat = (r.category or "").strip() or "Uncategorized"
        sums[cat] += float(r.amount)
    return dict(sums)


def run_behavior_pattern_engine(
    db: Session, range_start: datetime, range_end: datetime
) -> tuple[list[dict[str, Any]], bool]:
    """
    Returns (patterns, insufficient_history). When insufficient_history is True, patterns is always
    empty — the sample is too small or too clustered to justify behavioral claims.
    """
    if range_end <= range_start:
        return [], False

    calendar_span_days = _local_calendar_span_days(range_start, range_end)

    stmt = (
        select(Event)
        .where(Event.created_at >= range_start, Event.created_at < range_end)
        .order_by(Event.created_at.asc())
        .limit(8000)
    )
    events = list(db.execute(stmt).scalars().all())

    if _history_too_thin(events, range_start, range_end):
        return [], True

    anchor_tz = _anchor_tz(range_start)
    task_by_day, focus_days = _aggregate_events(events, anchor_tz)

    health_by_day = _load_snapshots_health_by_day(db, range_start, range_end)
    expense_totals = _load_expense_totals_by_category(db, range_start, range_end)

    patterns: list[dict[str, Any]] = []
    p1 = detect_focus_productivity_pattern(task_by_day, focus_days)
    if p1:
        patterns.append(p1)

    task_for_cleaning = {d: task_by_day.get(d, 0) for d in health_by_day}
    p2 = detect_cleaning_productivity_pattern(task_for_cleaning, health_by_day)
    if p2:
        patterns.append(p2)

    p3 = detect_spending_top_category_pattern(expense_totals, calendar_span_days)
    if p3:
        patterns.append(p3)

    patterns.sort(key=lambda x: float(x.get("confidence", 0)), reverse=True)
    return patterns, False
