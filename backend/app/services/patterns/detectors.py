"""
Pure detectors: no DB, no UI. Input is pre-aggregated history for a single time window.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

PatternCategory = Literal["focus", "cleaning", "finance"]


def _clamp_confidence(x: float) -> float:
    return max(0.0, min(1.0, round(x, 3)))


def detect_focus_productivity_pattern(
    task_by_day: dict[date, int],
    focus_days: set[date],
) -> dict[str, Any] | None:
    """
    Compare average task completions on UTC days with any focus-related event vs days without,
    among days that logged at least one task.
    """
    with_focus = [task_by_day[d] for d in task_by_day if task_by_day[d] > 0 and d in focus_days]
    without = [task_by_day[d] for d in task_by_day if task_by_day[d] > 0 and d not in focus_days]

    if len(with_focus) < 3 or len(without) < 3:
        return None

    mean_f = sum(with_focus) / len(with_focus)
    mean_o = sum(without) / len(without)
    if mean_o <= 0 or mean_f <= mean_o * 1.08:
        return None

    ratio = mean_f / mean_o
    n_boost = min(len(with_focus), len(without), 10)
    confidence = _clamp_confidence(0.32 + 0.06 * n_boost + 0.35 * min(1.0, ratio - 1.0))

    return {
        "id": "focus_productivity_v1",
        "category": "focus",
        "confidence": confidence,
        "message": "You complete more tasks on days with focus sessions.",
    }


def detect_cleaning_productivity_pattern(
    task_by_day: dict[date, int],
    health_by_day: dict[date, int],
) -> dict[str, Any] | None:
    """
    Compare task output on days whose materialized snapshot home_health_score is high vs low.
    """
    high_days = [task_by_day[d] for d, h in health_by_day.items() if h is not None and h >= 70]
    low_days = [task_by_day[d] for d, h in health_by_day.items() if h is not None and h < 50]

    if len(high_days) < 3 or len(low_days) < 3:
        return None

    mean_h = sum(high_days) / len(high_days)
    mean_l = sum(low_days) / len(low_days)
    if mean_h <= 0 or mean_l >= mean_h * 0.92:
        return None

    gap = (mean_h - mean_l) / mean_h
    n_boost = min(len(high_days), len(low_days), 10)
    confidence = _clamp_confidence(0.34 + 0.05 * n_boost + 0.45 * min(1.0, gap))

    return {
        "id": "cleaning_productivity_v1",
        "category": "cleaning",
        "confidence": confidence,
        "message": "Your productivity drops when home health scores are lower.",
    }


def detect_spending_top_category_pattern(
    category_totals: dict[str, float],
    calendar_span_days: int,
) -> dict[str, Any] | None:
    """
    `calendar_span_days` is the difference between local start/end calendar dates for [range_start, range_end),
    i.e. whole days covered — never emit category narratives before at least a week of coverage.
    """
    if calendar_span_days < 7:
        return None
    if not category_totals:
        return None
    total = sum(category_totals.values())
    if total < 15.0:
        return None

    best_cat: str | None = None
    best_amt = 0.0
    for cat, amt in category_totals.items():
        if amt > best_amt:
            best_amt = amt
            best_cat = cat

    if not best_cat or best_amt <= 0:
        return None

    share = best_amt / total
    if share < 0.22:
        return None

    if calendar_span_days >= 25:
        period = "this month"
    elif calendar_span_days >= 14:
        period = "over the past couple of weeks"
    else:
        period = "over the past week"

    display_cat = best_cat.strip() or "Uncategorized"
    confidence = _clamp_confidence(0.42 + 0.55 * min(1.0, share))

    return {
        "id": "spending_top_category_v1",
        "category": "finance",
        "confidence": confidence,
        "message": f"{display_cat} has been your highest spending category {period}.",
    }
