"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

/** Stored in localStorage — drives `data-theme` after resolve */
export type ThemePreference = "dark" | "light" | "system";

/** Effective palette on `<html>` */
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "lifeos-theme";

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolvePreference(pref: ThemePreference): ResolvedTheme {
  if (pref === "dark" || pref === "light") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyDomTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", resolved);
}

export type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  /** Alias for `setPreference` — stores `dark` | `light` | `system` in localStorage */
  setTheme: (next: ThemePreference) => void;
  /** Sets explicit dark/light opposite to the current resolved palette */
  toggleResolved: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  /** False until we read localStorage — avoids overwriting `data-theme` from the inline script */
  const [hydrated, setHydrated] = useState(false);
  /** Bumps when OS scheme changes while preference is `system` */
  const [systemNonce, setSystemNonce] = useState(0);

  const resolvedTheme = useMemo(
    (): ResolvedTheme => resolvePreference(preference),
    [preference, systemNonce]
  );

  useLayoutEffect(() => {
    setPreferenceState(readPreference());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyDomTheme(resolvedTheme);
  }, [hydrated, resolvedTheme]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemNonce((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyDomTheme(resolvePreference(next));
  }, []);

  const toggleResolved = useCallback(() => {
    setPreferenceState((prev) => {
      const resolved = resolvePreference(prev);
      const nextPref: ThemePreference = resolved === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, nextPref);
      } catch {
        /* ignore */
      }
      return nextPref;
    });
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      setTheme: setPreference,
      toggleResolved
    }),
    [preference, resolvedTheme, setPreference, toggleResolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
