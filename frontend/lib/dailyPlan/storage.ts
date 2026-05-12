import { localCalendarDayKeyFromDate } from "@/lib/datetime";

const PREFIX = "lifeos-daily-plan-done";

export function dailyPlanCompletedStorageKey(now: Date): string {
  return `${PREFIX}:${localCalendarDayKeyFromDate(now)}`;
}

export function loadDailyPlanCompletedIds(now: Date): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(dailyPlanCompletedStorageKey(now));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveDailyPlanCompletedIds(now: Date, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dailyPlanCompletedStorageKey(now), JSON.stringify([...ids]));
  } catch {
    /* ignore quota / private mode */
  }
}
