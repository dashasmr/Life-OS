"use client";

import { useEffect, useState } from "react";
import { USER_PREFERENCES_CHANGED_EVENT } from "@/services/preferences/storage";

/** Re-render consumers when personalization prefs change (this tab or another). */
export function useUserPreferencesEpoch(): number {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    function bump() {
      setEpoch((n) => n + 1);
    }
    window.addEventListener("storage", bump);
    window.addEventListener(USER_PREFERENCES_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(USER_PREFERENCES_CHANGED_EVENT, bump);
    };
  }, []);

  return epoch;
}
