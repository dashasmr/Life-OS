"""Recommendation timing adaptation from hourly feedback patterns."""

from __future__ import annotations

from collections import defaultdict

# Local hours treated as "morning" for cleaning deferral (assignment narrative).
MORNING_START = 6
MORNING_END = 11
DEFER_UNTIL_HOUR = 12

EVENING_START = 17
EVENING_END = 22


def _is_cleaning_rec(recommendation_id: str) -> bool:
    return "cleaning" in recommendation_id.lower()


def _is_focus_rec(recommendation_id: str) -> bool:
    return recommendation_id == "action-focus-start"


def compute_timing_adjustments(
    rows: list[tuple[str, str, int | None]],
) -> dict[str, dict[str, object]]:
    """
    Each row: (recommendation_id, outcome, local_hour).

    Returns recommendation_id -> merged fragments:
      avoid_hours_local, prefer_hours_local, defer_show_until_hour_local
    """
    by_id_hour: dict[str, dict[int, list[str]]] = defaultdict(lambda: defaultdict(list))
    for rid, outcome, hour in rows:
        if hour is None:
            continue
        by_id_hour[rid][hour].append(outcome)

    out: dict[str, dict[str, object]] = {}

    for rid, hour_map in by_id_hour.items():
        if _is_cleaning_rec(rid):
            negatives_morning = 0
            positives_morning = 0
            for h in range(MORNING_START, MORNING_END + 1):
                outs = hour_map.get(h, [])
                negatives_morning += sum(1 for o in outs if o in ("ignored", "dismissed"))
                positives_morning += sum(1 for o in outs if o == "accepted")

            if negatives_morning >= 3 and negatives_morning >= 2 * max(positives_morning, 1):
                out[rid] = {
                    "avoid_hours_local": list(range(MORNING_START, MORNING_END + 1)),
                    "defer_show_until_hour_local": DEFER_UNTIL_HOUR,
                    "prefer_hours_local": list(range(14, 19)),
                }

        if _is_focus_rec(rid):
            accepted_by_hour: dict[int, int] = defaultdict(int)
            noise_by_hour: dict[int, int] = defaultdict(int)
            for h, outs in hour_map.items():
                accepted_by_hour[h] += sum(1 for o in outs if o == "accepted")
                noise_by_hour[h] += sum(1 for o in outs if o in ("ignored", "dismissed"))

            evening_scores: list[tuple[int, float]] = []
            for h in range(EVENING_START, EVENING_END + 1):
                acc = accepted_by_hour[h]
                noise = noise_by_hour[h]
                if acc + noise == 0:
                    continue
                evening_scores.append((h, acc / (acc + noise + 0.5)))

            evening_scores.sort(key=lambda x: (-x[1], -x[0]))
            prefer_evening = [h for h, _ in evening_scores[:4]]

            morning_accept = sum(accepted_by_hour[h] for h in range(8, 15))
            evening_accept = sum(accepted_by_hour[h] for h in range(EVENING_START, EVENING_END + 1))

            merged = out.setdefault(rid, {})
            if evening_accept >= max(2, morning_accept) and prefer_evening:
                merged["prefer_hours_local"] = prefer_evening

    return out
