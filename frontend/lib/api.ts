export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type EventType =
  | "work_started"
  | "focus_started"
  | "focus_ended"
  | "pomodoro_completed"
  | "task_completed"
  | "income_added"
  | "expense_added"
  | "cleaning_done";

export type EventItem = {
  id: string;
  type: EventType;
  source: "web" | "iot" | "system";
  payload: Record<string, unknown>;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type TaskItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
};

export type DailySummary = {
  date: string;
  events_total: number;
  tasks_created: number;
  tasks_in_progress: number;
  tasks_completed: number;
  pomodoros_completed: number;
  income_added: number;
  expenses_added: number;
  cleanings_done: number;
  income_total: number;
  expense_total: number;
  balance_delta: number;
};

export type FinanceKind = "income" | "expense";

export type FinanceTransaction = {
  id: string;
  kind: FinanceKind;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
};

export type CleaningStatus = "ok" | "soon" | "overdue";

export type CleaningZone = {
  id: string;
  name: string;
  frequency_days: number;
  last_cleaned_at: string | null;
  status: CleaningStatus;
  created_at: string;
};

export type FocusSession = {
  id: string;
  label: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
};

export type DailyInsight = {
  date: string;
  headline: string;
  summary: string;
  recommendations: string[];
};

export type PomodoroSession = {
  id: string;
  label: string | null;
  work_minutes: number;
  break_minutes: number;
  status: string;
  started_at: string;
  ended_at: string | null;
};
