"""Rule-based habit detectors over historical Event rows (no manual habit definitions)."""

from __future__ import annotations

import re
import statistics
from collections import Counter
from datetime import timezone
from typing import Any

FOCUS_EVENT_TYPES = frozenset({"focus_started", "focus_session_completed"})
# Inclusive UTC hour window treated as "morning" for cross-user comparability (events stored with tz).
MORNING_HOUR_START = 5
MORNING_HOUR_END = 11


def detect_morning_focus_habit(events: list[Any], *, lookback_days: int) -> dict[str, Any] | None:
    """Cluster of focus signals in morning hours."""
    relevant: list[Any] = []
    for e in events:
        if e.type not in FOCUS_EVENT_TYPES:
            continue
        if not e.created_at:
            continue
        relevant.append(e)
    if len(relevant) < 8:
        return None
    morning_n = 0
    for e in relevant:
        h = e.created_at.astimezone(timezone.utc).hour
        if MORNING_HOUR_START <= h <= MORNING_HOUR_END:
            morning_n += 1
    ratio = morning_n / len(relevant)
    if ratio < 0.52:
        return None
    confidence = min(0.93, 0.48 + ratio * 0.44)
    return {
        "id": "habit-morning-focus",
        "category": "focus",
        "confidence": round(confidence, 3),
        "frequency": f"{morning_n} of {len(relevant)} focus events between {MORNING_HOUR_START}:00–{MORNING_HOUR_END}:59 UTC "
        f"over ~{lookback_days} days",
        "message": "You often focus in the morning — strong anchor for deep work.",
    }


def detect_cleaning_consistency_habit(events: list[Any], *, lookback_days: int) -> dict[str, Any] | None:
    """Stable spacing between cleaning_done days."""
    days_set: set[Any] = set()
    for e in events:
        if e.type != "cleaning_done" or not e.created_at:
            continue
        days_set.add(e.created_at.astimezone(timezone.utc).date())
    unique_sorted = sorted(days_set)
    if len(unique_sorted) < 6:
        return None
    gaps = [(unique_sorted[i] - unique_sorted[i - 1]).days for i in range(1, len(unique_sorted))]
    if not gaps:
        return None
    median_gap = statistics.median(gaps)
    mean_gap = statistics.mean(gaps)
    if mean_gap < 1.6 or median_gap < 2 or median_gap > 16:
        return None
    try:
        cv = statistics.pstdev(gaps) / mean_gap if mean_gap > 0 else 1.0
    except statistics.StatisticsError:
        cv = 1.0
    if cv > 0.72:
        return None
    confidence = min(0.9, 0.52 + (1 - min(cv, 1.0)) * 0.28 + min(len(gaps), 24) * 0.006)
    _ = lookback_days
    return {
        "id": "habit-cleaning-consistency",
        "category": "cleaning",
        "confidence": round(confidence, 3),
        "frequency": f"Median gap ~{median_gap:.0f} days across {len(unique_sorted)} distinct cleaning days "
        f"({len(gaps)} intervals)",
        "message": "Cleaning consistency habit — upkeep follows a steady rhythm.",
        "supportMeta": {"medianGapDays": float(round(median_gap, 2))},
    }


def detect_spending_category_habit(events: list[Any], *, lookback_days: int) -> dict[str, Any] | None:
    """Dominant expense category share."""
    cats: list[str] = []
    for e in events:
        if e.type != "expense_added":
            continue
        p = e.payload or {}
        cats.append(str(p.get("category") or "").strip() or "Uncategorized")
    if len(cats) < 10:
        return None
    top_cat, top_n = Counter(cats).most_common(1)[0]
    share = top_n / len(cats)
    if share < 0.34:
        return None
    confidence = min(0.88, 0.42 + share * 0.52)
    slug = re.sub(r"[^a-z0-9]+", "-", top_cat.lower()).strip("-")[:48] or "general"
    _ = lookback_days
    return {
        "id": f"habit-spend-{slug}",
        "category": "finance",
        "confidence": round(confidence, 3),
        "frequency": f"{top_n} of {len(cats)} expense events tagged “{top_cat}”",
        "message": f"Recurring spending pattern in category “{top_cat}”.",
        "supportMeta": {"topExpenseCategory": top_cat},
    }


def detect_task_completion_rhythm(events: list[Any], *, lookback_days: int) -> dict[str, Any] | None:
    """Peak hour for task_completed signals."""
    hours: list[int] = []
    for e in events:
        if e.type != "task_completed" or not e.created_at:
            continue
        hours.append(e.created_at.astimezone(timezone.utc).hour)
    if len(hours) < 12:
        return None
    peak_hour, peak_n = Counter(hours).most_common(1)[0]
    share = peak_n / len(hours)
    if share < 0.38:
        return None
    confidence = min(0.87, 0.45 + share * 0.46)
    next_hour = (peak_hour + 1) % 24
    _ = lookback_days
    return {
        "id": f"habit-task-hour-{peak_hour}",
        "category": "productivity",
        "confidence": round(confidence, 3),
        "frequency": f"{peak_n} of {len(hours)} task completions around {peak_hour}:00–{next_hour}:00 (UTC)",
        "message": f"Task completion rhythm — closures cluster near {peak_hour}:00 (UTC hour bucket).",
        "supportMeta": {"peakHourUtc": peak_hour},
    }
