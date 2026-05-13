"""
Pure risk heuristics — no DB, no LLM. Callers pass aggregates for a fixed analysis horizon.
"""
from __future__ import annotations

from datetime import date
from typing import Any, Literal

Severity = Literal["low", "medium", "high"]
RiskCategory = Literal["focus", "finance", "environment"]


def _sig(
    *,
    rid: str,
    severity: Severity,
    category: RiskCategory,
    message: str,
    explanation: str,
    detected_at: str,
) -> dict[str, Any]:
    return {
        "id": rid,
        "severity": severity,
        "category": category,
        "message": message,
        "explanation": explanation,
        "detectedAt": detected_at,
    }


def detect_burnout_risk(
    *,
    task_by_day: dict[date, int],
    focus_minutes_by_day: dict[date, int],
    pomodoro_count_7d: int,
    day_sequence: list[date],
    detected_at: str,
) -> dict[str, Any] | None:
    """
    High task volume + shallow focus + few Pomodoro-style breaks + recent output dip.
    `day_sequence` is oldest→newest (typically 7 UTC days ending at analysis day).
    """
    if len(day_sequence) < 5:
        return None

    tasks_total = sum(task_by_day.get(d, 0) for d in day_sequence)
    focus_total = sum(focus_minutes_by_day.get(d, 0) for d in day_sequence)
    task_vals = [task_by_day.get(d, 0) for d in day_sequence]

    score = 0.0
    if tasks_total >= 16:
        score += 1.25
    elif tasks_total >= 11:
        score += 0.75

    if tasks_total >= 9 and focus_total < tasks_total * 7:
        score += 1.1

    if tasks_total >= 9 and pomodoro_count_7d < 2:
        score += 1.0

    first = sum(task_vals[:4])
    last = sum(task_vals[-3:])
    if first >= 6 and last < first * 0.72:
        score += 1.0

    if score >= 3.2:
        sev: Severity = "high"
    elif score >= 2.1:
        sev = "medium"
    elif score >= 1.45:
        sev = "low"
    else:
        return None

    return _sig(
        rid="burnout_load_v1",
        severity=sev,
        category="focus",
        message="Burnout risk increasing.",
        explanation=(
            "Seven-day task volume and shallow focus time crossed burnout heuristics (many completions "
            "with relatively low focus minutes, few Pomodoros, or a sharp drop in completions vs earlier this week)."
        ),
        detected_at=detected_at,
    )


def detect_environment_decline_risk(
    *,
    overdue_zone_count: int,
    detected_at: str,
) -> dict[str, Any] | None:
    if overdue_zone_count >= 4:
        sev: Severity = "high"
    elif overdue_zone_count >= 2:
        sev = "medium"
    else:
        return None

    return _sig(
        rid="environment_decline_v1",
        severity=sev,
        category="environment",
        message="Your environment state is declining.",
        explanation=(
            f"{overdue_zone_count} cleaning zones are overdue — several missed cadences suggest home upkeep is slipping."
        ),
        detected_at=detected_at,
    )


def detect_productivity_focus_drop_risk(
    *,
    focus_minutes_series: list[int],
    detected_at: str,
) -> dict[str, Any] | None:
    """
    `focus_minutes_series` = focus minutes per day, oldest → newest (from snapshots or event rollups).
    """
    if len(focus_minutes_series) < 5:
        return None

    vals = focus_minutes_series[-7:]
    if len(vals) >= 4 and vals[-1] < vals[-2] < vals[-3] <= vals[-4]:
        peak = max(vals[-4], 1)
        if vals[-1] <= peak * 0.45 and vals[-1] < 35:
            return _sig(
                rid="focus_consistency_drop_v1",
                severity="high",
                category="focus",
                message="Focus consistency is decreasing.",
                explanation=(
                    "Focus minutes fell on four consecutive days versus earlier highs — streak dropped sharply vs recent peak."
                ),
                detected_at=detected_at,
            )

    if len(vals) >= 6:
        last3 = sum(vals[-3:]) / 3.0
        prev3 = sum(vals[-6:-3]) / 3.0
        if prev3 >= 22 and last3 < prev3 * 0.58:
            return _sig(
                rid="focus_consistency_drop_v1",
                severity="medium",
                category="focus",
                message="Focus consistency is decreasing.",
                explanation=(
                    "Recent daily focus averages are much lower than the prior three-day average while baseline focus was healthy."
                ),
                detected_at=detected_at,
            )

    return None


def detect_financial_drift_risk(
    *,
    expense_last7: float,
    expense_prev7: float,
    detected_at: str,
) -> dict[str, Any] | None:
    if expense_last7 < 35:
        return None
    if expense_prev7 <= 0:
        if expense_last7 >= 120:
            return _sig(
                rid="spending_trend_up_v1",
                severity="medium",
                category="finance",
                message="Spending trend increasing this week.",
                explanation=(
                    f"No expenses were recorded in the prior comparable window, but this week totals ~€{expense_last7:.0f} "
                    "— absolute spend is high enough to flag drift."
                ),
                detected_at=detected_at,
            )
        return None

    ratio = expense_last7 / expense_prev7
    if ratio < 1.38:
        return None

    if ratio >= 1.85 and expense_last7 >= 80:
        sev: Severity = "high"
    elif ratio >= 1.5:
        sev = "medium"
    else:
        sev = "low"

    return _sig(
        rid="spending_trend_up_v1",
        severity=sev,
        category="finance",
        message="Spending trend increasing this week.",
        explanation=(
            f"This week’s expenses (~€{expense_last7:.0f}) are substantially higher than the prior week (~€{expense_prev7:.0f}), "
            "crossing the configured ratio threshold."
        ),
        detected_at=detected_at,
    )
