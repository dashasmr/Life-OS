"use client";

import { useEffect, useMemo, useState } from "react";
import {
  API_URL,
  CleaningZone,
  DailySnapshot,
  describeFetchFailure,
  EventItem,
  FinanceRangeSummary,
  FinanceTransaction,
  MonthlyReview
} from "@/lib/api";
import {
  computeEventCountsByType,
  computeMonthlyStats,
  mostProductiveLocalDay,
  normalizeAnalyticsEvents
} from "@/lib/analytics";
import { computeHomeHealthScore, mostOverdueZone } from "@/lib/cleaningHealth";
import { formatDateFiNumeric, getLocalMonthRangeIso, localCalendarDayKeyFromDate } from "@/lib/datetime";
import type { BehaviorPattern } from "@/lib/patterns";
import { topExpenseCategoryInRange } from "@/lib/weeklyReviewInsights";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import {
  BodyText,
  CardTitle,
  MetricLabel,
  MetricValue,
  MutedText,
  PageTitle,
  SectionTitle
} from "@/components/ui/typography";
import { PageSectionSkeleton } from "@/components/ui/skeleton";

function formatEur(value: number): string {
  return `€${value.toFixed(2)}`;
}

function formatDayKeyLabel(dayKey: string): string {
  const parts = dayKey.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dayKey;
  const [yy, mm, dd] = parts;
  return formatDateFiNumeric(new Date(yy, mm - 1, dd));
}

