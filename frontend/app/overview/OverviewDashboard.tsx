"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  API_URL,
  AdaptiveContext,
  CleaningZone,
  DailyReview,
  describeFetchFailure,
  EventItem,
  fetchAdaptiveContext,
  FinanceRangeSummary,
  FocusSession,
  postRecommendationFeedback,
  RecommendationOutcome,
  TaskItem
} from "@/lib/api";
import { cleaningActionLabel, formatSignedEur, pickNextCleaningZone, pickTopPriorityTask } from "@/lib/commandCenter";
import { computeDailyStats, countEventsOnLocalDay } from "@/lib/analytics/fromEvents";
import { normalizeAnalyticsEvents } from "@/lib/analytics/normalize";
import {
  formatDateFiNumeric,
  formatDateTimeFiNumeric,
  getLocalDayRangeIso,
  getLocalLastNDaysRangeIso,
  getLocalMonthRangeIso,
  getLocalWeekRangeIso,
  localCalendarDayKeyFromDate
} from "@/lib/datetime";
import type { RiskSignal } from "@/lib/risks";
import { ui } from "@/lib/ui";
import { dashboard, domain, ds } from "@/styles/design-system";
import { PageTitle, MutedText } from "@/components/ui/typography";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { DashboardNotificationsSection } from "@/components/DashboardNotificationsSection";
import { RecommendationActionCard } from "@/components/recommendations/RecommendationActionCard";
import { WhyLine } from "@/components/explainability/WhyLine";
import { useAutomationPrefsEpoch } from "@/hooks/useAutomationPrefsEpoch";
import { useUserPreferencesEpoch } from "@/hooks/useUserPreferencesEpoch";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PageSectionSkeleton } from "@/components/ui/skeleton";
import {
  extraItemsToPlanRows,
  generateDailyPlan,
  loadDailyPlanCompletedIds,
  loadExtraDailyPlanItems,
  saveDailyPlanCompletedIds,
  type DailyPlanItem
} from "@/lib/dailyPlan";
import { fetchGoalsForPeriod } from "@/lib/goals/api";
import type { Goal } from "@/lib/goals/types";
import { runRecommendationsAutomation, type NextActionRecommendation } from "@/lib/recommendations";
import { clearRecommendationCooldown, touchRecommendationCooldown } from "@/lib/recommendations/adaptiveApply";
import { computeTodayState, type SystemStatusTone, type TodayStateRow } from "@/lib/systemStatus";
import { sendWithOfflineQueue } from "@/services/offlineQueue";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";
import { Brain, Home, ListTodo, Sparkles, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";

function systemStatusToneStyles(tone: SystemStatusTone): { shell: string; badge: string; glow: string } {
  switch (tone) {
    case "positive":
      return {
        shell:
          "rounded-ds-input bg-lifeos-inset/90 shadow-inner ring-1 ring-lifeos-status-healthy-border/45",
        badge: "rounded-md bg-lifeos-success-muted/25 px-ds-2 py-0.5 text-xs font-medium text-lifeos-success",
        glow: "text-lifeos-success"
      };
    case "caution":
      return {
        shell:
          "rounded-ds-input bg-lifeos-inset/90 shadow-inner ring-1 ring-lifeos-warning/35",
        badge: "rounded-md bg-lifeos-warning-muted/25 px-ds-2 py-0.5 text-xs font-medium text-lifeos-warning",
        glow: "text-lifeos-warning"
      };
    case "critical":
      return {
        shell:
          "rounded-ds-input bg-lifeos-danger-muted/15 shadow-inner ring-1 ring-lifeos-status-risk-border/50",
        badge: "rounded-md bg-lifeos-danger-muted/30 px-ds-2 py-0.5 text-xs font-medium text-lifeos-danger",
        glow: "text-lifeos-danger"
      };
    default:
      return {
        shell:
          "rounded-ds-input bg-lifeos-inset/75 shadow-inner ring-1 ring-lifeos-domain-ai-border/55",
        badge: "rounded-md bg-lifeos-muted px-ds-2 py-0.5 text-xs font-medium text-lifeos-fg-secondary",
        glow: "text-lifeos-fg-muted"
      };
  }
}

function TodayStateIcon({ rowKey }: { rowKey: TodayStateRow["key"] }) {
  const cls = "size-4 shrink-0 opacity-90";
  if (rowKey === "mind") return <Brain className={cls} strokeWidth={1.75} />;
  if (rowKey === "home") return <Home className={cls} strokeWidth={1.75} />;
  if (rowKey === "finance") return <Wallet className={cls} strokeWidth={1.75} />;
  return <Zap className={cls} strokeWidth={1.75} />;
}

function riskSeverityShell(severity: RiskSignal["severity"]): string {
  if (severity === "high") {
    return "rounded-ds-input bg-lifeos-inset/90 shadow-[inset_3px_0_0_0_rgba(232,152,152,0.55)]";
  }
  if (severity === "medium") {
    return "rounded-ds-input bg-lifeos-inset/90 shadow-[inset_3px_0_0_0_rgba(220,200,154,0.45)]";
  }
  return "rounded-ds-input bg-lifeos-inset/80 shadow-inner";
}

function riskSeverityLabel(severity: RiskSignal["severity"]): string {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Low";
}

export type DashboardTabId = "overview" | "command-center" | "daily-plan" | "recommendations" | "notifications";

export function OverviewDashboard({ tab }: { tab: DashboardTabId }) {
  const automationPrefsEpoch = useAutomationPrefsEpoch();
  const userPrefsEpoch = useUserPreferencesEpoch();
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null);
  const [dailyReviewLoading, setDailyReviewLoading] = useState(false);
  const [dailyReviewError, setDailyReviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingFocus, setStartingFocus] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [commandTasks, setCommandTasks] = useState<TaskItem[]>([]);
  const [commandZones, setCommandZones] = useState<CleaningZone[]>([]);
  const [financeToday, setFinanceToday] = useState<FinanceRangeSummary | null>(null);
  const [financeMonth, setFinanceMonth] = useState<FinanceRangeSummary | null>(null);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [recActionBusy, setRecActionBusy] = useState<string | null>(null);
  const [planCompletedIds, setPlanCompletedIds] = useState<Set<string>>(() => new Set());
  const [extraPlanEpoch, setExtraPlanEpoch] = useState(0);
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([]);
  const [automationGoals, setAutomationGoals] = useState<Goal[]>([]);
  const [adaptiveContext, setAdaptiveContext] = useState<AdaptiveContext | null>(null);
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  // Large limit so same-day KPIs and recommendations see the full recent log (see `computeDailyStats` caveats).
  async function loadEvents() {
    const response = await fetch(`${API_URL}/events?limit=500`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch events");
    const rawItems = (await response.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
    setEvents(normalizeAnalyticsEvents(rawItems));
  }

  async function loadCommandCenterTasks() {
    const response = await fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch tasks");
    setCommandTasks(await response.json());
  }

  async function loadCommandCenterZones() {
    const response = await fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch cleaning zones");
    setCommandZones(await response.json());
  }

  async function loadFinanceRangeSummaries() {
    const now = new Date();
    const day = getLocalDayRangeIso(now);
    const month = getLocalMonthRangeIso(now);
    const qs = (from: string, to: string) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const [dayRes, monthRes] = await Promise.all([
      fetch(`${API_URL}/finance/summary/range?${qs(day.from, day.to)}`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/summary/range?${qs(month.from, month.to)}`, { cache: "no-store" })
    ]);
    if (!dayRes.ok) throw new Error("Failed to fetch finance day summary");
    if (!monthRes.ok) throw new Error("Failed to fetch finance month summary");
    setFinanceToday(await dayRes.json());
    setFinanceMonth(await monthRes.json());
  }

  async function loadFocusSessions() {
    const response = await fetch(`${API_URL}/focus/sessions?limit=50`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch focus sessions");
    setFocusSessions(await response.json());
  }

  async function loadRiskSignals() {
    const { from, to } = getLocalLastNDaysRangeIso(14);
    const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await fetch(`${API_URL}/analytics/risk-signals?${qs}`, { cache: "no-store" });
    if (!response.ok) {
      setRiskSignals([]);
      return;
    }
    setRiskSignals((await response.json()) as RiskSignal[]);
  }

  async function loadAutomationGoals() {
    const now = new Date();
    const month = getLocalMonthRangeIso(now);
    const week = getLocalWeekRangeIso(now);
    try {
      const [monthly, weekly] = await Promise.all([
        fetchGoalsForPeriod("monthly", month.from, month.to),
        fetchGoalsForPeriod("weekly", week.from, week.to)
      ]);
      const byId = new Map<string, Goal>();
      for (const g of [...monthly, ...weekly]) byId.set(g.id, g);
      setAutomationGoals([...byId.values()]);
    } catch {
      setAutomationGoals([]);
    }
  }

  const loadAdaptiveContext = useCallback(async () => {
    try {
      const ctx = await fetchAdaptiveContext();
      setAdaptiveContext(ctx);
    } catch {
      setAdaptiveContext(null);
    }
  }, []);

  const submitRecFeedback = useCallback(
    async (recommendationId: string, outcome: RecommendationOutcome) => {
      try {
        await postRecommendationFeedback({
          recommendation_id: recommendationId,
          outcome,
          local_hour: new Date().getHours()
        });
        if (outcome === "accepted") {
          clearRecommendationCooldown(recommendationId);
        } else {
          touchRecommendationCooldown(recommendationId);
        }
        await loadAdaptiveContext();
      } catch {
        /* Feedback is best-effort; engine still works without it. */
      }
    },
    [loadAdaptiveContext]
  );

  async function refreshRecommendationDrivers() {
    await Promise.all([
      loadCommandCenterZones(),
      loadFocusSessions(),
      loadCommandCenterTasks(),
      loadFinanceRangeSummaries(),
      loadEvents(),
      loadRiskSignals(),
      loadAutomationGoals(),
      loadAdaptiveContext()
    ]);
  }

  async function generateDailyReview(regenerate = false) {
    setDailyReviewLoading(true);
    setDailyReviewError(null);
    try {
      const response = await fetch(`${API_URL}/ai/daily-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localCalendarDayKeyFromDate(new Date()),
          regenerate
        })
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Failed to generate review");
      }
      const data = (await response.json()) as DailyReview;
      setDailyReview(data);
    } catch (e: unknown) {
      setDailyReviewError(describeFetchFailure(e));
      setDailyReview(null);
    } finally {
      setDailyReviewLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      loadEvents(),
      loadCommandCenterTasks(),
      loadCommandCenterZones(),
      loadFinanceRangeSummaries(),
      loadFocusSessions(),
      loadRiskSignals(),
      loadAutomationGoals(),
      loadAdaptiveContext()
    ]).catch((err: unknown) => {
      setError(describeFetchFailure(err));
    });
  }, []);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    void refreshRecommendationDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: refresh only on SSE epoch bump
  }, [realtimeEpoch]);

  useEffect(() => {
    setPlanCompletedIds(loadDailyPlanCompletedIds(new Date()));
  }, []);

  useEffect(() => {
    const bump = () => setExtraPlanEpoch((n) => n + 1);
    window.addEventListener("lifeos-daily-plan-extra-changed", bump);
    return () => window.removeEventListener("lifeos-daily-plan-extra-changed", bump);
  }, []);

  useEffect(() => {
    if (tab !== "recommendations" && tab !== "overview") return;
    const d = localCalendarDayKeyFromDate(new Date());
    let cancelled = false;
    fetch(`${API_URL}/ai/reviews/${d}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setDailyReview(data as DailyReview);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function onStartFocusFromQuickAction() {
    setError(null);
    setStartingFocus(true);
    try {
      const body = { label: null, task_id: null };
      const result = await sendWithOfflineQueue({ kind: "focus_start", body }, () =>
        fetch(`${API_URL}/focus/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Saved offline. Syncs when you are online." });
        return;
      }
      if (!result.response.ok) {
        setError("Failed to start focus session");
        toast.error("Failed to start focus session");
        return;
      }
      toast.success("Focus session started");
      router.push("/work/focus");
    } catch (e: unknown) {
      const msg = describeFetchFailure(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setStartingFocus(false);
    }
  }

  // Event-sourced metrics for today (tasks/focus/cleaning/expense signals).
  const dailyStatsFromEvents = useMemo(() => {
    const dayKey = localCalendarDayKeyFromDate(new Date());
    return computeDailyStats(events, dayKey);
  }, [events]);

  const topTask = pickTopPriorityTask(commandTasks);
  const nextZone = pickNextCleaningZone(commandZones);
  const todayStateRows = useMemo(
    () =>
      computeTodayState({
        tasksCompletedToday: dailyStatsFromEvents.tasksCompleted,
        focusSessions,
        cleaningZones: commandZones,
        monthlyBalanceDelta: financeMonth?.balance_delta ?? null,
        focusMinutesToday: dailyStatsFromEvents.focusMinutes
      }),
    [
      dailyStatsFromEvents.tasksCompleted,
      dailyStatsFromEvents.focusMinutes,
      focusSessions,
      commandZones,
      financeMonth?.balance_delta
    ]
  );

  const recommendationAutomation = useMemo(() => {
    const now = new Date();
    return runRecommendationsAutomation({
      focusSessions,
      cleaningZones: commandZones,
      tasks: commandTasks,
      expensesTodayTotal: dailyStatsFromEvents.expensesTotal,
      dailyEventsTotal: countEventsOnLocalDay(events, localCalendarDayKeyFromDate(now)),
      goals: automationGoals,
      todayStats: {
        tasksCompleted: dailyStatsFromEvents.tasksCompleted,
        focusMinutes: dailyStatsFromEvents.focusMinutes
      },
      adaptiveContext,
      now
    });
  }, [
    focusSessions,
    commandZones,
    commandTasks,
    dailyStatsFromEvents.expensesTotal,
    dailyStatsFromEvents.tasksCompleted,
    dailyStatsFromEvents.focusMinutes,
    events,
    automationGoals,
    adaptiveContext,
    automationPrefsEpoch,
    userPrefsEpoch
  ]);
  const nextActions = recommendationAutomation.recommendations;
  const automationRiskSignals = recommendationAutomation.automationRiskSignals;
  const automationPositiveInsights = recommendationAutomation.positiveInsights;

  const dailyPlanGenerated = useMemo(
    () =>
      generateDailyPlan({
        tasks: commandTasks,
        cleaningZones: commandZones,
        focusSessions,
        expensesTodayTotal: dailyStatsFromEvents.expensesTotal
      }),
    [commandTasks, commandZones, focusSessions, dailyStatsFromEvents.expensesTotal, userPrefsEpoch]
  );

  const extraPlanStored = useMemo(() => loadExtraDailyPlanItems(new Date()), [extraPlanEpoch]);

  const dailyPlanItems: DailyPlanItem[] = useMemo(() => {
    const genRows = dailyPlanGenerated.map((row) => ({ ...row, completed: planCompletedIds.has(row.id) }));
    const extraRows = extraItemsToPlanRows(extraPlanStored, planCompletedIds);
    return [...extraRows, ...genRows];
  }, [dailyPlanGenerated, extraPlanStored, planCompletedIds]);

  const primaryNextAction = nextActions[0] ?? null;
  const overviewDailyPlanItems = useMemo(() => dailyPlanItems.slice(0, 5), [dailyPlanItems]);
  const importantRiskSignals = useMemo(
    () => riskSignals.filter((r) => r.severity === "high" || r.severity === "medium"),
    [riskSignals]
  );

  function toggleDailyPlanItem(id: string) {
    setPlanCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDailyPlanCompletedIds(new Date(), next);
      return next;
    });
  }

  async function runRecommendationPrimaryAction(item: NextActionRecommendation) {
    const pa = item.primaryAction;
    if (!pa) return;
    setRecActionBusy(item.id);
    setError(null);
    try {
      if (pa.kind === "cleaning_mark_done") {
        const result = await sendWithOfflineQueue({ kind: "cleaning_done", zoneId: pa.zoneId }, () =>
          fetch(`${API_URL}/cleaning/zones/${pa.zoneId}/done`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          })
        );
        if (result.mode === "queued") {
          toast.info("Pending sync", { description: "Saved offline. Syncs when you are online." });
          await submitRecFeedback(item.id, "accepted");
          await refreshRecommendationDrivers();
          return;
        }
        if (!result.response.ok) throw new Error("Failed to mark cleaning as done");
        toast.success("Marked as cleaned");
        await submitRecFeedback(item.id, "accepted");
        await refreshRecommendationDrivers();
      } else if (pa.kind === "focus_start") {
        const result = await sendWithOfflineQueue(
          { kind: "focus_start", body: { label: null, task_id: null } },
          () =>
            fetch(`${API_URL}/focus/sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label: null, task_id: null })
            })
        );
        if (result.mode === "queued") {
          toast.info("Pending sync", { description: "Saved offline. Syncs when you are online." });
          await submitRecFeedback(item.id, "accepted");
          await refreshRecommendationDrivers();
          return;
        }
        if (!result.response.ok) throw new Error("Failed to start focus session");
        toast.success("Focus session started");
        await submitRecFeedback(item.id, "accepted");
        await refreshRecommendationDrivers();
        router.push("/work/focus");
      } else if (pa.kind === "navigate") {
        await submitRecFeedback(item.id, "accepted");
        router.push(pa.href as Route);
        await refreshRecommendationDrivers();
      } else if (pa.kind === "task_open") {
        await submitRecFeedback(item.id, "accepted");
        router.push((pa.taskId ? `/work/tasks?highlight=${encodeURIComponent(pa.taskId)}` : "/work/tasks") as Route);
        await refreshRecommendationDrivers();
      }
    } catch (e: unknown) {
      toast.error("Action failed");
      setError(describeFetchFailure(e));
    } finally {
      setRecActionBusy(null);
    }
  }

  function nextActionCategoryLabel(category: NextActionRecommendation["type"]): string {
    if (category === "productivity") return "Productivity";
    if (category === "cleaning") return "Cleaning";
    if (category === "finance") return "Finance";
    return "Tasks";
  }

  function dailyPlanCategoryLabel(category: DailyPlanItem["category"]): string {
    if (category === "task") return "Task";
    if (category === "focus") return "Focus";
    if (category === "cleaning") return "Cleaning";
    return "Finance";
  }

  function nextActionPriorityClass(p: NextActionRecommendation["priority"]): string {
    if (p === "high") return "bg-lifeos-danger-muted/22 text-lifeos-danger shadow-sm";
    if (p === "medium") return "bg-lifeos-warning-muted/18 text-lifeos-warning shadow-sm";
    return "bg-lifeos-muted/70 text-lifeos-fg-muted shadow-sm";
  }

  return (
    <div className={ui.contentClass}>
      {error && <p className="text-lifeos-danger">{error}</p>}

      <div className="flex flex-col gap-5 max-md:gap-4 md:gap-6">
      {tab === "command-center" ? (
      <section className={ds.surfaces.contentPanel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lifeos-section font-semibold tracking-tight text-lifeos-fg">Command Center</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>What matters most today</p>
          </div>
        </div>

        <div className={cn(ds.surfaces.metricBand, "mt-ds-4")}>
          <div className="grid grid-cols-1 gap-ds-4 lg:grid-cols-3">
            <div className="min-w-0 space-y-ds-2">
              <p className="text-lifeos-caption font-medium text-lifeos-accent">Priority task</p>
              {topTask ? (
                <div className="space-y-ds-2">
                  <p className="text-lg font-medium text-lifeos-fg">{topTask.title}</p>
                  <p className={`text-sm ${ui.mutedText}`}>
                    High priority
                    {topTask.due_date ? ` · Due ${formatDateFiNumeric(topTask.due_date)}` : ""}
                  </p>
                  <Link href="/work/tasks" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}>
                    Open tasks
                  </Link>
                </div>
              ) : (
                <div className="space-y-ds-2">
                  <p className="text-lg font-medium text-lifeos-fg">No priority task yet</p>
                  <p className={`text-sm ${ui.mutedText}`}>Add a task and mark it high priority.</p>
                  <Link href="/work/tasks" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}>
                    Add a high-priority task
                  </Link>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-ds-2">
              <p className="text-lifeos-caption font-medium text-lifeos-accent">Cleaning</p>
              {nextZone ? (
                <div className="space-y-ds-2">
                  <p className="text-lg font-medium text-lifeos-fg">{cleaningActionLabel(nextZone)}</p>
                  <p className={`text-sm ${ui.mutedText}`}>Every {nextZone.frequency_days} days</p>
                  <Link href="/life/cleaning" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}>
                    Open cleaning
                  </Link>
                </div>
              ) : (
                <div className="space-y-ds-2">
                  <p className="text-lg font-medium text-lifeos-fg">No cleaning zones yet</p>
                  <p className={`text-sm ${ui.mutedText}`}>Add zones to see them here.</p>
                  <Link href="/life/cleaning" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}>
                    Add a zone
                  </Link>
                </div>
              )}
            </div>

            <div className={cn("min-w-0 space-y-ds-2", domain.finance, "rounded-ds-input p-ds-3")}>
              <p className="text-lifeos-caption font-medium text-lifeos-success">Finances</p>
              <div className="space-y-ds-3">
                <div>
                  <p className={`text-sm ${ui.mutedText}`}>Today balance</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-lifeos-fg">
                    {financeToday ? formatSignedEur(financeToday.balance_delta) : "-"}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${ui.mutedText}`}>Monthly balance</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-lifeos-fg">
                    {financeMonth ? formatSignedEur(financeMonth.balance_delta) : "-"}
                  </p>
                </div>
                <p className={`text-xs ${ui.mutedText}`}>
                  Full-month totals from the server (all transactions in your local calendar day/month).
                </p>
                <Link href="/finance/dashboard" className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}>
                  Open finance
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {tab === "daily-plan" ? (
      <section className={ds.surfaces.contentPanelCompact}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lifeos-section font-semibold tracking-tight text-lifeos-fg">Today</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>A short checklist from your day.</p>
          </div>
        </div>

        {dailyPlanItems.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {dailyPlanItems.map((item) => (
              <li key={item.id}>
                <label
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl px-4 py-3 transition-colors md:px-5 md:py-4 ${
                    item.completed
                      ? "bg-lifeos-page/70 opacity-75"
                      : "bg-lifeos-muted/35 shadow-inner hover:bg-lifeos-hover/35"
                  }`}
                >
                  <input
                    checked={item.completed}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-lifeos-border bg-lifeos-muted text-lifeos-accent accent-lifeos-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent/60"
                    onChange={() => toggleDailyPlanItem(item.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-base font-medium leading-snug ${
                        item.completed ? "text-lifeos-fg-muted line-through decoration-lifeos-border" : "text-lifeos-fg"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${nextActionPriorityClass(item.priority)}`}
                      >
                        {item.priority}
                      </span>
                      <span className="rounded-md bg-lifeos-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lifeos-accent shadow-sm">
                        {dailyPlanCategoryLabel(item.category)}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn("mt-4 flex gap-3 sm:items-center", ds.surfaces.toneWell)}>
            <ListTodo className="size-4 shrink-0 text-lifeos-fg-muted" strokeWidth={1.75} aria-hidden />
            <p className={`text-sm ${ui.mutedText}`}>
              <span className="font-medium text-lifeos-fg-secondary">Nothing here yet.</span> Add a task, spending, or a cleaning zone.
              The list updates as you go.
            </p>
          </div>
        )}
      </section>
      ) : null}

      {tab === "recommendations" ? (
      <>
      {automationPositiveInsights.length > 0 ? (
        <section className="mb-4 rounded-ds-card bg-lifeos-status-healthy-bg p-5 shadow-surface-secondary md:p-6">
          <h2 className="text-lifeos-card-title font-semibold tracking-tight text-lifeos-status-healthy">On track</h2>
          <ul className="mt-3 space-y-2">
            {automationPositiveInsights.map((insight, i) => (
              <li key={`insight-${i}`} className="text-sm leading-relaxed text-lifeos-fg">
                <p>{insight.message}</p>
                <WhyLine text={insight.explanation} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {automationRiskSignals.length > 0 ? (
        <section className={cn("mb-4", ds.surfaces.contentPanelCompact)}>
          <h2 className="text-lifeos-card-title font-semibold tracking-tight text-lifeos-fg">Goals behind</h2>
          <p className={`mt-1 text-sm ${ui.mutedText}`}>When weekly or monthly goals slip.</p>
          <ul className="mt-4 space-y-2">
            {automationRiskSignals.map((sig) => (
              <li
                key={sig.id}
                className={`rounded-lg px-3 py-2.5 text-sm text-lifeos-fg ${riskSeverityShell(sig.severity)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{sig.message}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-lifeos-fg-muted">
                    {riskSeverityLabel(sig.severity)}
                  </span>
                </div>
                <WhyLine text={sig.explanation} />
                <p className={`mt-1 text-xs tabular-nums ${ui.mutedText}`} suppressHydrationWarning>
                  {formatDateTimeFiNumeric(sig.detectedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={ds.surfaces.contentPanelCompact}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lifeos-section font-semibold tracking-tight text-lifeos-fg">Next steps</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>Based on what you&apos;ve logged.</p>
          </div>
        </div>

        {nextActions.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {nextActions.map((action) => (
              <li key={action.id}>
                <RecommendationActionCard
                  action={action}
                  busy={recActionBusy === action.id}
                  mutedTextClass={ui.mutedText}
                  formatDateTimeFiNumeric={formatDateTimeFiNumeric}
                  nextActionCategoryLabel={nextActionCategoryLabel}
                  nextActionPriorityClass={nextActionPriorityClass}
                  onDismiss={() => void submitRecFeedback(action.id, "dismissed")}
                  onImplicitIgnore={() => void submitRecFeedback(action.id, "ignored")}
                  onPrimary={() => runRecommendationPrimaryAction(action)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className={cn("mt-4", ds.surfaces.toneWell)}>
            <p className={`text-sm ${ui.mutedText}`}>
              <span className="font-medium text-lifeos-fg-secondary">Nothing urgent.</span> You&apos;re in range. Check back later.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <div className={cn("rounded-ds-card bg-lifeos-elevated p-ds-6 shadow-surface-secondary md:p-ds-7", domain.ai)}>
          <div className="flex flex-col gap-ds-6 md:flex-row md:items-center md:justify-between md:gap-ds-8">
            <div className="min-w-0">
              <h2 className="mt-ds-3 text-lifeos-card-title font-semibold tracking-tight text-lifeos-fg">Today&apos;s review</h2>
              <p className="mt-4 text-sm leading-relaxed text-lifeos-fg-muted">One note per day. Older days live in History.</p>
            </div>
            <Link
              href="/insights/ai-reviews"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex shrink-0 md:self-center")}
            >
              History
            </Link>
          </div>

          {dailyReviewError && (
            <p className="mt-4 rounded-ds-card bg-lifeos-danger-muted/22 px-3 py-2 text-sm text-lifeos-danger shadow-inner">
              {dailyReviewError}. Retry when you are online.
            </p>
          )}

          {dailyReview?.from_storage && !dailyReviewError && (
            <p className="mt-4 rounded-lg bg-lifeos-muted/80 px-3 py-2 text-sm text-lifeos-fg-secondary">
              Saved for today. Run again to refresh.
            </p>
          )}

          {dailyReview?.fallback && !dailyReviewError && (
            <p className="mt-4 rounded-lg bg-lifeos-warning-muted/15 px-3 py-2 text-sm text-lifeos-warning">
              Using a simple on-device version for now.
            </p>
          )}

          {dailyReviewLoading && !dailyReview && (
            <div className="mt-ds-6">
              <PageSectionSkeleton />
            </div>
          )}

          {dailyReview && (
            <div className="mt-ds-6 space-y-ds-6">
              <div className="rounded-ds-card bg-lifeos-inset/70 px-ds-5 py-ds-5 md:px-ds-6 md:py-ds-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <h3 className="text-base font-semibold text-lifeos-accent">{dailyReview.title}</h3>
                  <Button
                    variant="secondary"
                    size="md"
                    className="shrink-0 self-start sm:self-center"
                    disabled={dailyReviewLoading}
                    onClick={() => void generateDailyReview(true)}
                    type="button"
                  >
                    Refresh
                  </Button>
                </div>
                <p className={`mt-ds-4 text-sm leading-relaxed text-lifeos-fg`}>{dailyReview.summary}</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <h4 className="text-lifeos-caption font-medium text-lifeos-fg-muted">What went well</h4>
                  <ul className="mt-2 space-y-2">
                    {dailyReview.wins.map((line, i) => (
                      <li
                        key={`win-${i}-${line.slice(0, 24)}`}
                        className="rounded-lg bg-lifeos-status-healthy-bg/80 px-3 py-2 text-sm text-lifeos-status-healthy"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-lifeos-caption font-medium text-lifeos-fg-muted">Needs attention</h4>
                  <ul className="mt-2 space-y-2">
                    {dailyReview.concerns.map((line, i) => (
                      <li
                        key={`concern-${i}-${line.slice(0, 24)}`}
                        className="rounded-lg bg-lifeos-warning-muted/15 px-3 py-2 text-sm text-lifeos-warning"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="text-lifeos-caption font-medium text-lifeos-fg-muted">Tomorrow</h4>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-lifeos-fg">
                  {dailyReview.tomorrowPlan.map((line, i) => (
                    <li key={`tm-${i}-${line.slice(0, 24)}`} className="leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {!dailyReview && !dailyReviewLoading && !dailyReviewError && (
            <div className="mt-ds-6 flex flex-col gap-5 rounded-ds-card bg-lifeos-inset/90 px-8 py-8 shadow-inner sm:flex-row sm:items-start md:px-10 md:py-8">
              <Sparkles className="size-10 shrink-0 text-lifeos-accent/25 motion-safe:animate-lifeos-soft-in" strokeWidth={1.25} aria-hidden />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-lifeos-section font-semibold text-lifeos-fg">Today&apos;s review</p>
                <p className={`mt-4 max-w-md text-lifeos-body leading-relaxed ${ui.mutedText}`}>
                  A short recap from tasks, focus, money, and home.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  className="mt-5 w-fit"
                  disabled={dailyReviewLoading}
                  onClick={() => void generateDailyReview(false)}
                  type="button"
                >
                  Run review
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className={ds.surfaces.contentPanelCompact}>
          <h2 className="text-lifeos-card-title font-semibold tracking-tight text-lifeos-fg">Shortcuts</h2>
          <div className="mt-3 grid gap-2.5">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-fit"
              onClick={onStartFocusFromQuickAction}
              type="button"
              disabled={startingFocus}
            >
              {startingFocus ? "Starting..." : "Start focus session"}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-fit"
              onClick={() => router.push("/work/tasks")}
              type="button"
            >
              Open tasks
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-fit"
              onClick={() => router.push("/finance/dashboard")}
              type="button"
            >
              Open finances
            </Button>
          </div>
        </div>
      </section>
      </>
      ) : null}

      {tab === "notifications" ? (
      <DashboardNotificationsSection
        expensesTodayTotal={financeToday?.expense_total ?? 0}
        focusSessions={focusSessions}
        onRefresh={() => refreshRecommendationDrivers()}
        tasks={commandTasks}
        zones={commandZones}
      />
      ) : null}

      {tab === "overview" ? (
      <div className="flex flex-col gap-ds-6">
      <Surface variant="hero">
        <div className={dashboard.heroStack}>
          <PageTitle>Control Center</PageTitle>
          <MutedText className={ds.typography.proseMax}>See what matters and what to do next.</MutedText>
        </div>
      </Surface>

      <Surface variant="secondary">
        <SectionHeader
          title="Current state"
          description="Focus, home, finances, and energy today."
        />
        <div className="mt-ds-7 grid grid-cols-2 gap-ds-3 lg:grid-cols-4">
          {todayStateRows.map((row) => {
            const st = systemStatusToneStyles(row.tone);
            return (
              <div
                key={row.key}
                className={`px-ds-4 py-ds-4 transition duration-200 hover:-translate-y-px ${st.shell}`}
              >
                <div className="flex items-center justify-between gap-ds-2">
                  <span className="flex min-w-0 items-center gap-ds-2">
                    <span className={st.glow}>
                      <TodayStateIcon rowKey={row.key} />
                    </span>
                    <span className="truncate text-sm font-medium text-lifeos-fg-secondary">{row.title}</span>
                  </span>
                  <span className={`shrink-0 ${st.badge}`}>{row.statusLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface variant="primary">
        <SectionHeader
          title="What to do next"
          description="One suggestion."
          action={
            <Link
              href="/dashboard/recommendations"
              className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}
            >
              View all
            </Link>
          }
        />

        <div className="mt-ds-8">
          {primaryNextAction ? (
            <RecommendationActionCard
              action={primaryNextAction}
              busy={recActionBusy === primaryNextAction.id}
              layout="featured"
              mutedTextClass={ui.mutedText}
              formatDateTimeFiNumeric={formatDateTimeFiNumeric}
              nextActionCategoryLabel={nextActionCategoryLabel}
              nextActionPriorityClass={nextActionPriorityClass}
              onDismiss={() => void submitRecFeedback(primaryNextAction.id, "dismissed")}
              onImplicitIgnore={() => void submitRecFeedback(primaryNextAction.id, "ignored")}
              onPrimary={() => runRecommendationPrimaryAction(primaryNextAction)}
            />
          ) : (
            <Surface variant="inset">
              <p className="text-lifeos-section font-semibold text-lifeos-fg">You&apos;re in good shape</p>
              <p className={`mt-ds-3 text-lifeos-body ${ui.mutedText}`}>
                Nothing urgent. Check in later today.
              </p>
            </Surface>
          )}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-ds-6 lg:grid-cols-2 lg:gap-ds-8">
        <Surface variant="secondary">
          <SectionHeader
            label="Today"
            title="Your plan"
            description="Up to five steps."
            action={
              <Link
                href="/dashboard/daily-plan"
                className={cn(buttonVariants({ variant: "secondary", size: "md" }), "inline-flex")}
              >
                Open list
              </Link>
            }
          />

          {overviewDailyPlanItems.length > 0 ? (
            <ul className="mt-ds-6 space-y-ds-3">
              {overviewDailyPlanItems.map((item) => (
                <li key={item.id}>
                  <label
                    className={`flex min-h-[44px] cursor-pointer items-start gap-ds-3 rounded-ds-input px-ds-4 py-ds-3 transition-colors md:py-ds-4 ${
                      item.completed
                        ? "bg-lifeos-page/70 opacity-75 shadow-inner"
                        : "bg-lifeos-muted/30 shadow-inner hover:bg-lifeos-hover/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleDailyPlanItem(item.id)}
                      className="mt-1 size-4 shrink-0 rounded border-lifeos-border bg-transparent accent-lifeos-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-lifeos-body font-medium ${
                          item.completed ? "text-lifeos-fg-muted line-through decoration-lifeos-border" : "text-lifeos-fg"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-ds-2 text-lifeos-caption text-lifeos-fg-muted">
                        {dailyPlanCategoryLabel(item.category)} · <span className="capitalize">{item.priority}</span> priority
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <Surface variant="inset" className="mt-ds-6 flex gap-ds-4 sm:items-center">
              <ListTodo className="size-5 shrink-0 text-lifeos-fg-muted" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="font-semibold text-lifeos-card-title text-lifeos-fg">Your plan shows up here</p>
                <p className={`mt-ds-2 text-lifeos-body ${ui.mutedText}`}>
                  Add tasks, zones, or spending. We build this from what you log.
                </p>
              </div>
            </Surface>
          )}
        </Surface>

        <Surface variant="primary" className="bg-lifeos-domain-risk/20 shadow-inner">
          <SectionHeader
            title="Needs attention"
            description="Medium and high items from the last two weeks."
          />

          {importantRiskSignals.length === 0 ? (
            <Surface variant="inset" className="mt-ds-6">
              <p className="font-semibold text-lifeos-card-title text-lifeos-fg">All clear for now</p>
              <p className={`mt-ds-2 text-lifeos-body ${ui.mutedText}`}>
                Nothing to flag yet. Keep logging tasks, focus, and money.
              </p>
            </Surface>
          ) : (
            <ul className="mt-ds-6 space-y-ds-3">
              {importantRiskSignals.slice(0, 5).map((r) => (
                <li key={`${r.id}-${r.detectedAt}`} className={`rounded-ds-input px-ds-4 py-ds-3 md:px-ds-5 md:py-ds-4 ${riskSeverityShell(r.severity)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-ds-2">
                    <span className="text-sm font-medium text-lifeos-fg-secondary">{r.category}</span>
                    <span
                      className={`text-lifeos-caption font-medium ${
                        r.severity === "high" ? "text-lifeos-status-risk" : "text-lifeos-warning"
                      }`}
                    >
                      {riskSeverityLabel(r.severity)}
                    </span>
                  </div>
                  <p className="mt-ds-2 text-lifeos-body leading-snug text-lifeos-fg">{r.message}</p>
                  <WhyLine text={r.explanation ?? ""} />
                </li>
              ))}
            </ul>
          )}
          {importantRiskSignals.length > 5 ? (
            <p className={`mt-ds-4 text-lifeos-caption ${ui.mutedText}`}>
              +{importantRiskSignals.length - 5} more in Insights.
            </p>
          ) : null}
        </Surface>
      </div>

      <Surface variant="primary">
        <SectionHeader
          title="Today&apos;s review"
          description="Short recap from your day. Same view under Suggestions."
          action={
            <Link
              href="/dashboard/recommendations"
              className={cn(buttonVariants({ variant: "ghost", size: "md" }), "inline-flex md:self-center")}
            >
              Open
            </Link>
          }
        />

        {dailyReviewError ? (
          <p className="mt-ds-6 text-lifeos-body text-lifeos-danger">{dailyReviewError}</p>
        ) : null}

        {dailyReview?.from_storage && !dailyReviewError ? (
          <p className={`mt-ds-6 text-lifeos-caption ${ui.mutedText}`}>Saved earlier today.</p>
        ) : null}

        {dailyReview?.fallback && !dailyReviewError ? (
          <p className="mt-ds-6 text-lifeos-body text-lifeos-warning">Simple local version for now.</p>
        ) : null}

        {dailyReviewLoading && !dailyReview && (
          <div className="mt-ds-6">
            <PageSectionSkeleton />
          </div>
        )}

        {dailyReview ? (
          <Surface variant="inset" className="mt-ds-6">
            <h3 className="text-lifeos-card-title font-semibold text-lifeos-accent">{dailyReview.title}</h3>
            <p className={`mt-ds-4 text-lifeos-body leading-relaxed text-lifeos-fg`}>
              {dailyReview.summary.length > 320 ? `${dailyReview.summary.slice(0, 320).trimEnd()}…` : dailyReview.summary}
            </p>
          </Surface>
        ) : null}

        {!dailyReview && !dailyReviewLoading && !dailyReviewError ? (
          <Surface variant="inset" className="mt-ds-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <Sparkles className="size-10 shrink-0 text-lifeos-accent/25 motion-safe:animate-lifeos-soft-in sm:mt-0.5" strokeWidth={1.25} aria-hidden />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-lifeos-section font-semibold text-lifeos-fg">Today&apos;s review</p>
              <p className={`mt-3 max-w-md text-lifeos-body leading-relaxed ${ui.mutedText}`}>
                What went well, what slowed you down, and what to watch. From what you already logged.
              </p>
              <Button
                variant="primary"
                size="lg"
                className="mt-4 w-fit"
                disabled={dailyReviewLoading}
                onClick={() => void generateDailyReview(false)}
                type="button"
              >
                Run review
              </Button>
            </div>
          </Surface>
        ) : null}
      </Surface>

      <Surface variant="secondary" className="bg-lifeos-muted/25 !px-5 !py-3.5 !shadow-inner md:!px-6 md:!py-3.5">
        <div className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 text-sm leading-snug text-lifeos-fg-muted md:max-w-xl md:text-lifeos-body">
            Recent activity: tasks, focus, spending, home.
          </p>
          <Link
            href="/insights/activity"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex shrink-0")}
          >
            Activity log
          </Link>
        </div>
      </Surface>
      </div>
      ) : null}

      </div>
    </div>
  );
}

