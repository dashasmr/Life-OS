import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { pickTopPriorityTask } from "@/lib/commandCenter";
import { hasFocusTouchToday } from "@/lib/systemStatus";
import { HIGH_SPENDING_EUR_THRESHOLD } from "@/services/insights";
import type { NextActionRecommendation, RecommendationPriority } from "@/lib/recommendations/types";

export type RecommendationsEngineInput = {
  focusSessions: FocusSession[];
  cleaningZones: CleaningZone[];
  tasks: TaskItem[];
  /** Sum of expense transactions for the local calendar day (from finance range API). */
  expensesTodayTotal: number;
  /** Total events for the analytics day (daily summary). Omit until loaded to avoid false “quiet log” from partial event fetches. */
  dailyEventsTotal?: number | null;
  now?: Date;
};

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1
};

/**
 * Rule-based "what should I do next?" suggestions. Sorted by priority (high first).
 */
export function generateNextActions(input: RecommendationsEngineInput): NextActionRecommendation[] {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const out: NextActionRecommendation[] = [];

  if (!hasFocusTouchToday(input.focusSessions, now)) {
    out.push({
      id: "action-focus-start",
      type: "productivity",
      priority: "high",
      message: "Start a focus session.",
      generatedAt,
      icon: "🔥",
      primaryAction: { kind: "focus_start", buttonLabel: "Start focus" }
    });
  }

  const overdue = input.cleaningZones.filter((z) => z.status === "overdue");
  if (overdue.length > 0) {
    const desk = overdue.find((z) => z.name.toLowerCase().includes("desk"));
    const target = desk ?? overdue[0];
    const message = desk ? "Clean your desk today." : `Clean “${target.name.trim() || "overdue zone"}” today.`;
    out.push({
      id: `action-cleaning-${target.id}`,
      type: "cleaning",
      priority: "high",
      message,
      generatedAt,
      icon: "⚠️",
      primaryAction: { kind: "cleaning_mark_done", zoneId: target.id, buttonLabel: "Mark as cleaned" }
    });
  }

  const topHigh = pickTopPriorityTask(input.tasks, now);
  if (topHigh) {
    out.push({
      id: "action-high-priority-task",
      type: "tasks",
      priority: "high",
      message: "Complete your high priority task.",
      generatedAt,
      icon: "🎯",
      primaryAction: { kind: "task_open", taskId: topHigh.id, buttonLabel: "Open task" }
    });
  }

  if (input.expensesTodayTotal > HIGH_SPENDING_EUR_THRESHOLD) {
    out.push({
      id: "action-finance-review",
      type: "finance",
      priority: "medium",
      message: "Review today's spending.",
      generatedAt,
      icon: "💰",
      primaryAction: { kind: "navigate", href: "/finance/dashboard", buttonLabel: "Open finance" }
    });
  }

  if (input.dailyEventsTotal === 0 && now.getHours() >= 10) {
    out.push({
      id: "action-log-activity",
      type: "productivity",
      priority: "low",
      message: "Your day log is quiet — capture one meaningful action (task, expense, or focus).",
      generatedAt,
      icon: "📝",
      primaryAction: { kind: "navigate", href: "/work/tasks", buttonLabel: "Open tasks" }
    });
  }

  out.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
  return out;
}
