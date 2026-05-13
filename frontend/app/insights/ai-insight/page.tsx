"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, CleaningZone, DailyInsight, DailySummary, EventItem, FinanceRangeSummary, FocusSession, TaskItem } from "@/lib/api";
import { computeDailyStats } from "@/lib/analytics/fromEvents";
import { normalizeAnalyticsEvents } from "@/lib/analytics/normalize";
import { formatDateFiNumeric, getLocalDayRangeIso, localCalendarDayKeyFromDate } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { BodyText, LabelText, MutedText, PageTitle, SectionTitle } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useUserPreferencesEpoch } from "@/hooks/useUserPreferencesEpoch";
import { getResolvedUserPreferences } from "@/services/preferences";
import { Badge } from "@/components/ui/badge";
import { WhyLine } from "@/components/explainability/WhyLine";
import { generateRuleInsights, type RuleInsight } from "@/services/insights";

function insightCategoryLabel(category: RuleInsight["category"]): string {
  if (category === "productivity") return "Productivity";
  if (category === "cleaning") return "Cleaning";
  if (category === "finance") return "Finance";
  return "Tasks";
}

export default function AiDailyInsightPage() {
  const userPrefsEpoch = useUserPreferencesEpoch();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [financeToday, setFinanceToday] = useState<FinanceRangeSummary | null>(null);
  const [analyticsEvents, setAnalyticsEvents] = useState<EventItem[]>([]);
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
      }),
      // Rule-based finance insight uses expense total from the event stream (events-first); summary API stays for display.
      fetch(`${API_URL}/events?limit=500`, { cache: "no-store" }).then(async (r) => {
        if (!r.ok) throw new Error("events");
        const raw = (await r.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
        return normalizeAnalyticsEvents(raw);
      })
    ])
      .then(([s, i, t, z, f, fin, ev]) => {
        setSummary(s);
        setInsight(i);
        setTasks(t);
        setZones(z);
        setFocusSessions(f);
        setFinanceToday(fin);
        setAnalyticsEvents(ev);
      })
      .catch(() => setError("Could not load AI insight data."));
  }, []);

  // Recomputes when the normalized event batch loads (same cap as other analytics screens).
  const dailyStatsFromEvents = useMemo(
    () => computeDailyStats(analyticsEvents, localCalendarDayKeyFromDate(new Date())),
    [analyticsEvents]
  );

  const ruleInsights = useMemo(
    () =>
      generateRuleInsights({
        focusSessions,
        cleaningZones: zones,
        expensesTodayTotal: dailyStatsFromEvents.expensesTotal,
        tasks,
        dailySpendingLimitEur: getResolvedUserPreferences().dailySpendingLimit
      }),
    [focusSessions, zones, dailyStatsFromEvents.expensesTotal, tasks, userPrefsEpoch]
  );

  return (
    <div className={ui.contentClass}>
      {error && <p className="mb-4 text-lifeos-danger">{error}</p>}

      <section className={ds.surfaces.insightHero}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            variant="outline"
            className="inline-flex h-9 items-center rounded-xl bg-lifeos-accent-soft px-4 text-sm font-medium text-lifeos-accent shadow-sm"
          >
            Daily insight
          </Badge>
          <span className={cn(ds.typography.bodySecondary, "text-lifeos-fg-muted")}>
            {summary?.date ? formatDateFiNumeric(summary.date) : "Today"}
          </span>
        </div>
        <PageTitle className="mt-ds-4 max-w-[22ch] md:max-w-none">{insight?.headline ?? "Light execution day"}</PageTitle>
        <MutedText className={cn("mt-ds-4", ds.typography.proseWideMax)}>
          {insight?.summary ?? "Loading insight..."}
        </MutedText>
      </section>

      <section className={cn("mt-6", ds.surfaces.contentPanelCompact)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-ds-2">
            <SectionTitle>From your data</SectionTitle>
            <MutedText className={ds.typography.proseMax}>
              Nudges from what you&apos;ve logged. Same logic as before.
            </MutedText>
          </div>
        </div>

        {ruleInsights.length > 0 ? (
          <ul className="mt-ds-5 space-y-ds-3">
            {ruleInsights.map((item) => (
              <li key={item.id}>
                <article className={ds.surfaces.accentCallout}>
                  <LabelText as="p" className={cn(ds.typography.labelMicro, "text-lifeos-accent")}>
                    {insightCategoryLabel(item.category)}
                  </LabelText>
                  <BodyText as="p" className={cn(ds.typography.bodySecondary, "mt-ds-3")}>
                    {item.message}
                  </BodyText>
                  <WhyLine text={item.explanation ?? ""} />
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn("mt-ds-5", ds.surfaces.toneWell)}>
            <BodyText as="p" className={ds.typography.bodySecondary}>
              <span className="font-medium text-lifeos-fg">All clear.</span> No alerts for this data yet.
            </BodyText>
          </div>
        )}
      </section>
    </div>
  );
}
