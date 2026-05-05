import json
from collections.abc import Mapping
from urllib import error, request


def build_rule_based_daily_insight(summary: Mapping[str, int | float | str], focus_minutes: int) -> dict:
    tasks_completed = int(summary["tasks_completed"])
    balance_delta = float(summary["balance_delta"])
    cleanings_done = int(summary["cleanings_done"])

    if tasks_completed >= 3 and focus_minutes >= 90:
        headline = "Strong productive day"
    elif tasks_completed == 0 and focus_minutes < 30:
        headline = "Light execution day"
    else:
        headline = "Steady progress day"

    summary_text = (
        f"You completed {tasks_completed} tasks, logged {focus_minutes} minutes of focus time, "
        f"and finished {cleanings_done} cleaning actions. "
        f"Your financial balance changed by {balance_delta:.2f} today."
    )

    recommendations: list[str] = []
    if focus_minutes < 60:
        recommendations.append("Schedule one 25-minute focus block for your top task tomorrow.")
    if tasks_completed == 0:
        recommendations.append("Start the day by finishing one small task to build momentum.")
    if cleanings_done == 0:
        recommendations.append("Mark one cleaning zone as done to keep home maintenance consistent.")
    if balance_delta < 0:
        recommendations.append("Review expenses and set a spending limit for one category tomorrow.")
    if not recommendations:
        recommendations.append("Keep the same routine and repeat your current workflow tomorrow.")

    return {
        "date": str(summary["date"]),
        "headline": headline,
        "summary": summary_text,
        "recommendations": recommendations,
    }


def build_openai_daily_insight(
    summary: Mapping[str, int | float | str], focus_minutes: int, api_key: str, model: str
) -> dict:
    prompt = {
        "date": str(summary["date"]),
        "tasks_completed": int(summary["tasks_completed"]),
        "focus_minutes": focus_minutes,
        "cleanings_done": int(summary["cleanings_done"]),
        "income_total": float(summary["income_total"]),
        "expense_total": float(summary["expense_total"]),
        "balance_delta": float(summary["balance_delta"]),
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a concise personal productivity assistant. "
                    "Return strict JSON with keys: headline (string), summary (string), recommendations (array of 1-4 strings)."
                ),
            },
            {
                "role": "user",
                "content": f"Create a daily insight from this data: {json.dumps(prompt)}",
            },
        ],
        "temperature": 0.3,
    }
    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=20) as response:
        body = json.loads(response.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return {
        "date": str(summary["date"]),
        "headline": parsed.get("headline", "Daily insight"),
        "summary": parsed.get("summary", "No summary generated."),
        "recommendations": parsed.get("recommendations", []),
    }


def build_daily_insight(
    summary: Mapping[str, int | float | str],
    focus_minutes: int,
    provider: str = "rule_based",
    openai_api_key: str | None = None,
    openai_model: str = "gpt-4o-mini",
) -> dict:
    if provider == "openai" and openai_api_key:
        try:
            return build_openai_daily_insight(
                summary=summary,
                focus_minutes=focus_minutes,
                api_key=openai_api_key,
                model=openai_model,
            )
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError):
            # Fallback keeps the app stable when external AI API fails.
            return build_rule_based_daily_insight(summary=summary, focus_minutes=focus_minutes)
    return build_rule_based_daily_insight(summary=summary, focus_minutes=focus_minutes)
