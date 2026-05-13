import type { UserPreferences } from "@/services/preferences/types";

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/** Minutes from midnight for the given local date (0–1439). */
export function localMinutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function prefsToMinutes(prefs: Pick<UserPreferences, "workdayStart" | "workdayEnd">): {
  start: number;
  end: number;
} | null {
  const a = parseHm(prefs.workdayStart);
  const b = parseHm(prefs.workdayEnd);
  if (!a || !b) return null;
  return { start: a.h * 60 + a.m, end: b.h * 60 + b.m };
}

/**
 * Whether `now` falls inside [workdayStart, workdayEnd) on the local clock.
 * Same-day window only (start must be before end).
 */
export function isWithinPreferredWorkHours(now: Date, prefs: Pick<UserPreferences, "workdayStart" | "workdayEnd">): boolean {
  const hm = prefsToMinutes(prefs);
  if (!hm) return true;
  const { start, end } = hm;
  if (start >= end) return true;
  const t = localMinutesSinceMidnight(now);
  return t >= start && t < end;
}
