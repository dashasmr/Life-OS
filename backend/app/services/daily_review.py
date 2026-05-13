"""LLM-backed daily review with deterministic fallback (same provider flags as `build_daily_insight`)."""
from __future__ import annotations

import json
from typing import Any
from urllib import error, request

from app.database import settings


def _normalize_review_payload(raw: dict[str, Any], date_str: str) -> dict[str, Any]:
    title = str(raw.get("title") or "Daily review").strip() or "Daily review"
    summary = str(raw.get("summary") or "").strip() or "No summary available."
    wins = raw.get("wins") or []
    concerns = raw.get("concerns") or []
    tomorrow = raw.get("tomorrowPlan") or raw.get("tomorrow_plan") or []
    if not isinstance(wins, list):
        wins = []
    if not isinstance(concerns, list):
        concerns = []
    if not isinstance(tomorrow, list):
        tomorrow = []
    return {
        "date": date_str,
        "title": title,
        "summary": summary,
        "wins": [str(x).strip() for x in wins if str(x).strip()],
        "concerns": [str(x).strip() for x in concerns if str(x).strip()],
        "tomorrowPlan": [str(x).strip() for x in tomorrow if str(x).strip()],
    }


def build_rule_based_daily_review(context: dict[str, Any]) -> dict[str, Any]:
    ds = context["dailyStats"]
    date_str = context["date"]
    title = f"Daily review — {date_str}"
    summary = (
        f"Logged activity for {date_str}: {ds['tasksCompleted']} tasks completed, "
        f"{ds['focusMinutes']} minutes of focus-related events, {ds['cleaningActions']} cleaning actions, "
        f"€{ds['expensesTotal']:.2f} in expense events. "
        f"Month-to-date balance delta from transactions: €{context['financeMonth']['balance_delta']:.2f}."
    )
    wins: list[str] = []
    if ds["tasksCompleted"] >= 3:
        wins.append("You closed several tasks — momentum on execution.")
    if ds["focusMinutes"] >= 45:
        wins.append("Focus time shows dedicated deep-work blocks.")
    if ds["cleaningActions"] > 0:
        wins.append("Home maintenance stayed on the radar with cleaning logged.")
    if not wins:
        wins.append("You kept recording signals in Life OS — the log is there to build on.")

    bps = context.get("behaviorPatterns") or []
    if isinstance(bps, list) and bps:
        best = max(bps, key=lambda x: float(x.get("confidence") or 0))
        if float(best.get("confidence") or 0) >= 0.52:
            msg = str(best.get("message") or "").strip()
            if msg and all(msg != str(w).strip() for w in wins):
                wins.append(msg)

    habits_ctx = context.get("detectedHabits") or []
    if isinstance(habits_ctx, list):
        for h in sorted(habits_ctx, key=lambda x: -float(x.get("confidence") or 0))[:4]:
            if not isinstance(h, dict):
                continue
            if float(h.get("confidence") or 0) < 0.54:
                continue
            msg = str(h.get("message") or "").strip()
            if msg and all(msg != str(w).strip() for w in wins):
                wins.append(msg)

    concerns: list[str] = []
    rs = context.get("riskSignals") or []
    if isinstance(rs, list):
        for item in rs:
            if not isinstance(item, dict):
                continue
            if str(item.get("severity") or "") in ("medium", "high"):
                msg = str(item.get("message") or "").strip()
                if msg:
                    concerns.append(msg)

    overdue = context.get("overdueCleaningZones") or []
    if overdue:
        names = ", ".join(z.get("name", "Zone") for z in overdue[:5])
        concerns.append(f"Cleaning overdue for: {names}.")
    if ds["expensesTotal"] > 100:
        concerns.append("Expenses from events today are above €100 — worth a quick budget check.")
    mind = next((p for p in context["systemStatus"] if p["key"] == "mind"), None)
    if mind and mind.get("tone") == "caution":
        concerns.append("Mind pillar reads as distracted — protect time for one priority tomorrow.")

    tomorrow_plan = [
        "Choose one must-do task and block 25 minutes for it first thing.",
        "If any cleaning zone is overdue, do the smallest tidy that clears one zone.",
        "Skim today's expenses and set one spending intention for tomorrow.",
    ]

    if not concerns:
        concerns.append("No major red flags in the metrics snapshot.")

    return _normalize_review_payload(
        {"title": title, "summary": summary, "wins": wins, "concerns": concerns, "tomorrowPlan": tomorrow_plan},
        date_str,
    )


def build_openai_daily_review(context: dict[str, Any], api_key: str, model: str) -> dict[str, Any]:
    """Ask the model for structured JSON; caller handles exceptions."""
    system = (
        "You are a calm personal Life OS coach. You receive a single JSON object describing one calendar day "
        "(productivity, home cleaning zones, finance aggregates, timeline highlights). "
        "The object may include behaviorPatterns: each item has id, category (focus|cleaning|finance), "
        "confidence (0-1), and message — these are rule-based behavioral analytics, not user prose. "
        "The object may include detectedHabits: automatically inferred routines from historical events "
        "(id, category focus|cleaning|finance|productivity, confidence 0-1, frequency, message) — "
        "when confidence is at least 0.55 you may reflect up to one habit line in wins if it matches the day. "
        "The object may include riskSignals: severity low|medium|high, category focus|finance|environment, message — "
        "treat medium/high as worth a concise concern when they fit the day's story; do not invent new risks. "
        "Answer from that data only — do not invent events. "
        "Respond with strict JSON only (no markdown) and exactly these keys: "
        'title (short string), summary (2-4 sentences), wins (array of 2-5 short strings), '
        "concerns (array of 1-4 short strings), tomorrowPlan (array of 3-5 actionable bullets for tomorrow). "
        "Tone: supportive, specific, no clichés."
    )
    user = json.dumps(context, default=str)
    payload: dict[str, Any] = {
        "model": model,
        "temperature": 0.35,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
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
    with request.urlopen(req, timeout=45) as response:
        body = json.loads(response.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return _normalize_review_payload(parsed, context["date"])


def build_daily_review(context: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """
    Returns (response_dict, fallback_used).
    `response_dict` matches frontend contract including `tomorrowPlan` and `fallback` flag.
    """
    date_str = context["date"]
    if settings.ai_provider == "openai" and settings.openai_api_key:
        try:
            out = build_openai_daily_review(
                context=context,
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )
            out["fallback"] = False
            return out, False
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass
    out = build_rule_based_daily_review(context)
    out["fallback"] = True
    return out, True
