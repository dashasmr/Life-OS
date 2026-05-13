import type { UserPreferences } from "@/services/preferences/types";
import { HIGH_SPENDING_EUR_THRESHOLD } from "@/services/insights";

/** Used when nothing is stored or on the server (no `window`). */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  focusLengthMinutes: 25,
  dailySpendingLimit: HIGH_SPENDING_EUR_THRESHOLD,
  defaultCleaningFrequencyDays: 7,
  workdayStart: "09:00",
  workdayEnd: "18:00"
};
