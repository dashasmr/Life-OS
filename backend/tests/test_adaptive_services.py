"""Unit tests for adaptive recommendation helpers (no DB)."""

from datetime import datetime, timedelta, timezone

from app.services.adaptive.frequency import compute_frequency_adjustments
from app.services.adaptive.priority import compute_priority_adjustments
from app.services.adaptive.timing import compute_timing_adjustments


def test_timing_cleaning_morning_avoidance():
    rows: list[tuple[str, str, int | None]] = []
    for _ in range(4):
        rows.append(("action-cleaning-overdue", "ignored", 8))
    rows.append(("action-cleaning-overdue", "accepted", 8))

    t = compute_timing_adjustments(rows)
    assert "action-cleaning-overdue" in t
    assert 8 in t["action-cleaning-overdue"]["avoid_hours_local"]


def test_timing_evening_focus_preference():
    rows = []
    for h in (18, 19, 20):
        rows.append(("action-focus-start", "accepted", h))
    rows.append(("action-focus-start", "accepted", 9))

    t = compute_timing_adjustments(rows)
    assert "action-focus-start" in t
    assert t["action-focus-start"]["prefer_hours_local"]


def test_priority_weights_bounded():
    rows = [("action-log-activity", "accepted")] * 5
    rows += [("action-log-activity", "dismissed")] * 2
    p = compute_priority_adjustments(rows)
    assert "action-log-activity" in p
    assert 0.55 <= p["action-log-activity"]["priority_weight"] <= 1.45


def test_frequency_throttle_after_dismiss_spam():
    now = datetime.now(timezone.utc)
    rows = [("action-finance-review", "dismissed", now - timedelta(days=i)) for i in range(4)]
    f = compute_frequency_adjustments(rows, now=now)
    assert "action-finance-review" in f
    assert f["action-finance-review"]["min_minutes_between_suggestions"] == 120
