import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { pickTopPriorityTask } from "@/lib/commandCenter";
import { localCalendarDayKeyFromDate } from "@/lib/datetime";
import { hasFocusTouchToday } from "@/lib/systemStatus";
import { HIGH_SPENDING_EUR_THRESHOLD } from "@/services/insights";

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

/** Stable timestamp for “today’s” notifications so list doesn’t reshuffle every render. */
function localDayStartIso(now: Date): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/**
 * Derives actionable notifications from live API-shaped state (no static copy).
 */
export function generateNotifications(input: NotificationEngineInput): NotificationDraft[] {
  const now = input.now ?? new Date();
  const created_at = localDayStartIso(now);
  const out: NotificationDraft[] = [];

  const overdueZones = input.cleaningZones.filter((z) => z.status === "overdue");
  const deskOverdue = overdueZones.find((z) => z.name.toLowerCase().includes("desk"));

  if (deskOverdue) {
    out.push({
      id: "notif-cleaning-desk-overdue",
      type: "warning",
      category: "cleaning",
      title: "Desk cleaning overdue",
      message: `“${deskOverdue.name.trim() || "Desk"}” is past due — a quick reset helps focus.`,
      created_at,
      action: {
        label: "Mark as cleaned",
        type: "mutation",
        target: NOTIFICATION_MUTATION.cleaning_mark_done,
        payload: { zoneId: deskOverdue.id }
      }
    });
  } else if (overdueZones.length > 0) {
    const z = overdueZones[0];
    out.push({
      id: "notif-cleaning-zone-overdue",
      type: "warning",
      category: "cleaning",
      title: "Cleaning overdue",
      message: `“${z.name.trim() || "A zone"}” needs attention.`,
      created_at,
      action: {
        label: "Mark as cleaned",
        type: "mutation",
        target: NOTIFICATION_MUTATION.cleaning_mark_done,
        payload: { zoneId: z.id }
      }
    });
  }

  if (!hasFocusTouchToday(input.focusSessions, now)) {
    out.push({
      id: "notif-focus-none-today",
      type: "info",
      category: "focus",
      title: "No focus sessions today",
      message: "Start a focus or Pomodoro block to protect deep work time.",
      created_at,
      action: {
        label: "Start focus",
        type: "mutation",
        target: NOTIFICATION_MUTATION.focus_start,
        payload: {}
      }
    });
  }

  const highTask = pickTopPriorityTask(input.tasks, now);
  if (highTask) {
    out.push({
      id: "notif-tasks-high-priority",
      type: "warning",
      category: "tasks",
      title: "High priority task still open",
      message: `“${highTask.title.trim() || "Task"}” is incomplete — consider doing it first.`,
      created_at,
      action: {
        label: "Open task",
        type: "navigate",
        target: `/work/tasks?highlight=${encodeURIComponent(highTask.id)}`
      }
    });
  }

  if (input.expensesTodayTotal > HIGH_SPENDING_EUR_THRESHOLD) {
    out.push({
      id: "notif-finance-high-spend",
      type: "warning",
      category: "finance",
      title: "High spending detected today",
      message: `Today's expenses are above €${HIGH_SPENDING_EUR_THRESHOLD}. Review transactions when you can.`,
      created_at,
      action: {
        label: "Open finance",
        type: "navigate",
        target: "/finance/dashboard"
      }
    });
  }

  return out;
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
