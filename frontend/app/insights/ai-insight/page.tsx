"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, CleaningZone, DailyInsight, DailySummary, FinanceRangeSummary, FocusSession, TaskItem } from "@/lib/api";
import { formatDateFiNumeric, getLocalDayRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { Badge } from "@/components/ui/badge";
import { generateRuleInsights, type RuleInsight } from "@/services/insights";

function insightCategoryLabel(category: RuleInsight["category"]): string {
  if (category === "productivity") return "Productivity";
  if (category === "cleaning") return "Cleaning";
  if (category === "finance") return "Finance";
  return "Tasks";
}

export default function AiDailyInsightPage() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [financeToday, setFinanceToday] = useState<FinanceRangeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const day = getLocalDayRangeIso(now);
    const qs = `from=${encodeURIComponent(day.from)}&to=${encodeURIComponent(day.to)}`;

    Promise.all([
      fetch(`${API_URL}/analytics/daily-summary`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("summary");
        return r.json() as Promise<DailySummary>;
      }),
      fetch(`${API_URL}/analytics/daily-insight`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("insight");
        return r.json() as Promise<DailyInsight>;
      }),
      fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("tasks");
        return r.json() as Promise<TaskItem[]>;
      }),
      fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("zones");
        return r.json() as Promise<CleaningZone[]>;
      }),
      fetch(`${API_URL}/focus/sessions?limit=50`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("focus");
        return r.json() as Promise<FocusSession[]>;
      }),
      fetch(`${API_URL}/finance/summary/range?${qs}`, { cache: "no-store" }).then((r) => {
        if (!r.ok) throw new Error("finance");
        return r.json() as Promise<FinanceRangeSummary>;
      })
    ])
      .then(([s, i, t, z, f, fin]) => {
        setSummary(s);
        setInsight(i);
        setTasks(t);
        setZones(z);
        setFocusSessions(f);
        setFinanceToday(fin);
      })
      .catch(() => setError("Could not load AI insight data."));
  }, []);

  const ruleInsights = useMemo(
    () =>
      generateRuleInsights({
        focusSessions,
        cleaningZones: zones,
        expensesTodayTotal: financeToday?.expense_total ?? 0,
        tasks
      }),
    [focusSessions, zones, financeToday, tasks]
  );

  return (
    <div className={ui.contentClass}>
      {error && <p className="mb-4 text-[#f7b0a2]">{error}</p>}

      <section className="rounded-2xl border border-[#2A2F36] bg-gradient-to-br from-[#11151A] to-[#0B0D10] p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            variant="outline"
            className="inline-flex h-9 items-center rounded-xl border-[#C6A36B] px-4 text-sm font-medium text-[#C6A36B]"
          >
            AI Daily Insight
          </Badge>
          <span className={`text-sm ${ui.mutedText}`}>
            {summary?.date ? formatDateFiNumeric(summary.date) : "Today"}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white md:text-3xl">{insight?.headline ?? "Light execution day"}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#8A8F98] md:text-base">
          {insight?.summary ?? "Loading insight..."}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Rule-based signals</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>Deeper nudges from your live data — same engine as before.</p>
          </div>
        </div>

        {ruleInsights.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {ruleInsights.map((item) => (
              <li key={item.id}>
                <article className="rounded-xl border border-[#2A2F36] border-l-4 border-l-[#C6A36B] bg-[#0F1318] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#C6A36B]">
                    {insightCategoryLabel(item.category)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#E5E5E5]">{item.message}</p>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-[#2A2F36] bg-[#141A22]/60 px-3 py-2.5">
            <p className={`text-sm ${ui.mutedText}`}>
              <span className="font-medium text-[#c9d0d8]">All clear.</span> No rule-based alerts for current data.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
