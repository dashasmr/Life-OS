/**
 * Builds a single JSON-friendly snapshot for downstream LLM or batch jobs.
 *
 * Data flow (no React): normalized events → analytics (`computeDailyStats`) → this module → prompt / API.
 * Callers fetch domain data elsewhere; this file only merges and shapes it.
 */
import type { CleaningZone, DailyInsight, EventItem, FinanceRangeSummary, FocusSession, TaskItem } from "@/lib/api";
import { computeDailyStats, filterEventsOnLocalDay } from "@/lib/analytics/fromEvents";
import { normalizeAnalyticsEvents } from "@/lib/analytics/normalize";
import type { DailyStats } from "@/lib/analytics/types";
import { localCalendarDayKeyFromDate } from "@/lib/datetime";
import { generateNextActions } from "@/lib/recommendations";
import { computeSystemStatus } from "@/lib/systemStatus";
import { generateRuleInsights } from "@/services/insights";
import { getResolvedUserPreferences } from "@/services/preferences";
import { mapEventToTimelineCopy } from "@/lib/timeline/eventLabels";

const PRIORITY_RANK: Record<TaskItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2
};

export type DailyAIContextSystemPillar = {
  key: string;
  title: string;
  statusLabel: string;
  tone: string;
};

export type DailyAIContextRecommendation = {
  source: "next_action" | "ai_daily";
  id?: string;
  priority?: string;
  category?: string;
  message: string;
  explanation?: string;
};

export type DailyAIContextRuleInsight = {
  id: string;
  category: string;
  message: string;
  explanation?: string;
};

export type DailyAIContextTimelineLine = {
  /** ISO-8601 timestamp from the event row. */
  at: string;
  type: string;
  headline: string;
  detail: string | null;
};

export type DailyAIContextTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
};

export type DailyAIContextCleaningZone = {
  id: string;
  name: string;
  status: string;
  frequency_days: number;
};

export type DailyAIContextFinance = {
  income_total: number;
  expense_total: number;
  balance_delta: number;
};

/**
 * Stable contract for prompts, logging, or future `POST /ai/daily-summary` bodies.
 */
export type DailyAIContext = {
  date: string;
  dailyStats: DailyStats;
  systemStatus: DailyAIContextSystemPillar[];
  recommendations: DailyAIContextRecommendation[];
  insights: DailyAIContextRuleInsight[];
  timelineSummary: DailyAIContextTimelineLine[];
  topTasks: DailyAIContextTask[];
  overdueCleaningZones: DailyAIContextCleaningZone[];
  financeSummary: DailyAIContextFinance | null;
};

export type BuildDailyAIContextParams = {
  /** Raw or normalized event list (non-user types are stripped). */
  events: EventItem[] | Array<Omit<EventItem, "type"> & { type: string }>;
  tasks: TaskItem[];
  cleaningZones: CleaningZone[];
  focusSessions: FocusSession[];
  /** Local-calendar day totals from the finance API (or null if unavailable). */
  financeToday: FinanceRangeSummary | null;
  /** Used for the finance pillar in system status; defaults to null → neutral pillar. */
  financeMonth?: FinanceRangeSummary | null;
  /** Optional LLM block from `/analytics/daily-insight` — text suggestions only, merged into `recommendations`. */
  dailyInsight?: DailyInsight | null;
  /** Anchor for "today" and sorting; defaults to `new Date()`. */
  now?: Date;
  /** Cap how many timeline rows we attach (newest first after sort). */
  timelineLimit?: number;
  /** How many open tasks to surface for prioritization hints. */
  topTasksLimit?: number;
};

function normalizeEventInput(events: BuildDailyAIContextParams["events"]): EventItem[] {
  return normalizeAnalyticsEvents(events as Array<Omit<EventItem, "type"> & { type: string }>);
}

