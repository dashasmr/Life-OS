"use client";

import { useTheme, type ThemePreference } from "@/components/theme/ThemeProvider";

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "dark", label: "Dark", hint: "Always use the dark palette." },
  { value: "light", label: "Light", hint: "Always use the light palette." },
  { value: "system", label: "System", hint: "Follow your OS light/dark setting." }
];

type Props = {
  className?: string;
};

export function ThemePreferenceRadios({ className = "" }: Props) {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className={`space-y-2 ${className}`}>
      <legend className="sr-only">Theme</legend>
      <div className="space-y-2" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((opt) => {
          const checked = preference === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-ds-input border p-3 transition-[background-color,border-color,box-shadow] duration-lifeos-normal ease-lifeos hover:bg-lifeos-hover/40 ${
                checked
                  ? "border-lifeos-accent/35 bg-lifeos-accent-soft/50 ring-1 ring-lifeos-accent/20"
                  : "border-lifeos-border bg-lifeos-card/30"
              }`}
            >
              <input
                type="radio"
                name="lifeos-theme-preference"
                value={opt.value}
                checked={checked}
                onChange={() => setPreference(opt.value)}
                className="mt-0.5 size-4 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-lifeos-fg">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-lifeos-fg-muted">{opt.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
