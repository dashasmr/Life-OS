"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, CleaningZone, EventItem, FinanceRangeSummary, FinanceTransaction } from "@/lib/api";
import { computeHomeHealthScore } from "@/lib/cleaningHealth";
import { getLocalWeekRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import {
  countEventsByType,
  generateWeeklyInsights,
  sumFocusMinutesInWeek,
  topExpenseCategoryInWeek
} from "@/lib/weeklyReviewInsights";

function formatEur(value: number): string {
  return `€${value.toFixed(2)}`;
}

function weekLabel(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  to.setDate(to.getDate() - 1);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "This week";
  const a = from.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const b = to.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${a} – ${b}`;
}

export default function WeeklyReviewPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceRangeSummary | null>(null);
  const [expenseRows, setExpenseRows] = useState<FinanceTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { from, to, weekFromMs, weekToMs } = useMemo(() => {
    const range = getLocalWeekRangeIso(new Date());
    const a = new Date(range.from).getTime();
    const b = new Date(range.to).getTime();
    return { from: range.from, to: range.to, weekFromMs: a, weekToMs: b };
  }, []);

  useEffect(() => {
    const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_URL}/events?limit=500`, { cache: "no-store" }),
      fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/summary/range?${qs}`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/transactions?kind=expense&limit=500`, { cache: "no-store" })
    ])
      .then(async ([evRes, zRes, finRes, txRes]) => {
        if (!evRes.ok) throw new Error("Failed to load events");
        if (!zRes.ok) throw new Error("Failed to load cleaning zones");
        if (!finRes.ok) throw new Error("Failed to load finance summary");
        if (!txRes.ok) throw new Error("Failed to load transactions");

        const rawEv = (await evRes.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
        setEvents(rawEv.filter((e) => e.type !== "task_in_progress") as EventItem[]);
        setZones(await zRes.json());
        setFinanceSummary(await finRes.json());
        setExpenseRows(await txRes.json());
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  const productivity = useMemo(() => {
    const tasksDone = countEventsByType(events, ["task_completed"], weekFromMs, weekToMs);
    const focusMin = sumFocusMinutesInWeek(events, weekFromMs, weekToMs);
    const pomos = countEventsByType(events, ["pomodoro_completed"], weekFromMs, weekToMs);
    return { tasksDone, focusMin, pomos };
  }, [events, weekFromMs, weekToMs]);

  const cleaning = useMemo(() => {
    const cleaned = countEventsByType(events, ["cleaning_done"], weekFromMs, weekToMs);
    const overdue = zones.filter((z) => z.status === "overdue");
    const health = computeHomeHealthScore(zones);
    return { cleaned, overdueCount: overdue.length, overdueNames: overdue.map((z) => z.name), health };
  }, [events, zones, weekFromMs, weekToMs]);

  const financeBlock = useMemo(() => {
    const top = topExpenseCategoryInWeek(expenseRows, weekFromMs, weekToMs);
    return {
      income: financeSummary?.income_total ?? 0,
      expense: financeSummary?.expense_total ?? 0,
      balance: financeSummary?.balance_delta ?? 0,
      topCategory: top?.category ?? null,
      topAmount: top?.total ?? 0
    };
  }, [expenseRows, financeSummary, weekFromMs, weekToMs]);

  const insights = useMemo(
    () =>
      generateWeeklyInsights({
        events,
        weekFromMs,
        weekToMs,
        zones,
        topExpenseCategory: financeBlock.topCategory,
        topExpenseAmount: financeBlock.topAmount
      }),
    [events, weekFromMs, weekToMs, zones, financeBlock.topCategory, financeBlock.topAmount]
  );

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-white">Weekly review</h1>
        <p className={ui.pageHint}>How did this week go? Numbers use your local week (Mon–Sun).</p>
        <p className={`mt-1 text-sm ${ui.mutedText}`}>{weekLabel(from, to)}</p>

        {loading && <p className={`mt-6 text-sm ${ui.mutedText}`}>Loading your week…</p>}
        {error && <p className="mt-6 text-[#f7b0a2]">{error}</p>}

        {!loading && !error && (
          <div className="mt-8 space-y-8">
            <section className="rounded-2xl border border-[#2A2F36] bg-[#0F1318] p-6">
              <h2 className="text-lg font-semibold text-white">Productivity summary</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Tasks completed this week</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{productivity.tasksDone}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Focus minutes this week</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{productivity.focusMin}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Pomodoros completed</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{productivity.pomos}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[#2A2F36] bg-[#0F1318] p-6">
              <h2 className="text-lg font-semibold text-white">Cleaning summary</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Zones cleaned this week</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{cleaning.cleaned}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Current overdue zones</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{cleaning.overdueCount}</dd>
                  {cleaning.overdueNames.length > 0 && (
                    <p className={`mt-2 text-sm ${ui.mutedText}`}>{cleaning.overdueNames.join(", ")}</p>
                  )}
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Home health score</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">
                    {cleaning.health ? `${cleaning.health.scorePercent}%` : "—"}
                  </dd>
                  {cleaning.health && (
                    <p className={`mt-2 text-sm ${ui.mutedText}`}>Status: {cleaning.health.statusLabel}</p>
                  )}
                  {!cleaning.health && zones.length === 0 && (
                    <p className={`mt-2 text-sm ${ui.mutedText}`}>Add zones on the Cleaning page to see a score.</p>
                  )}
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[#2A2F36] bg-[#0F1318] p-6">
              <h2 className="text-lg font-semibold text-white">Finance summary</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Income this week</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{formatEur(financeBlock.income)}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Expenses this week</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{formatEur(financeBlock.expense)}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Balance this week</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-white">{formatEur(financeBlock.balance)}</dd>
                </div>
                <div>
                  <dt className={`text-sm ${ui.mutedText}`}>Top spending category</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">
                    {financeBlock.topCategory ?? "—"}
                  </dd>
                  {financeBlock.topCategory && (
                    <p className={`mt-1 text-sm tabular-nums ${ui.mutedText}`}>{formatEur(financeBlock.topAmount)}</p>
                  )}
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[#2A2F36] bg-[#0F1318] p-6">
              <h2 className="text-lg font-semibold text-white">Weekly insights</h2>
              <p className={`mt-1 text-sm ${ui.mutedText}`}>Rule-based signals from this week&apos;s data.</p>
              <ul className="mt-4 space-y-3">
                {insights.map((line) => (
                  <li
                    key={line}
                    className="rounded-xl border border-l-4 border-[#2A2F36] border-l-[#C6A36B] bg-[#141A22] px-4 py-3 text-sm leading-relaxed text-[#E5E5E5]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
