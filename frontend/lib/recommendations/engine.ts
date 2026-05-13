import type { AdaptiveContext, CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import type { Goal } from "@/lib/goals/types";
import { applyAdaptiveRecommendations } from "@/lib/recommendations/adaptiveApply";
import { runAutomationEngine } from "@/services/automation/engine";
import type { AutomationContext, AutomationPositiveInsight, AutomationRiskSignal } from "@/services/automation/types";
import type { NextActionRecommendation, RecommendationPriority } from "@/lib/recommendations/types";

export type TodayAutomationStats = {
  tasksCompleted: number;
  focusMinutes: number;
};

export type RecommendationsEngineInput = {
  focusSessions: FocusSession[];
  cleaningZones: CleaningZone[];
  tasks: TaskItem[];
  /** Sum of expense transactions for the local calendar day (from finance range API). */
  expensesTodayTotal: number;
  /** Total events for the analytics day (daily summary). Omit until loaded to avoid false “quiet log” from partial event fetches. */
  dailyEventsTotal?: number | null;
  /** When loaded (e.g. Overview), drives goal-at-risk automations. */
  goals?: Goal[] | null;
  /** Event-sourced KPIs for the local day; enables strong-day insight when present. */
  todayStats?: TodayAutomationStats | null;
  /** Server-built tuning from recommendation feedback (GET /recommendations/adaptive-context). */
  adaptiveContext?: AdaptiveContext | null;
  now?: Date;
};

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1
};

function toAutomationContext(input: RecommendationsEngineInput): AutomationContext {
  const now = input.now ?? new Date();
  return {
    cleaningZones: input.cleaningZones,
    focusSessions: input.focusSessions,
    tasks: input.tasks,
    expensesTodayTotal: input.expensesTodayTotal,
    dailyEventsTotal: input.dailyEventsTotal,
    goals: input.goals?.map((g) => ({
      id: g.id,
      title: g.title,
      status: g.status,
      period: g.period,
      category: g.category,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      unit: g.unit
    })),
    todayTasksCompleted: input.todayStats?.tasksCompleted,
    todayFocusMinutes: input.todayStats?.focusMinutes,
    now
  };
}

export type RecommendationsAutomationResult = {
  recommendations: NextActionRecommendation[];
  automationRiskSignals: AutomationRiskSignal[];
  positiveInsights: AutomationPositiveInsight[];
};

/**
 * Full recommendations-tab automation output (next actions + goal risk + positive insights).
 */
export function runRecommendationsAutomation(input: RecommendationsEngineInput): RecommendationsAutomationResult {
  const sink = runAutomationEngine(toAutomationContext(input));
  const now = input.now ?? new Date();
  let recommendations = [...sink.recommendations].sort(
    (a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
  );
  recommendations = applyAdaptiveRecommendations(recommendations, input.adaptiveContext ?? undefined, now);
  return {
    recommendations,
    automationRiskSignals: sink.automationRiskSignals,
    positiveInsights: sink.positiveInsights
  };
}

/**
 * Rule-based "what should I do next?" suggestions. Sorted by priority (high first).
 */
export function generateNextActions(input: RecommendationsEngineInput): NextActionRecommendation[] {
  return runRecommendationsAutomation(input).recommendations;
}
