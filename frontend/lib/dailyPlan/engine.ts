import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { pickTopPriorityTask } from "@/lib/commandCenter";
import { hasFocusTouchToday } from "@/lib/systemStatus";
import { getResolvedUserPreferences } from "@/services/preferences/storage";
import { isWithinPreferredWorkHours } from "@/services/preferences/workday";
import type { DailyPlanItem, DailyPlanPriority } from "@/lib/dailyPlan/types";

export type DailyPlanEngineInput = {
  tasks: TaskItem[];
  cleaningZones: CleaningZone[];
  focusSessions: FocusSession[];
  /** Sum of expense transactions for the local calendar day. */
  expensesTodayTotal: number;
  now?: Date;
};

const MAX_ITEMS = 5;
const MAX_TASK_ITEMS = 3;

function pickHighPriorityTasksInOrder(tasks: TaskItem[], now: Date, limit: number): TaskItem[] {
  const out: TaskItem[] = [];
  let pool = tasks.filter((t) => t.priority === "high" && t.status !== "done");
  while (out.length < limit && pool.length > 0) {
    const next = pickTopPriorityTask(pool, now);
    if (!next) break;
    out.push(next);
    pool = pool.filter((t) => t.id !== next.id);
  }
  return out;
}

function financePriority(expensesTodayTotal: number, limit: number): DailyPlanPriority | null {
  if (expensesTodayTotal > limit) return "medium";
  if (expensesTodayTotal > 0) return "low";
  return null;
}

/**
 * Builds 3–5 actionable rows for today from tasks, focus, cleaning, and finance signals.
 * `completed` is always false here; merge with client-side completion state in the UI.
 * Uses Settings → Personalization (spending limit, focus length, workday window).
 */
export function generateDailyPlan(input: DailyPlanEngineInput): DailyPlanItem[] {
  const now = input.now ?? new Date();
  const prefs = getResolvedUserPreferences();
  const focusLen = prefs.focusLengthMinutes;
  const spendLimit = prefs.dailySpendingLimit;
  const items: DailyPlanItem[] = [];

  const highTasks = pickHighPriorityTasksInOrder(input.tasks, now, MAX_TASK_ITEMS);
  for (const t of highTasks) {
    const title = t.title.trim();
    items.push({
      id: `plan-task-${t.id}`,
      title: title || "High priority task",
      category: "task",
      priority: "high",
      completed: false
    });
  }

  if (!hasFocusTouchToday(input.focusSessions, now) && isWithinPreferredWorkHours(now, prefs)) {
    items.push({
      id: "plan-focus-session",
      title: `Start a ${focusLen} min focus session`,
      category: "focus",
      priority: "high",
      completed: false
    });
  }

  const overdue = input.cleaningZones.filter((z) => z.status === "overdue");
  if (overdue.length > 0) {
    const desk = overdue.find((z) => z.name.toLowerCase().includes("desk"));
    const target = desk ?? overdue[0];
    const name = target.name.trim();
    const title = desk ? "Clean desk" : name ? `Clean ${name}` : "Clean overdue zone";
    items.push({
      id: `plan-cleaning-${target.id}`,
      title,
      category: "cleaning",
      priority: "high",
      completed: false
    });
  }

  const fp = financePriority(input.expensesTodayTotal, spendLimit);
  if (fp) {
    items.push({
      id: "plan-finance-review",
      title: "Review today's spending",
      category: "finance",
      priority: fp,
      completed: false
    });
  }

  return items.slice(0, MAX_ITEMS);
}
