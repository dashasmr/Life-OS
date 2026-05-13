"""Enriched habits include suggested actions."""

from app.services.habits.support_actions import enrich_detected_habit


def test_enrich_morning_focus_actions():
    row = enrich_detected_habit(
        {
            "id": "habit-morning-focus",
            "category": "focus",
            "confidence": 0.8,
            "frequency": "x",
            "message": "y",
        }
    )
    assert len(row["suggestedActions"]) == 1
    a = row["suggestedActions"][0]
    assert a["type"] == "mutation"
    assert a["target"] == "focus_session_start"


def test_enrich_spending_navigate():
    row = enrich_detected_habit(
        {
            "id": "habit-spend-groceries",
            "category": "finance",
            "confidence": 0.7,
            "frequency": "x",
            "message": "m",
            "supportMeta": {"topExpenseCategory": "Groceries"},
        }
    )
    assert row["suggestedActions"][0]["type"] == "navigate"
    assert "/finance" in row["suggestedActions"][0]["target"]
