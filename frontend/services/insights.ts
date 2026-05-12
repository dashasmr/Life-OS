import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { isTaskOverdue } from "@/lib/commandCenter";

/** Daily expense total above this (EUR) triggers a finance insight. */
export const HIGH_SPENDING_EUR_THRESHOLD = 100;

export type InsightCategory = "productivity" | "cleaning" | "finance" | "tasks";

export type RuleInsight = {
  id: string;
  category: InsightCategory;
  message: string;
};

export type RuleInsightInput = {
  focusSessions: FocusSession[];
  cleaningZones: CleaningZone[];
  /** Total expenses for "today" in local calendar (use API aggregate when available). */
  expensesTodayTotal: number;
  tasks: TaskItem[];
  now?: Date;
};

const MAX_INSIGHTS = 3;

function sameLocalDay(iso: string, ref: Date): boolean {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return (
    t.getFullYear() === ref.getFullYear() && t.getMonth() === ref.getMonth() && t.getDate() === ref.getDate()
  );
}

function hasFocusSessionStartedToday(sessions: FocusSession[], now: Date): boolean {
  return sessions.some((s) => sameLocalDay(s.started_at, now));
}

function firstOverdueZone(zones: CleaningZone[]): CleaningZone | undefined {
  return zones.find((z) => z.status === "overdue");
}

function hasHighPriorityOverdueTask(tasks: TaskItem[], now: Date): boolean {
  return tasks.some(
    (t) => t.priority === "high" && t.status !== "done" && isTaskOverdue(t.due_date, t.status, now)
  );
}

/**
 * Rule-based dashboard insights (no LLM). Evaluates input data and returns up to MAX_INSIGHTS items.
 * Order: cleaning → finance → productivity → tasks (first wins when capped).
 */
export function generateRuleInsights(input: RuleInsightInput): RuleInsight[] {
  const now = input.now ?? new Date();
  const out: RuleInsight[] = [];

  const overdue = firstOverdueZone(input.cleaningZones);
  if (overdue) {
    const name = overdue.name.trim() || "A zone";
    out.push({
      id: `cleaning-overdue-${overdue.id}`,
      category: "cleaning",
      message: `${name} is overdue.`
    });
  }

  if (input.expensesTodayTotal > HIGH_SPENDING_EUR_THRESHOLD) {
    out.push({
      id: "finance-high-spending-today",
      category: "finance",
      message: "High spending detected today."
    });
  }

  if (!hasFocusSessionStartedToday(input.focusSessions, now)) {
    out.push({
      id: "productivity-no-focus-today",
      category: "productivity",
      message: "No focus sessions detected today."
    });
  }

  if (hasHighPriorityOverdueTask(input.tasks, now)) {
    out.push({
      id: "tasks-high-priority-overdue",
      category: "tasks",
      message: "High-priority tasks are overdue."
    });
  }

  return out.slice(0, MAX_INSIGHTS);
}
