"""Suggested actions for auto-detected habits (drive navigation, API mutations, daily plan)."""

from __future__ import annotations

from typing import Any


def enrich_detected_habit(row: dict[str, Any]) -> dict[str, Any]:
    """
    Adds `suggestedActions` and strips detector-only `supportMeta`.
    Each habit maps to one primary support action (navigate | mutation | plan_item).
    """
    meta = dict(row.pop("supportMeta", {}) or {})
    hid = str(row.get("id") or "")
    actions: list[dict[str, Any]] = []

    if hid == "habit-morning-focus":
        actions.append(
            {
                "id": f"{hid}-start-focus-25",
                "habitId": hid,
                "label": "Start 25-min morning focus",
                "type": "mutation",
                "target": "focus_session_start",
                "payload": {"label": "Morning focus (25m)"},
            }
        )

    elif hid == "habit-cleaning-consistency":
        gap = float(meta.get("medianGapDays") or 4.0)
        actions.append(
            {
                "id": f"{hid}-daily-plan-clean",
                "habitId": hid,
                "label": "Add cleaning round to today’s plan",
                "type": "plan_item",
                "target": "daily_plan",
                "payload": {
                    "planItemId": "habit-support-cleaning-rhythm",
                    "title": f"Quick cleaning pass (~every {gap:.0f} days)",
                    "category": "cleaning",
                    "priority": "medium",
                },
            }
        )

    elif hid.startswith("habit-spend-"):
        cat = str(meta.get("topExpenseCategory") or "spending").strip() or "spending"
        actions.append(
            {
                "id": f"{hid}-review-expenses",
                "habitId": hid,
                "label": f"Review “{cat}” expenses",
                "type": "navigate",
                "target": "/finance/dashboard",
                "payload": {"category": cat},
            }
        )

    elif hid.startswith("habit-task-hour-"):
        peak = int(meta.get("peakHourUtc") or 14)
        actions.append(
            {
                "id": f"{hid}-plan-before-window",
                "habitId": hid,
                "label": "Schedule important task before your usual completion window",
                "type": "plan_item",
                "target": "daily_plan",
                "payload": {
                    "planItemId": "habit-support-task-rhythm",
                    "title": f"Priority task before ~{peak}:00 (your completion rhythm)",
                    "category": "task",
                    "priority": "high",
                },
            }
        )

    row["suggestedActions"] = actions
    return row
