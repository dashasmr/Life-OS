import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { localCalendarDayKeyFromDate } from "@/lib/datetime";
import { runAutomationEngine } from "@/services/automation/engine";
import type { AutomationContext } from "@/services/automation/types";

export type NotificationSeverity = "warning" | "info" | "success";

export type NotificationCategory = "focus" | "cleaning" | "finance" | "tasks";

/** Known mutation targets for the notification center executor (not raw URLs). */
export const NOTIFICATION_MUTATION = {
  focus_start: "focus_start",
  cleaning_mark_done: "cleaning_mark_done"
} as const;

export type NotificationMutationTarget = (typeof NOTIFICATION_MUTATION)[keyof typeof NOTIFICATION_MUTATION];

export type NotificationAction = {
  label: string;
  type: "navigate" | "mutation";
  /** Navigate: path/query e.g. `/tasks?highlight=id`. Mutation: key from NOTIFICATION_MUTATION. */
  target?: string;
  payload?: Record<string, unknown>;
};

/** In-app notification row (read flag applied in UI layer from persisted set). */
export type AppNotification = {
  id: string;
  type: NotificationSeverity;
  category: NotificationCategory;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  /** Plain-language reason from automation rules (optional). */
  explanation?: string;
  action?: NotificationAction;
};

export type NotificationDraft = Omit<AppNotification, "read">;

export type NotificationEngineInput = {
  cleaningZones: CleaningZone[];
  focusSessions: FocusSession[];
  tasks: TaskItem[];
  /** Sum of expense amounts for the local calendar day (same source as Overview finance card). */
  expensesTodayTotal: number;
  now?: Date;
};

const READ_STORAGE_KEY = "lifeos-notification-read-ids";

/** Read flags are per calendar day so the same rule can notify again tomorrow. */
export function notificationReadCompoundKey(notificationId: string, now: Date): string {
  return `${notificationId}|${localCalendarDayKeyFromDate(now)}`;
}

/**
 * Derives actionable notifications from live API-shaped state (no static copy).
 */
export function generateNotifications(input: NotificationEngineInput): NotificationDraft[] {
  const now = input.now ?? new Date();
  const ctx: AutomationContext = {
    cleaningZones: input.cleaningZones,
    focusSessions: input.focusSessions,
    tasks: input.tasks,
    expensesTodayTotal: input.expensesTodayTotal,
    now
  };
  return runAutomationEngine(ctx).notifications;
}

export function mergeNotificationReadState(
  drafts: NotificationDraft[],
  readIds: Set<string>,
  now: Date
): AppNotification[] {
  return drafts.map((d) => ({ ...d, read: readIds.has(notificationReadCompoundKey(d.id, now)) }));
}

export function loadNotificationReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveNotificationReadIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

export function categoryNotificationEmoji(category: NotificationCategory): string {
  const map: Record<NotificationCategory, string> = {
    cleaning: "🧹",
    focus: "🔥",
    tasks: "📌",
    finance: "💰"
  };
  return map[category];
}