function selectTopOpenTasks(tasks: TaskItem[], now: Date, limit: number): DailyAIContextTask[] {
  const open = tasks.filter((t) => t.status !== "done");
  const sorted = [...open].sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 99;
    const pb = PRIORITY_RANK[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return sorted.slice(0, limit).map((t) => ({
    id: t.id,
    title: t.title.trim() || "(untitled)",
    priority: t.priority,
    status: t.status,
    due_date: t.due_date
  }));
}

function buildTimelineSummary(events: EventItem[], dayKey: string, limit: number): DailyAIContextTimelineLine[] {
  const dayEvents = filterEventsOnLocalDay(events, dayKey);
  const withCopy = dayEvents.map((e) => {
    const { headline, detail } = mapEventToTimelineCopy(e);
    return { at: e.created_at, type: e.type, headline, detail };
  });
  withCopy.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return withCopy.slice(-limit);
}

/**
 * Pure builder: supply the same inputs you would load for the dashboard (tasks, zones, sessions, finance ranges).
 *
 * @example
 * ```ts
 * const ctx = buildDailyAIContext({ events, tasks, cleaningZones, focusSessions, financeToday, financeMonth });
 * console.log(JSON.stringify(ctx, null, 2));
 * ```
 */
export function buildDailyAIContext(params: BuildDailyAIContextParams): DailyAIContext {
  const now = params.now ?? new Date();
  const dayKey = localCalendarDayKeyFromDate(now);
  const events = normalizeEventInput(params.events);
  const dailyStats = computeDailyStats(events, dayKey);
  const timelineLimit = params.timelineLimit ?? 40;
  const topTasksLimit = params.topTasksLimit ?? 5;

  const financeMonth = params.financeMonth ?? null;
  const pillars = computeSystemStatus({
    tasksCompletedToday: dailyStats.tasksCompleted,
    focusSessions: params.focusSessions,
    cleaningZones: params.cleaningZones,
    monthlyBalanceDelta: financeMonth?.balance_delta ?? null,
    now
  });

  const systemStatus: DailyAIContextSystemPillar[] = pillars.map((p) => ({
    key: p.key,
    title: p.title,
    statusLabel: p.statusLabel,
    tone: p.tone
  }));

  const nextActions = generateNextActions({
    focusSessions: params.focusSessions,
    cleaningZones: params.cleaningZones,
    tasks: params.tasks,
    expensesTodayTotal: dailyStats.expensesTotal,
    dailyEventsTotal: filterEventsOnLocalDay(events, dayKey).length,
    now
  });

  const recommendations: DailyAIContextRecommendation[] = nextActions.map((a) => ({
    source: "next_action" as const,
    id: a.id,
    priority: a.priority,
    category: a.type,
    message: a.message,
    explanation: a.explanation
  }));

  if (params.dailyInsight?.recommendations?.length) {
    for (const text of params.dailyInsight.recommendations) {
      const trimmed = text.trim();
      if (trimmed) recommendations.push({ source: "ai_daily", message: trimmed });
    }
  }

  const ruleRows = generateRuleInsights({
    focusSessions: params.focusSessions,
    cleaningZones: params.cleaningZones,
    expensesTodayTotal: dailyStats.expensesTotal,
    tasks: params.tasks,
    now,
    dailySpendingLimitEur: getResolvedUserPreferences().dailySpendingLimit
  });
  const insights: DailyAIContextRuleInsight[] = ruleRows.map((r) => ({
    id: r.id,
    category: r.category,
    message: r.message,
    explanation: r.explanation
  }));

  const timelineSummary = buildTimelineSummary(events, dayKey, timelineLimit);
  const topTasks = selectTopOpenTasks(params.tasks, now, topTasksLimit);
  const overdueCleaningZones: DailyAIContextCleaningZone[] = params.cleaningZones
    .filter((z) => z.status === "overdue")
    .map((z) => ({
      id: z.id,
      name: z.name.trim() || "Zone",
      status: z.status,
      frequency_days: z.frequency_days
    }));

  const financeSummary: DailyAIContextFinance | null = params.financeToday
    ? {
        income_total: params.financeToday.income_total,
        expense_total: params.financeToday.expense_total,
        balance_delta: params.financeToday.balance_delta
      }
    : null;

  return {
    date: dayKey,
    dailyStats,
    systemStatus,
    recommendations,
    insights,
    timelineSummary,
    topTasks,
    overdueCleaningZones,
    financeSummary
  };
}
