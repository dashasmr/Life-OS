export type DailyPlanCategory = "task" | "focus" | "cleaning" | "finance";

export type DailyPlanPriority = "high" | "medium" | "low";

export type DailyPlanItem = {
  id: string;
  title: string;
  category: DailyPlanCategory;
  priority: DailyPlanPriority;
  completed: boolean;
};
