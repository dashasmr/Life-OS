import type { EventItem, EventType } from "@/lib/api";
import { localCalendarDayKeyFromDate, localDateKeyFromIso } from "@/lib/datetime";

/** Event types that count as “had focus activity” on a local calendar day. */
const FOCUS_STREAK_TYPES: ReadonlySet<EventType> = new Set([
  "focus_started",
  "focus_ended",
  "focus_session_completed",
  "pomodoro_completed"
]);

const CLEANING_STREAK_TYPES: ReadonlySet<EventType> = new Set(["cleaning_done"]);
const TASK_STREAK_TYPES: ReadonlySet<EventType> = new Set(["task_completed"]);

export type ConsistencyStreaks = {
  focusDays: number;
  cleaningDays: number;
  taskDays: number;
};

function shiftLocalDayKey(dayKey: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return dayKey;
  dt.setDate(dt.getDate() + deltaDays);
  return localCalendarDayKeyFromDate(dt);
}

/**
 * Local calendar days (YYYY-MM-DD) that have at least one matching event.
 */
export function activeLocalDaysForEventTypes(events: EventItem[], types: ReadonlySet<EventType>): Set<string> {
  const keys = new Set<string>();
  for (const e of events) {
    if (!types.has(e.type)) continue;
    const k = localDateKeyFromIso(e.created_at);
    if (k) keys.add(k);
  }
  return keys;
}

/**
 * Current streak length: consecutive local days with activity, counting backward from the latest
 * qualifying day among {today, yesterday}. If neither has activity, streak is 0.
 * (So “today not logged yet” does not break a streak that was active yesterday.)
 */
export function computeDayStreak(activeDays: Set<string>, now: Date = new Date()): number {
  const todayKey = localCalendarDayKeyFromDate(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = localCalendarDayKeyFromDate(yesterday);

  let cursorKey: string | null = null;
  if (activeDays.has(todayKey)) cursorKey = todayKey;
  else if (activeDays.has(yesterdayKey)) cursorKey = yesterdayKey;
  else return 0;

  let count = 0;
  let k = cursorKey;
  while (activeDays.has(k)) {
    count++;
    k = shiftLocalDayKey(k, -1);
  }
  return count;
}

/**
 * Derived streak analytics from the event log only (not tasks/focus UI state).
 */
export function computeConsistencyStreaks(events: EventItem[], now: Date = new Date()): ConsistencyStreaks {
  const focusDays = activeLocalDaysForEventTypes(events, FOCUS_STREAK_TYPES);
  const cleaningDays = activeLocalDaysForEventTypes(events, CLEANING_STREAK_TYPES);
  const taskDays = activeLocalDaysForEventTypes(events, TASK_STREAK_TYPES);

  return {
    focusDays: computeDayStreak(focusDays, now),
    cleaningDays: computeDayStreak(cleaningDays, now),
    taskDays: computeDayStreak(taskDays, now)
  };
}
