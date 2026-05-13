"""Deterministic tests for habit detectors (no database)."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.services.habits.detectors import (
    detect_cleaning_consistency_habit,
    detect_morning_focus_habit,
    detect_spending_category_habit,
    detect_task_completion_rhythm,
)


def _dt(hour: int, day_offset: int = 0) -> datetime:
    base = datetime(2026, 3, 10, hour, 15, tzinfo=timezone.utc)
    return base + timedelta(days=day_offset)


def test_morning_focus_detector():
    events = []
    for i in range(10):
        events.append(SimpleNamespace(type="focus_started", created_at=_dt(8, i), payload={}))
    out = detect_morning_focus_habit(events, lookback_days=45)
    assert out is not None
    assert out["id"] == "habit-morning-focus"
    assert out["category"] == "focus"
    assert "morning" in out["message"].lower()


def test_spending_category_detector():
    events = []
    for i in range(12):
        events.append(
            SimpleNamespace(
                type="expense_added",
                created_at=_dt(14, i),
                payload={"category": "Groceries", "amount": 10 + i},
            )
        )
    out = detect_spending_category_habit(events, lookback_days=45)
    assert out is not None
    assert out["category"] == "finance"
    assert "Groceries" in out["message"]


def test_task_rhythm_detector():
    events = []
    for i in range(14):
        events.append(SimpleNamespace(type="task_completed", created_at=_dt(16, i % 5), payload={}))
    out = detect_task_completion_rhythm(events, lookback_days=45)
    assert out is not None
    assert out["category"] == "productivity"


def test_cleaning_consistency_detector():
    events = []
    base_date = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)
    spacing = [4, 5, 5, 6, 4, 5]
    d = 0
    for gap in spacing:
        d += gap
        events.append(SimpleNamespace(type="cleaning_done", created_at=base_date + timedelta(days=d), payload={}))
    out = detect_cleaning_consistency_habit(events, lookback_days=90)
    assert out is not None
    assert out["category"] == "cleaning"
