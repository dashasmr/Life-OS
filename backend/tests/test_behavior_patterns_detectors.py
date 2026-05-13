from datetime import date

from app.services.patterns.detectors import (
    detect_cleaning_productivity_pattern,
    detect_focus_productivity_pattern,
    detect_spending_top_category_pattern,
)


def test_focus_productivity_emits_when_focus_days_clearly_higher():
    task_by_day = {
        date(2026, 5, 1): 2,
        date(2026, 5, 2): 1,
        date(2026, 5, 3): 4,
        date(2026, 5, 4): 1,
        date(2026, 5, 5): 5,
        date(2026, 5, 6): 2,
    }
    focus_days = {date(2026, 5, 1), date(2026, 5, 3), date(2026, 5, 5)}
    out = detect_focus_productivity_pattern(task_by_day, focus_days)
    assert out is not None
    assert out["id"] == "focus_productivity_v1"
    assert out["category"] == "focus"
    assert 0 <= out["confidence"] <= 1
    assert "focus" in out["message"].lower()


def test_spending_top_category_emits_for_clear_leader():
    totals = {"Food": 120.0, "Transit": 30.0, "Other": 25.0}
    out = detect_spending_top_category_pattern(totals, calendar_span_days=30)
    assert out is not None
    assert out["category"] == "finance"
    assert "Food" in out["message"]
    assert "month" in out["message"].lower()


def test_spending_top_category_none_when_window_under_one_week():
    totals = {"Food": 120.0, "Other": 10.0}
    assert detect_spending_top_category_pattern(totals, calendar_span_days=3) is None


def test_cleaning_productivity_emits_when_low_health_days_weaker():
    health = {
        date(2026, 5, 1): 80,
        date(2026, 5, 2): 85,
        date(2026, 5, 3): 76,
        date(2026, 5, 4): 40,
        date(2026, 5, 5): 35,
        date(2026, 5, 6): 38,
    }
    tasks = {
        date(2026, 5, 1): 5,
        date(2026, 5, 2): 6,
        date(2026, 5, 3): 7,
        date(2026, 5, 4): 1,
        date(2026, 5, 5): 1,
        date(2026, 5, 6): 1,
    }
    out = detect_cleaning_productivity_pattern(tasks, health)
    assert out is not None
    assert out["category"] == "cleaning"
    assert out["confidence"] > 0
