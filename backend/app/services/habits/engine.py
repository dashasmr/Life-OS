"""Aggregate habit detection from historical events (+ optional snapshots via event density)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Event
from app.services.habits.detectors import (
    detect_cleaning_consistency_habit,
    detect_morning_focus_habit,
    detect_spending_category_habit,
    detect_task_completion_rhythm,
)
from app.services.habits.support_actions import enrich_detected_habit

_DETECTORS = (
    detect_morning_focus_habit,
    detect_cleaning_consistency_habit,
    detect_spending_category_habit,
    detect_task_completion_rhythm,
)


def run_habit_detection_engine(db: Session, *, lookback_days: int = 45) -> list[dict[str, Any]]:
    """
    Load recent events once; run all detectors. Pure statistical signals — no user-declared habits.
    """
    days = max(14, min(lookback_days, 120))
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    stmt = (
        select(Event)
        .where(Event.created_at >= start, Event.created_at < end)
        .order_by(Event.created_at.asc())
        .limit(10000)
    )
    events = list(db.execute(stmt).scalars().all())

    results: list[dict[str, Any]] = []
    for fn in _DETECTORS:
        row = fn(events, lookback_days=days)
        if row:
            results.append(enrich_detected_habit(row))
    results.sort(key=lambda x: float(x.get("confidence") or 0), reverse=True)
    return results