function averageHomeHealthInLocalMonth(snapshots: DailySnapshot[], ref: Date): number | null {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const startKey = localCalendarDayKeyFromDate(new Date(y, m, 1));
  const endKey = localCalendarDayKeyFromDate(new Date(y, m + 1, 0));
  const vals = snapshots
    .filter((s) => s.date >= startKey && s.date <= endKey && s.home_health_score != null)
    .map((s) => s.home_health_score as number);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default function MonthlyReviewPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceRangeSummary | null>(null);
  const [expenseRows, setExpenseRows] = useState<FinanceTransaction[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<BehaviorPattern[]>([]);
  const [behaviorPatternsInsufficient, setBehaviorPatternsInsufficient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [monthlyAi, setMonthlyAi] = useState<MonthlyReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const anchor = useMemo(() => new Date(), []);
  const { from, to, monthFromMs, monthToMs, monthTitle } = useMemo(() => {
    const range = getLocalMonthRangeIso(anchor);
    const a = new Date(range.from).getTime();
    const b = new Date(range.to).getTime();
    const title = new Date(range.from).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return { from: range.from, to: range.to, monthFromMs: a, monthToMs: b, monthTitle: title };
  }, [anchor]);

  useEffect(() => {
    const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API_URL}/events?limit=500`, { cache: "no-store" }),
      fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/summary/range?${qs}`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/transactions?kind=expense&limit=500`, { cache: "no-store" }),
      fetch(`${API_URL}/analytics/daily-snapshots?limit=62`, { cache: "no-store" }),
      fetch(`${API_URL}/analytics/behavior-patterns?${qs}`, { cache: "no-store" })
    ])
      .then(async ([evRes, zRes, finRes, txRes, snapRes, patRes]) => {
        if (!evRes.ok) throw new Error("Failed to load events");
        if (!zRes.ok) throw new Error("Failed to load cleaning zones");
        if (!finRes.ok) throw new Error("Failed to load finance summary");
        if (!txRes.ok) throw new Error("Failed to load transactions");
        if (!snapRes.ok) throw new Error("Failed to load daily snapshots");

        const rawEv = (await evRes.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
        setEvents(normalizeAnalyticsEvents(rawEv));
        setZones(await zRes.json());
        setFinanceSummary(await finRes.json());
        setExpenseRows(await txRes.json());
        setSnapshots(await snapRes.json());
        if (patRes.ok) {
          const raw = (await patRes.json()) as BehaviorPattern[] | { patterns?: BehaviorPattern[]; insufficientHistory?: boolean };
          if (Array.isArray(raw)) {
            setBehaviorPatterns(raw);
            setBehaviorPatternsInsufficient(false);
          } else {
            setBehaviorPatterns(raw.patterns ?? []);
            setBehaviorPatternsInsufficient(Boolean(raw.insufficientHistory));
          }
        } else {
          setBehaviorPatterns([]);
          setBehaviorPatternsInsufficient(false);
        }
      })
      .catch((err: unknown) => setError(describeFetchFailure(err)))
      .finally(() => setLoading(false));
  }, [from, to]);

  const monthlyStats = useMemo(
    () => computeMonthlyStats(events, monthFromMs, monthToMs),
    [events, monthFromMs, monthToMs]
  );

  const monthEventCounts = useMemo(
    () => computeEventCountsByType(events, monthFromMs, monthToMs),
    [events, monthFromMs, monthToMs]
  );

  const bestDay = useMemo(
    () => mostProductiveLocalDay(events, monthFromMs, monthToMs),
    [events, monthFromMs, monthToMs]
  );

  const financeBlock = useMemo(() => {
    const top = topExpenseCategoryInRange(expenseRows, monthFromMs, monthToMs);
    return {
      income: financeSummary?.income_total ?? 0,
      expense: financeSummary?.expense_total ?? 0,
      balance: financeSummary?.balance_delta ?? 0,
      topCategory: top?.category ?? null,
      topAmount: top?.total ?? 0
    };
  }, [expenseRows, financeSummary, monthFromMs, monthToMs]);

  const avgHomeHealth = useMemo(() => averageHomeHealthInLocalMonth(snapshots, anchor), [snapshots, anchor]);
  const currentHomeHealth = useMemo(() => computeHomeHealthScore(zones), [zones]);
  const worstZone = useMemo(() => mostOverdueZone(zones), [zones]);

  async function generateMonthlyAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch(`${API_URL}/ai/monthly-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthFrom: from, monthTo: to })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to generate monthly review");
      }
      const data = (await response.json()) as MonthlyReview;
      setMonthlyAi(data);
    } catch (e: unknown) {
      setAiError(describeFetchFailure(e));
      setMonthlyAi(null);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <div className="space-y-ds-2">
          <PageTitle>Monthly review</PageTitle>
          <MutedText className={ds.typography.proseMax}>
            How did this month go? Range uses your local calendar month.
          </MutedText>
          <p className={cn(ds.typography.bodySecondary, "text-lifeos-fg-muted")}>{monthTitle}</p>
        </div>

        {loading && (
          <div className="mt-6">
            <PageSectionSkeleton />
          </div>
        )}
        {error && <p className="mt-6 text-lifeos-danger">{error}</p>}

        {!loading && !error && (
          <div className="mt-8 space-y-8">
            <section className={ds.surfaces.contentPanel}>
              <SectionTitle>Productivity</SectionTitle>
              <dl className="mt-ds-5 grid gap-ds-5 sm:grid-cols-3">
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Tasks completed</MetricLabel>
                  <MetricValue as="dd">{monthlyStats.tasksCompleted}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Focus minutes</MetricLabel>
                  <MetricValue as="dd">{monthlyStats.focusMinutes}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Most productive day</MetricLabel>
                  <CardTitle as="dd" className="mt-0">
                    {bestDay ? formatDayKeyLabel(bestDay.dayKey) : "—"}
                  </CardTitle>
                  {bestDay && (
                    <BodyText as="p" className={cn(ds.typography.bodyMuted, "pt-ds-1")}>
                      {bestDay.tasksCompleted} tasks · {bestDay.focusMinutes} focus min
                    </BodyText>
                  )}
                  {!bestDay && (
                    <BodyText as="p" className={ds.typography.bodyMuted}>
                      No tasks or focus in this window yet.
                    </BodyText>
                  )}
                </div>
              </dl>
              <BodyText as="p" className={cn(ds.typography.bodyMuted, "mt-ds-5")}>
                Pomodoros completed: {monthEventCounts.pomodoro_completed ?? 0}
              </BodyText>
            </section>

            <section className={ds.surfaces.contentPanel}>
              <SectionTitle>Finance</SectionTitle>
              <dl className="mt-ds-5 grid gap-ds-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Income</MetricLabel>
                  <MetricValue as="dd">{formatEur(financeBlock.income)}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Expenses</MetricLabel>
                  <MetricValue as="dd">{formatEur(financeBlock.expense)}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Balance</MetricLabel>
                  <MetricValue as="dd">{formatEur(financeBlock.balance)}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Top spending category</MetricLabel>
                  <CardTitle as="dd" className="mt-0">
                    {financeBlock.topCategory ?? "—"}
                  </CardTitle>
                  {financeBlock.topCategory != null && financeBlock.topAmount > 0 && (
                    <BodyText as="p" className={cn(ds.typography.bodyMuted, "tabular-nums")}>
                      {formatEur(financeBlock.topAmount)}
                    </BodyText>
                  )}
                </div>
              </dl>
            </section>

            <section className={ds.surfaces.contentPanel}>
              <SectionTitle>Behavior patterns</SectionTitle>
              <MutedText className={cn("mt-ds-2", ds.typography.proseMax)}>
                Counts from the API. Separate from the monthly draft.
              </MutedText>
              {behaviorPatterns.length === 0 ? (
                <MutedText className="mt-ds-5 max-w-[65ch]">
                  {behaviorPatternsInsufficient
                    ? "Not enough data to detect behavioral patterns yet. Log activity across several distinct days (focus, cleaning, categorized expenses) before reading trends here."
                    : "No pattern cleared the bar for this window — keep logging focus, snapshots, and categorized expenses."}
                </MutedText>
              ) : (
                <ul className="mt-ds-5 space-y-ds-3">
                  {behaviorPatterns.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-xl bg-lifeos-muted/35 px-4 py-3 shadow-inner"
                    >
                      <span className={ds.typography.labelMicro}>
                        {p.category} · {(p.confidence * 100).toFixed(0)}%
                      </span>
                      <BodyText as="p" className="mt-ds-2 text-lifeos-fg-secondary">
                        {p.message}
                      </BodyText>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={ds.surfaces.contentPanel}>
              <SectionTitle>Home</SectionTitle>
              <dl className="mt-ds-5 grid gap-ds-5 sm:grid-cols-3">
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Cleaning actions</MetricLabel>
                  <MetricValue as="dd">{monthlyStats.cleaningActions}</MetricValue>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Average home health score</MetricLabel>
                  <MetricValue as="dd">{avgHomeHealth != null ? `${avgHomeHealth}%` : "—"}</MetricValue>
                  <BodyText as="p" className={cn(ds.typography.bodyMuted, "pt-ds-1")}>
                    {avgHomeHealth != null
                      ? "Mean of daily snapshot scores in this month (when snapshots exist)."
                      : currentHomeHealth != null
                        ? `No snapshot samples this month; current score: ${currentHomeHealth.scorePercent}%.`
                        : "Add cleaning zones and generate daily snapshots to see a monthly average."}
                  </BodyText>
                </div>
                <div className="space-y-ds-2">
                  <MetricLabel as="dt">Most overdue zone</MetricLabel>
                  <CardTitle as="dd" className="mt-0">
                    {worstZone?.name ?? "—"}
                  </CardTitle>
                  {!worstZone && zones.length > 0 && (
                    <BodyText as="p" className={ds.typography.bodyMuted}>
                      No overdue zones right now.
                    </BodyText>
                  )}
                  {zones.length === 0 && (
                    <BodyText as="p" className={ds.typography.bodyMuted}>
                      No zones configured.
                    </BodyText>
                  )}
                </div>
              </dl>
            </section>

            <section
              className={cn(
                ds.surfaces.contentPanel,
                "shadow-[0_0_40px_-12px_rgba(91,108,255,0.14)]"
              )}
            >
              <div className="flex flex-col gap-ds-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-ds-2">
                  <SectionTitle>AI month summary</SectionTitle>
                  <MutedText className={ds.typography.proseMax}>
                    Generated on demand from the same month window; does not auto-load.
                  </MutedText>
                </div>
                <button
                  type="button"
                  onClick={() => void generateMonthlyAi()}
                  disabled={aiLoading}
                  className="shrink-0 rounded-xl bg-lifeos-accent-soft px-4 py-2 text-lifeos-body font-medium text-lifeos-accent shadow-sm transition hover:bg-lifeos-accent/15 disabled:opacity-50"
                >
                  {aiLoading ? "Working…" : "Generate AI summary"}
                </button>
              </div>

              {aiError && (
                <BodyText as="p" className="mt-ds-5 text-lifeos-danger">
                  {aiError}
                </BodyText>
              )}

              {!monthlyAi && !aiLoading && !aiError && (
                <MutedText className="mt-ds-5 max-w-[62ch]">
                  Run the generator when you want wins, risks, and focus ideas.
                </MutedText>
              )}

              {monthlyAi && (
                <div className="mt-ds-6 space-y-ds-6">
                  <div className="flex flex-wrap items-center gap-ds-2">
                    <BodyText as="p" className="font-semibold text-lifeos-fg-secondary">
                      {monthlyAi.title}
                    </BodyText>
                    {monthlyAi.fallback && (
                      <span className="rounded-md bg-lifeos-muted/50 px-2 py-0.5 text-lifeos-caption text-lifeos-fg-muted shadow-sm">
                        Rule-based fallback
                      </span>
                    )}
                  </div>
                  <MutedText className={ds.typography.proseWideMax}>{monthlyAi.summary}</MutedText>

                  <div className="grid gap-ds-6 md:grid-cols-2">
                    <div>
                      <CardTitle className="text-lifeos-success">Wins</CardTitle>
                      <ul className="mt-ds-3 space-y-ds-2">
                        {(monthlyAi.wins.length ? monthlyAi.wins : ["—"]).map((line) => (
                          <li key={line}>
                            <BodyText as="p" className="text-lifeos-fg-secondary">
                              {line}
                            </BodyText>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <CardTitle className="text-lifeos-warning">Risks</CardTitle>
                      <ul className="mt-ds-3 space-y-ds-2">
                        {(monthlyAi.risks.length ? monthlyAi.risks : ["—"]).map((line) => (
                          <li key={line}>
                            <BodyText as="p" className="text-lifeos-fg-secondary">
                              {line}
                            </BodyText>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <CardTitle className="text-lifeos-status-neutral">Patterns</CardTitle>
                      <ul className="mt-ds-3 space-y-ds-2">
                        {(monthlyAi.patterns.length ? monthlyAi.patterns : ["—"]).map((line) => (
                          <li key={line}>
                            <BodyText as="p" className="text-lifeos-fg-secondary">
                              {line}
                            </BodyText>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <CardTitle className="text-lifeos-accent">Next month focus</CardTitle>
                      <ul className="mt-ds-3 space-y-ds-2">
                        {(monthlyAi.nextMonthFocus.length ? monthlyAi.nextMonthFocus : ["—"]).map((line) => (
                          <li key={line}>
                            <BodyText as="p" className="text-lifeos-fg-secondary">
                              {line}
                            </BodyText>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
