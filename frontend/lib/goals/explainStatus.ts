import { formatGoalValue } from "@/lib/goals";
import type { Goal } from "@/lib/goals/types";

/** Plain-language reason for the goal row status (computed next to domain logic). */
export function explainGoalStatus(goal: Goal): string {
  const ratio = goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
  const pctProgress = Math.round(Math.min(100, ratio * 100));

  if (goal.status === "completed") {
    return `Current progress (${formatGoalValue(goal.currentValue, goal.unit)} vs ${formatGoalValue(goal.targetValue, goal.unit)}) meets or exceeds the target for this ${goal.period} window.`;
  }
  if (goal.status === "at_risk") {
    return `You're at about ${pctProgress}% of this ${goal.period} goal’s target — pace is behind what’s usually needed to finish on time in the remaining window.`;
  }
  return `You're at about ${pctProgress}% of this ${goal.period} goal with time still left in the window — progress looks on track.`;
}
