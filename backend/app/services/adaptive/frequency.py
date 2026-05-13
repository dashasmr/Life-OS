"""Frequency adaptation — throttle noisy recommendation ids after repeated dismissals."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta


def compute_frequency_adjustments(
    rows: list[tuple[str, str, datetime]],
    *,
    now: datetime,
    window_days: int = 7,
) -> dict[str, dict[str, int]]:
    """
    Each row: (recommendation_id, outcome, created_at).

    Returns recommendation_id -> { min_minutes_between_suggestions } (only when > 0).
    """
    cutoff = now - timedelta(days=window_days)
    dismiss_counts: dict[str, int] = defaultdict(int)
    for rid, outcome, created_at in rows:
        if outcome != "dismissed":
            continue
        if created_at < cutoff:
            continue
        dismiss_counts[rid] += 1

    out: dict[str, dict[str, int]] = {}
    for rid, n in dismiss_counts.items():
        if n >= 6:
            mins = 360
        elif n >= 3:
            mins = 120
        else:
            continue
        out[rid] = {"min_minutes_between_suggestions": mins}

    return out
