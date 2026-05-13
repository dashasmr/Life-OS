"""LLM-backed monthly review with deterministic fallback (same provider flags as daily review)."""
from __future__ import annotations

import json
from typing import Any
from urllib import error, request

from app.database import settings


def _normalize_monthly_payload(raw: dict[str, Any], month_label: str) -> dict[str, Any]:
    title = str(raw.get("title") or f"Monthly review — {month_label}").strip() or f"Monthly review — {month_label}"
    summary = str(raw.get("summary") or "").strip() or "No summary available."
    wins = raw.get("wins") or []
    risks = raw.get("risks") or []
    patterns = raw.get("patterns") or []
    nmf = raw.get("nextMonthFocus") or raw.get("next_month_focus") or []
    if not isinstance(wins, list):
        wins = []
    if not isinstance(risks, list):
        risks = []
    if not isinstance(patterns, list):
        patterns = []
    if not isinstance(nmf, list):
        nmf = []
    return {
        "monthLabel": month_label,
        "title": title,
        "summary": summary,
        "wins": [str(x).strip() for x in wins if str(x).strip()],
        "risks": [str(x).strip() for x in risks if str(x).strip()],
        "patterns": [str(x).strip() for x in patterns if str(x).strip()],
        "nextMonthFocus": [str(x).strip() for x in nmf if str(x).strip()],
    }


def build_rule_based_monthly_review(context: dict[str, Any]) -> dict[str, Any]:
    month_label = context["monthLabel"]
    stats = context["monthStats"]
    fin = context["financeMonth"]
    top_cat = context.get("topExpenseCategory")
    top_amt = float(context.get("topExpenseAmount") or 0.0)
    overdue_n = int(context.get("cleaningZonesOverdueCount") or 0)
    mpd = context.get("mostProductiveDayLabel")

    title = f"Monthly review — {month_label}"
    summary = (
        f"Month snapshot: {stats['tasksCompleted']} tasks completed, {stats['focusMinutes']} focus minutes, "
        f"{stats['cleaningActions']} cleaning actions logged. "
        f"Finance in range: income €{fin['income_total']:.2f}, expenses €{fin['expense_total']:.2f}, "
        f"net €{fin['balance_delta']:.2f}."
    )

    wins: list[str] = []
    if stats["tasksCompleted"] >= 10:
        wins.append("You sustained execution across the month with a solid task count.")
    if stats["focusMinutes"] >= 300:
        wins.append("Focus time stacked up — deep work showed up repeatedly.")
    if stats["cleaningActions"] > 0:
        wins.append("Home maintenance stayed visible with cleaning events logged.")
    if fin["balance_delta"] > 0:
        wins.append("The month closed with a positive balance delta in logged transactions.")
    if mpd:
        wins.append(f"Strongest productivity cluster around {mpd}.")
    if not wins:
        wins.append("You kept logging in Life OS — that history is the base for next month's lift.")

    risks: list[str] = []
    rs = context.get("riskSignals") or []
    if isinstance(rs, list):
        for item in rs:
            if not isinstance(item, dict):
                continue
            if str(item.get("severity") or "") in ("medium", "high"):
                msg = str(item.get("message") or "").strip()
                if msg and msg not in risks:
                    risks.append(msg)

    if overdue_n > 0:
        risks.append(f"{overdue_n} cleaning zone(s) are currently overdue — home load may compound.")
    if fin["balance_delta"] < 0:
        risks.append("Spending exceeded income in this window — worth a deliberate budget pass.")
    if stats["focusMinutes"] < 120 and stats["tasksCompleted"] < 5:
        risks.append("Light focus and task signals this month — capacity or logging may be thin.")
    if not risks:
        risks.append("No sharp risk flags in the rolled-up metrics — still revisit assumptions monthly.")

    patterns: list[str] = []
    bps = context.get("behaviorPatterns") or []
    if isinstance(bps, list):
        for p in sorted(bps, key=lambda x: -float(x.get("confidence") or 0)):
            if float(p.get("confidence") or 0) >= 0.48:
                msg = str(p.get("message") or "").strip()
                if msg and msg not in patterns:
                    patterns.append(msg)
    habits_ctx = context.get("detectedHabits") or []
    if isinstance(habits_ctx, list):
        for h in sorted(habits_ctx, key=lambda x: -float(x.get("confidence") or 0))[:5]:
            if not isinstance(h, dict):
                continue
            if float(h.get("confidence") or 0) < 0.5:
                continue
            msg = str(h.get("message") or "").strip()
            if msg and msg not in patterns:
                patterns.append(msg)
    if top_cat and top_amt > 0:
        line = f"{top_cat} led spending at about €{top_amt:.2f} in expenses."
        if line not in patterns:
            patterns.append(line)
    if stats["tasksCompleted"] > 0 and stats["focusMinutes"] > 0:
        patterns.append("Both tasks and focus minutes appear — mixed execution style this month.")
    if not patterns:
        patterns.append("Patterns will sharpen as categories and focus blocks stay consistent.")

    next_month_focus = [
        "Pick one theme for the month (health, money, or deep work) and protect it weekly.",
        "Keep expenses categorized so top buckets stay honest.",
        "Clear one overdue cleaning zone early in the month to reset home signal.",
    ]

    return _normalize_monthly_payload(
        {
            "title": title,
            "summary": summary,
            "wins": wins,
            "risks": risks,
            "patterns": patterns,
            "nextMonthFocus": next_month_focus,
        },
        month_label,
    )


def build_openai_monthly_review(context: dict[str, Any], api_key: str, model: str) -> dict[str, Any]:
    system = (
        "You are a calm personal Life OS coach. You receive one JSON object describing a calendar month "
        "(productivity aggregates, finance totals, cleaning/home signals, optional top spending category). "
        "The object may include behaviorPatterns: rule-based analytics (id, category, confidence, message). "
        "The object may include detectedHabits: automatically inferred routines from multi-week events "
        "(id, category, confidence, frequency, message) — you may echo up to two items with confidence >= 0.5 in patterns. "
        "The object may include riskSignals (severity, category, message) — fold medium/high items into risks when relevant. "
        "Answer from that data only — do not invent transactions or tasks. "
        "Respond with strict JSON only (no markdown) and exactly these keys: "
        "title (short string), summary (3-5 sentences), wins (array of 2-5 short strings), "
        "risks (array of 1-4 short strings), patterns (array of 2-4 short strings), "
        "nextMonthFocus (array of 3-5 actionable bullets for next month). "
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
    with request.urlopen(req, timeout=60) as response:
        body = json.loads(response.read().decode("utf-8"))
    content = body["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    return _normalize_monthly_payload(parsed, context["monthLabel"])


def build_monthly_review(context: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Returns (response_dict, fallback_used)."""
    if settings.ai_provider == "openai" and settings.openai_api_key:
        try:
            out = build_openai_monthly_review(
                context=context,
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )
            out["fallback"] = False
            return out, False
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, KeyError, TypeError, ValueError):
            pass
    out = build_rule_based_monthly_review(context)
    out["fallback"] = True
    return out, True
