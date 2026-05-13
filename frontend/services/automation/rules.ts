import { pickTopPriorityTask } from "@/lib/commandCenter";
import { computeHomeHealthScore } from "@/lib/cleaningHealth";
import type { GoalCategory } from "@/lib/goals/types";
import { hasFocusTouchToday } from "@/lib/systemStatus";
import type { AutomationContext, AutomationRule, AutomationSink } from "@/services/automation/types";
import type { NotificationDraft } from "@/services/notifications";
import type { RiskCategory } from "@/lib/risks/types";
import { getResolvedUserPreferences } from "@/services/preferences/storage";
import { isWithinPreferredWorkHours } from "@/services/preferences/workday";

function localDayStartIso(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function riskCategoryForGoal(category: GoalCategory): RiskCategory {
  if (category === "finance") return "finance";
  if (category === "home") return "environment";
  return "focus";
}

function goalProgressPct(g: { currentValue: number; targetValue: number }): number {
  if (g.targetValue <= 0) return 0;
  return Math.round(Math.min(100, (g.currentValue / g.targetValue) * 100));
}
const STRONG_DAY_MIN_TASKS = 5;
const STRONG_DAY_MIN_FOCUS_MINUTES = 45;
const STRONG_DAY_MIN_HOME_SCORE = 80;

/** 1. Overdue cleaning → notification */
const ruleOverdueCleaningNotification: AutomationRule = {
  id: "auto-overdue-cleaning-notification",
  name: "Overdue cleaning → notification",
  enabled: true,
  condition: (ctx) => ctx.cleaningZones.some((z) => z.status === "overdue"),
  action: (ctx, sink) => {
    const now = ctx.now;
    const created_at = localDayStartIso(now);
    const overdueZones = ctx.cleaningZones.filter((z) => z.status === "overdue");
    const deskOverdue = overdueZones.find((z) => z.name.toLowerCase().includes("desk"));
    let draft: NotificationDraft;
    if (deskOverdue) {
      draft = {
        id: "notif-cleaning-desk-overdue",
        type: "warning",
        category: "cleaning",
        title: "Desk cleaning overdue",
        message: `“${deskOverdue.name.trim() || "Desk"}” is past due — a quick reset helps focus.`,
        explanation:
          "This zone’s due window has passed based on when it was last marked cleaned and its configured frequency.",
        created_at,
        action: {
          label: "Mark as cleaned",
          type: "mutation",
          target: "cleaning_mark_done",
          payload: { zoneId: deskOverdue.id }
        }
      };
    } else {
      const z = overdueZones[0];
      draft = {
        id: "notif-cleaning-zone-overdue",
        type: "warning",
        category: "cleaning",
        title: "Cleaning overdue",
        message: `“${z.name.trim() || "A zone"}” needs attention.`,
        explanation:
          "At least one cleaning zone is overdue relative to its last clean date and how often you expect it done.",
        created_at,
        action: {
          label: "Mark as cleaned",
          type: "mutation",
          target: "cleaning_mark_done",
          payload: { zoneId: z.id }
        }
      };
    }
    sink.notifications.push(draft);
  }
};

/** 1b. Overdue cleaning → next-action recommendation (stable id for adaptive feedback). */
const ruleOverdueCleaningRecommendation: AutomationRule = {
  id: "auto-overdue-cleaning-recommendation",
  name: "Overdue cleaning → recommendation",
  enabled: true,
  condition: (ctx) => ctx.cleaningZones.some((z) => z.status === "overdue"),
  action: (ctx, sink) => {
    const overdueZones = ctx.cleaningZones.filter((z) => z.status === "overdue");
    const z = overdueZones[0]!;
    sink.recommendations.push({
      id: "action-cleaning-overdue",
      type: "cleaning",
      priority: "high",
      message: `Tend to “${z.name.trim() || "a cleaning zone"}” — it’s overdue.`,
      explanation:
        "This zone is past its expected window between cleans based on last done date and your frequency setting — quick win for home health.",
      generatedAt: ctx.now.toISOString(),
      icon: "🧹",
      primaryAction: { kind: "cleaning_mark_done", zoneId: z.id, buttonLabel: "Mark cleaned" }
    });
  }
};

/** 2. No focus today → recommendation */
const ruleNoFocusRecommendation: AutomationRule = {
  id: "auto-no-focus-recommendation",
  name: "No focus today → recommendation",
  enabled: true,
  condition: (ctx) => {
    const prefs = getResolvedUserPreferences();
    if (!isWithinPreferredWorkHours(ctx.now, prefs)) return false;
    return !hasFocusTouchToday(ctx.focusSessions, ctx.now);
  },
  action: (ctx, sink) => {
    sink.recommendations.push({
      id: "action-focus-start",
      type: "productivity",
      priority: "high",
      message: "Start a focus session.",
      explanation:
        "No focus activity was detected for today (local calendar day), and you’re inside your configured workday window.",
      generatedAt: ctx.now.toISOString(),
      icon: "🔥",
      primaryAction: { kind: "focus_start", buttonLabel: "Start focus" }
    });
  }
};

/** 3. Goal at risk → automation risk signal */
const ruleGoalAtRisk: AutomationRule = {
  id: "auto-goal-at-risk-signal",
  name: "Goal at risk → risk signal",
  enabled: true,
  condition: (ctx) => (ctx.goals ?? []).some((g) => g.status === "at_risk"),
  action: (ctx, sink) => {
    const detectedAt = ctx.now.toISOString();
    for (const g of ctx.goals ?? []) {
      if (g.status !== "at_risk") continue;
      sink.automationRiskSignals.push({
        id: `auto-goal-risk-${g.id}`,
        severity: "medium",
        category: riskCategoryForGoal(g.category),
        message: `Goal “${g.title.trim() || "Untitled"}” is at risk for this ${g.period} window — adjust pace or scope.`,
        explanation: `Only about ${goalProgressPct(g)}% progress toward this ${g.period} goal with limited time left in the window — status is marked at risk.`,
        detectedAt,
        source: "automation"
      });
    }
  }
};

/** 4. Strong productivity day → positive insight */
const ruleStrongProductivityInsight: AutomationRule = {
  id: "auto-strong-productivity-insight",
  name: "Strong productivity day → positive insight",
  enabled: true,
  condition: (ctx) => {
    const tasks = ctx.todayTasksCompleted;
    const focus = ctx.todayFocusMinutes;
    if (tasks === undefined || focus === undefined) return false;
    const home = computeHomeHealthScore(ctx.cleaningZones);
    const homeOk = home !== null && home.scorePercent >= STRONG_DAY_MIN_HOME_SCORE;
    return (
      tasks >= STRONG_DAY_MIN_TASKS &&
      focus >= STRONG_DAY_MIN_FOCUS_MINUTES &&
      homeOk
    );
  },
  action: (ctx, sink) => {
    sink.positiveInsights.push({
      message:
        "Strong day: you moved many tasks forward, logged solid focus time, and home care still looks healthy — keep this rhythm.",
      explanation: `Today’s event totals meet all checks: ≥${STRONG_DAY_MIN_TASKS} tasks completed, ≥${STRONG_DAY_MIN_FOCUS_MINUTES} focus minutes, and average home health ≥${STRONG_DAY_MIN_HOME_SCORE}% across zones.`
    });
  }
};

/** High-priority open task → notification */
const ruleHighPriorityTaskNotification: AutomationRule = {
  id: "auto-high-priority-task-notification",
  name: "High priority task → notification",
  enabled: true,
  condition: (ctx) => pickTopPriorityTask(ctx.tasks, ctx.now) !== null,
  action: (ctx, sink) => {
    const highTask = pickTopPriorityTask(ctx.tasks, ctx.now)!;
    sink.notifications.push({
      id: "notif-tasks-high-priority",
      type: "warning",
      category: "tasks",
      title: "High priority task still open",
      message: `“${highTask.title.trim() || "Task"}” is incomplete — consider doing it first.`,
      explanation:
        "Among open tasks, at least one is marked high priority — this notification highlights the top candidate to tackle next.",
      created_at: localDayStartIso(ctx.now),
      action: {
        label: "Open task",
        type: "navigate",
        target: `/work/tasks?highlight=${encodeURIComponent(highTask.id)}`
      }
    });
  }
};

/** High spending today → notification */
const ruleHighSpendNotification: AutomationRule = {
  id: "auto-high-spend-notification",
  name: "High spending → notification",
  enabled: true,
  condition: (ctx) => {
    const limit = getResolvedUserPreferences().dailySpendingLimit;
    return ctx.expensesTodayTotal > limit;
  },
  action: (ctx, sink) => {
    const limit = getResolvedUserPreferences().dailySpendingLimit;
    sink.notifications.push({
      id: "notif-finance-high-spend",
      type: "warning",
      category: "finance",
      title: "High spending detected today",
      message: `Today's expenses are above €${limit}. Review transactions when you can.`,
      explanation: `Today's expense total (€${ctx.expensesTodayTotal.toFixed(0)}) is above your personal daily spending limit (€${limit}) in Settings.`,
      created_at: localDayStartIso(ctx.now),
      action: {
        label: "Open finance",
        type: "navigate",
        target: "/finance/dashboard"
      }
    });
  }
};

/** High-priority task → recommendation */
const ruleHighPriorityTaskRecommendation: AutomationRule = {
  id: "auto-high-priority-task-recommendation",
  name: "High priority task → recommendation",
  enabled: true,
  condition: (ctx) => pickTopPriorityTask(ctx.tasks, ctx.now) !== null,
  action: (ctx, sink) => {
    const topHigh = pickTopPriorityTask(ctx.tasks, ctx.now)!;
    sink.recommendations.push({
      id: "action-high-priority-task",
      type: "tasks",
      priority: "high",
      message: "Complete your high priority task.",
      explanation:
        "There is at least one incomplete task marked high priority — finishing it first reduces overload elsewhere.",
      generatedAt: ctx.now.toISOString(),
      icon: "🎯",
      primaryAction: { kind: "task_open", taskId: topHigh.id, buttonLabel: "Open task" }
    });
  }
};

/** High spending → finance recommendation */
const ruleFinanceReviewRecommendation: AutomationRule = {
  id: "auto-finance-review-recommendation",
  name: "High spending → finance recommendation",
  enabled: true,
  condition: (ctx) => ctx.expensesTodayTotal > getResolvedUserPreferences().dailySpendingLimit,
  action: (ctx, sink) => {
    sink.recommendations.push({
      id: "action-finance-review",
      type: "finance",
      priority: "medium",
      message: "Review today's spending.",
      explanation: `Expense volume today exceeds your configured daily limit — worth a quick pass over transactions.`,
      generatedAt: ctx.now.toISOString(),
      icon: "💰",
      primaryAction: { kind: "navigate", href: "/finance/dashboard", buttonLabel: "Open finance" }
    });
  }
};

/** Quiet event log (after 10:00) → gentle logging recommendation */
const ruleQuietLogRecommendation: AutomationRule = {
  id: "auto-quiet-log-recommendation",
  name: "Quiet log → recommendation",
  enabled: true,
  condition: (ctx) => {
    const prefs = getResolvedUserPreferences();
    if (!isWithinPreferredWorkHours(ctx.now, prefs)) return false;
    return ctx.dailyEventsTotal === 0 && ctx.now.getHours() >= 10;
  },
  action: (ctx, sink) => {
    sink.recommendations.push({
      id: "action-log-activity",
      type: "productivity",
      priority: "low",
      message: "Your day log is quiet — capture one meaningful action (task, expense, or focus).",
      explanation:
        "After 10:00 local time, your activity event count for today is still zero while you’re within your workday — the log looks unusually empty.",
      generatedAt: ctx.now.toISOString(),
      icon: "📝",
      primaryAction: { kind: "navigate", href: "/work/tasks", buttonLabel: "Open tasks" }
    });
  }
};

/**
 * Order matters only for human readability; each rule guards its own condition.
 * Required assignment rules: 1–4 at the top; the rest preserve prior dashboard behaviour via the engine.
 */
export const AUTOMATION_RULES: AutomationRule[] = [
  ruleOverdueCleaningNotification,
  ruleOverdueCleaningRecommendation,
  ruleNoFocusRecommendation,
  ruleGoalAtRisk,
  ruleStrongProductivityInsight,
  ruleHighPriorityTaskNotification,
  ruleHighSpendNotification,
  ruleHighPriorityTaskRecommendation,
  ruleFinanceReviewRecommendation,
  ruleQuietLogRecommendation
];
