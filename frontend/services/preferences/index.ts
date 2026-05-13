export type { UserPreferences } from "@/services/preferences/types";
export { DEFAULT_USER_PREFERENCES } from "@/services/preferences/defaults";
export {
  getResolvedUserPreferences,
  mergeUserPreferences,
  saveUserPreferences,
  updateUserPreferences,
  USER_PREFERENCES_CHANGED_EVENT,
  USER_PREFERENCES_STORAGE_KEY
} from "@/services/preferences/storage";
export { isWithinPreferredWorkHours, localMinutesSinceMidnight } from "@/services/preferences/workday";
