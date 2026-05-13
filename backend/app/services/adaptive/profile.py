"""Merge adaptive subsystems into a single profile payload for the client engine."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.crud import list_recommendation_feedback_since
from app.schemas import AdaptiveContextRead, RecommendationAdjustmentRead
from app.services.adaptive.frequency import compute_frequency_adjustments
from app.services.adaptive.priority import compute_priority_adjustments
from app.services.adaptive.timing import compute_timing_adjustments


def build_adaptive_context(db: Session, *, now: datetime | None = None) -> AdaptiveContextRead:
    """Aggregate persisted feedback into tuning knobs (UI-independent core logic)."""
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(days=90)

    rows_orm = list_recommendation_feedback_since(db, since)

    timing_inputs: list[tuple[str, str, int | None]] = []
    priority_inputs: list[tuple[str, str]] = []
    frequency_inputs: list[tuple[str, str, datetime]] = []

    for r in rows_orm:
        timing_inputs.append((r.recommendation_id, r.outcome, r.local_hour))
        priority_inputs.append((r.recommendation_id, r.outcome))
        frequency_inputs.append((r.recommendation_id, r.outcome, r.created_at))

    timing = compute_timing_adjustments(timing_inputs)
    priority = compute_priority_adjustments(priority_inputs)
    frequency = compute_frequency_adjustments(frequency_inputs, now=now)

    ids: set[str] = set()
    ids |= set(timing.keys())
    ids |= set(priority.keys())
    ids |= set(frequency.keys())

    adjustments: dict[str, RecommendationAdjustmentRead] = {}

    for rid in ids:
        adj = RecommendationAdjustmentRead()
        if rid in priority:
            adj.priority_weight = priority[rid]["priority_weight"]
            adj.confidence = priority[rid]["confidence"]
        if rid in timing:
            t = timing[rid]
            if "avoid_hours_local" in t:
                adj.avoid_hours_local = list(t["avoid_hours_local"])  # type: ignore[arg-type]
            if "prefer_hours_local" in t:
                adj.prefer_hours_local = list(t["prefer_hours_local"])  # type: ignore[arg-type]
            if "defer_show_until_hour_local" in t:
                adj.defer_show_until_hour_local = t["defer_show_until_hour_local"]  # type: ignore[assignment]
        if rid in frequency:
            adj.min_minutes_between_suggestions = frequency[rid]["min_minutes_between_suggestions"]

        adjustments[rid] = adj

    return AdaptiveContextRead(adjustments=adjustments)
