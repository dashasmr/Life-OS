import { DEFAULT_USER_PREFERENCES } from "@/services/preferences/defaults";
import type { UserPreferences } from "@/services/preferences/types";

export const USER_PREFERENCES_STORAGE_KEY = "lifeos-user-preferences-v1";

export const USER_PREFERENCES_CHANGED_EVENT = "lifeos-user-preferences-changed";

type Stored = Partial<UserPreferences>;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function normalizeParsed(raw: unknown): Stored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Stored = {};

  if (typeof o.focusLengthMinutes === "number" && Number.isFinite(o.focusLengthMinutes)) {
    out.focusLengthMinutes = clamp(Math.round(o.focusLengthMinutes), 10, 180);
  }
  if (typeof o.dailySpendingLimit === "number" && Number.isFinite(o.dailySpendingLimit)) {
    out.dailySpendingLimit = clamp(o.dailySpendingLimit, 1, 500_000);
  }
  if (typeof o.defaultCleaningFrequencyDays === "number" && Number.isFinite(o.defaultCleaningFrequencyDays)) {
    out.defaultCleaningFrequencyDays = clamp(Math.round(o.defaultCleaningFrequencyDays), 1, 365);
  }
  if (typeof o.workdayStart === "string" && /^\d{1,2}:\d{2}$/.test(o.workdayStart.trim())) {
    out.workdayStart = o.workdayStart.trim();
  }
  if (typeof o.workdayEnd === "string" && /^\d{1,2}:\d{2}$/.test(o.workdayEnd.trim())) {
    out.workdayEnd = o.workdayEnd.trim();
  }

  return Object.keys(out).length ? out : null;
}

function readStored(): Stored {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return normalizeParsed(parsed) ?? {};
  } catch {
    return {};
  }
}

export function mergeUserPreferences(stored: Stored): UserPreferences {
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...stored
  };
}

/** Full prefs for this browser tab (defaults if unset). Safe without `window`. */
export function getResolvedUserPreferences(): UserPreferences {
  return mergeUserPreferences(readStored());
}

export function saveUserPreferences(next: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(USER_PREFERENCES_CHANGED_EVENT));
  } catch {
    /* quota */
  }
}

export function updateUserPreferences(patch: Partial<UserPreferences>): UserPreferences {
  const merged = { ...getResolvedUserPreferences(), ...patch };
  saveUserPreferences(merged);
  return merged;
}
