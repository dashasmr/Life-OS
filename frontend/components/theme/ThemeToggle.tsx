"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

type Props = {
  className?: string;
};

/**
 * Compact dark/light toggle — sets an explicit preference (not system).
 * Prefer {@link ThemePreferenceRadios} in Settings → Appearance for full control.
 */
export function ThemeToggle({ className = "" }: Props) {
  const { resolvedTheme, toggleResolved } = useTheme();
  const light = resolvedTheme === "light";

  return (
    <button
      type="button"
      onClick={toggleResolved}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-ds-input border border-lifeos-border bg-lifeos-muted text-lifeos-fg transition hover:bg-lifeos-hover hover:text-lifeos-fg ${className}`}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      title={light ? "Dark theme" : "Light theme"}
    >
      {light ? <Moon className="size-4" strokeWidth={1.75} aria-hidden /> : <Sun className="size-4" strokeWidth={1.75} aria-hidden />}
    </button>
  );
}
