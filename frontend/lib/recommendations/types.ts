export type RecommendationCategory = "productivity" | "cleaning" | "tasks" | "finance";

export type RecommendationPriority = "high" | "medium" | "low";

/** Primary CTA wired on the dashboard (API calls or navigation). */
export type RecommendationPrimaryAction =
  | { kind: "cleaning_mark_done"; zoneId: string; buttonLabel: string }
  | { kind: "focus_start"; buttonLabel: string }
  | { kind: "navigate"; href: string; buttonLabel: string }
  | { kind: "task_open"; taskId: string | null; buttonLabel: string };

/** Rule-based next action for the dashboard (separate from AI / insight copy). */
export type NextActionRecommendation = {
  /** Stable id for React keys */
  id: string;
  type: RecommendationCategory;
  priority: RecommendationPriority;
  message: string;
  /** When this recommendation object was produced (ISO-8601). */
  generatedAt: string;
  /** Leading symbol for UI (emoji). */
  icon: string;
  /** Optional actionable control; omit when there is no safe default (should be rare). */
  primaryAction?: RecommendationPrimaryAction;
};
