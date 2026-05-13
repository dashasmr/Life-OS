"""Priority / confidence adaptation from aggregate acceptance."""

from __future__ import annotations

from collections import defaultdict


def compute_priority_adjustments(
    rows: list[tuple[str, str]],
) -> dict[str, dict[str, float]]:
    """
    Each row: (recommendation_id, outcome).

    Returns recommendation_id -> { priority_weight, confidence }.
    """
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for rid, outcome in rows:
        counts[rid][outcome] += 1

    out: dict[str, dict[str, float]] = {}
    for rid, bucket in counts.items():
        accepted = bucket.get("accepted", 0)
        ignored = bucket.get("ignored", 0)
        dismissed = bucket.get("dismissed", 0)
        negative = ignored + dismissed
        total = accepted + negative + 1e-6

        # Weight nudges stay bounded so ordering stays stable.
        weight = 1.0 + 0.08 * min(accepted, 24) - 0.07 * min(negative, 28)
        weight = max(0.55, min(1.45, weight))

        confidence = max(0.25, min(0.95, accepted / total + 0.35))

        out[rid] = {"priority_weight": weight, "confidence": confidence}

    return out
