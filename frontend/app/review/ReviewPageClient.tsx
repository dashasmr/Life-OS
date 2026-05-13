"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, CleaningZone, EventItem, FinanceRangeSummary, FinanceTransaction } from "@/lib/api";
import { computeEventCountsByType, computeProductivityScore, computeWeeklyStats } from "@/lib/analytics/fromEvents";
import { normalizeAnalyticsEvents } from "@/lib/analytics/normalize";
import { computeHomeHealthScore } from "@/lib/cleaningHealth";
import { getLocalWeekRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { PageSectionSkeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/ui/typography";
import { generateWeeklyInsights, topExpenseCategoryInWeek } from "@/lib/weeklyReviewInsights";

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
        setEvents(normalizeAnalyticsEvents(rawEv));
        setZones(await zRes.json());
        setFinanceSummary(await finRes.json());
        setExpenseRows(await txRes.json());
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [from, to]);

  // All productivity numbers below flow through `lib/analytics/fromEvents` so they stay consistent with the dashboard.
  const weeklyStats = useMemo(
    () => computeWeeklyStats(events, weekFromMs, weekToMs),
    [events, weekFromMs, weekToMs]
  );

  const weekEventCounts = useMemo(
    () => computeEventCountsByType(events, weekFromMs, weekToMs),
    [events, weekFromMs, weekToMs]
  );

  const productivityScore = useMemo(
    () => computeProductivityScore(events, zones, weekFromMs, weekToMs),
    [events, zones, weekFromMs, weekToMs]
  );

  const productivity = useMemo(
    () => ({
      tasksDone: weeklyStats.tasksCompleted,
      focusMin: weeklyStats.focusMinutes,
      pomos: weekEventCounts.pomodoro_completed ?? 0
    }),
    [weeklyStats, weekEventCounts]
  );

  const cleaning = useMemo(() => {
    const cleaned = weekEventCounts.cleaning_done ?? 0;
    const overdue = zones.filter((z) => z.status === "overdue");
    const health = computeHomeHealthScore(zones);
    return { cleaned, overdueCount: overdue.length, overdueNames: overdue.map((z) => z.name), health };
  }, [weekEventCounts, zones]);

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
      <section className={cn(ui.panelClass, "space-y-ds-4")}>
        <div>
          <PageTitle className="text-lifeos-section md:text-lifeos-card-title">Weekly review</PageTitle>
          <p className={cn(ui.pageHint, "mt-ds-2")}>How did this week go? Numbers use your local week (Mon–Sun).</p>
          <p className={`mt-ds-1 text-sm ${ui.mutedText}`}>{weekLabel(from, to)}</p>
        </div>

        {loading && (
          <div className="mt-ds-2">
            <PageSectionSkeleton />
          </div>
        )}
        {error && <p className="text-sm text-lifeos-danger">{error}</p>}

        {!loading && !error && (
          <div className="space-y-ds-5">
            <section className={cn(ds.surfaces.contentPanelCompact, "space-y-ds-5")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-ds-4 gap-y-ds-2 border-b border-lifeos-border-subtle/[0.08] pb-ds-4">
                <h2 className="text-base font-semibold text-lifeos-fg">Week at a glance</h2>
                <p className={`max-w-prose text-sm ${ui.mutedText}`}>
                  Score{" "}
                  <span className="font-semibold tabular-nums text-lifeos-accent">{productivityScore.score}</span>
                  <span className={ui.mutedText}>
                    {" "}
                    — tasks + focus min − overdue: {productivityScore.completedTasks} + {productivityScore.focusMinutes} −{" "}
                    {productivityScore.overdueCleaningZones}
                  </span>
                </p>
              </div>

              <div className="grid gap-ds-5 lg:grid-cols-3">
                <div className="min-w-0 space-y-ds-3">
                  <h3 className={ds.typography.sectionEyebrow}>Productivity</h3>
                  <dl className="grid grid-cols-3 gap-ds-3 sm:gap-ds-4">
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Tasks</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">{productivity.tasksDone}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Focus min</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">{productivity.focusMin}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Pomos</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">{productivity.pomos}</dd>
                    </div>
                  </dl>
                </div>

                <div className="min-w-0 space-y-ds-3 lg:border-l lg:border-lifeos-border-subtle/[0.08] lg:pl-ds-5">
                  <h3 className={ds.typography.sectionEyebrow}>Cleaning</h3>
                  <dl className="grid gap-ds-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <dt className={`text-xs ${ui.mutedText}`}>Zones cleaned</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">{cleaning.cleaned}</dd>
                      </div>
                      <div className="text-right">
                        <dt className={`text-xs ${ui.mutedText}`}>Overdue</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">{cleaning.overdueCount}</dd>
                      </div>
                    </div>
                    {cleaning.overdueNames.length > 0 && (
                      <p className={`text-xs leading-snug ${ui.mutedText}`}>{cleaning.overdueNames.join(", ")}</p>
                    )}
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Home health</dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-lifeos-fg md:text-xl">
                        {cleaning.health ? `${cleaning.health.scorePercent}%` : "—"}
                      </dd>
                      {cleaning.health && <p className={`mt-0.5 text-xs ${ui.mutedText}`}>{cleaning.health.statusLabel}</p>}
                      {!cleaning.health && zones.length === 0 && (
                        <p className={`mt-0.5 text-xs ${ui.mutedText}`}>Add zones on Cleaning to see a score.</p>
                      )}
                    </div>
                  </dl>
                </div>

                <div className="min-w-0 space-y-ds-3 lg:border-l lg:border-lifeos-border-subtle/[0.08] lg:pl-ds-5">
                  <h3 className={ds.typography.sectionEyebrow}>Finance</h3>
                  <dl className="grid grid-cols-2 gap-x-ds-3 gap-y-ds-2">
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Income</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums text-lifeos-fg">{formatEur(financeBlock.income)}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Expense</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums text-lifeos-fg">{formatEur(financeBlock.expense)}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${ui.mutedText}`}>Balance</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums text-lifeos-fg">{formatEur(financeBlock.balance)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className={`text-xs ${ui.mutedText}`}>Top category</dt>
                      <dd className="mt-0.5 truncate text-base font-semibold text-lifeos-fg">{financeBlock.topCategory ?? "—"}</dd>
                      {financeBlock.topCategory && (
                        <p className={`text-xs tabular-nums ${ui.mutedText}`}>{formatEur(financeBlock.topAmount)}</p>
                      )}
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <section className={ds.surfaces.contentPanelCompact}>
              <h2 className="text-base font-semibold text-lifeos-fg">Weekly insights</h2>
              <p className={`mt-ds-1 text-sm ${ui.mutedText}`}>From what you logged this week.</p>
              <ul className="mt-ds-3 space-y-ds-2">
                {insights.map((line) => (
                  <li
                    key={line}
                    className="rounded-ds-input bg-lifeos-muted/30 py-ds-2.5 pl-ds-3 pr-ds-3 text-sm leading-relaxed text-lifeos-fg-secondary shadow-inner [box-shadow:inset_3px_0_0_0_rgba(91,108,255,0.35)]"
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
