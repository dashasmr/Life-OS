"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { Surface } from "@/components/ui/Surface";
import { ThemePreferenceRadios } from "@/components/theme/ThemePreferenceRadios";
import { BodyText, LabelText, MutedText, PageTitle, SectionTitle } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { AUTOMATION_RULE_SETTING_CATALOG } from "@/services/automation/ruleSettingCatalog";
import type { AutomationSetting, AutomationSettingCategory } from "@/services/automation/settingsTypes";
import { getAutomationSettingsForUi, setAutomationRuleEnabled } from "@/services/automation/settingsStorage";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
  getResolvedUserPreferences,
  saveUserPreferences,
  USER_PREFERENCES_CHANGED_EVENT
} from "@/services/preferences";

const CATEGORY_LABEL: Record<AutomationSettingCategory, string> = {
  cleaning: "Cleaning",
  focus: "Focus & productivity",
  goals: "Goals",
  insights: "Insights & finance nudges"
};

const CATEGORY_ORDER: AutomationSettingCategory[] = ["cleaning", "focus", "goals", "insights"];

function groupByCategory(settings: AutomationSetting[]): Map<AutomationSettingCategory, AutomationSetting[]> {
  const map = new Map<AutomationSettingCategory, AutomationSetting[]>();
  for (const cat of CATEGORY_ORDER) map.set(cat, []);
  for (const s of settings) {
    const list = map.get(s.category);
    if (list) list.push(s);
  }
  return map;
}

const LOCALE_STORAGE_KEY = "lifeos-locale";

function LanguageSection() {
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en") setLocale(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function onChange(next: string) {
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <Surface variant="secondary" className="mt-6">
      <SectionTitle as="h2">Language</SectionTitle>
      <MutedText className={cn("mt-ds-2", ds.typography.proseMax)}>Interface language for this browser.</MutedText>
      <div className="mt-ds-5 max-w-sm">
        <label className={ds.typography.uiLabel} htmlFor="lifeos-locale-select">
          Display language
        </label>
        <select
          id="lifeos-locale-select"
          value={locale}
          onChange={(e) => onChange(e.target.value)}
          className={`${ui.inputClass} h-10 w-full max-w-xs`}
        >
          <option value="en">English</option>
        </select>
        <BodyText as="p" className={cn(ds.typography.bodyMuted, "mt-ds-2")}>
          Additional languages may be added in a future update.
        </BodyText>
      </div>
    </Surface>
  );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent/60 ${
        enabled ? "bg-lifeos-accent" : "bg-lifeos-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 block size-6 rounded-full bg-lifeos-elevated shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
      <span className="sr-only">{enabled ? "On" : "Off"}</span>
    </button>
  );
}

function PersonalizationForm() {
  const [prefs, setPrefs] = useState<UserPreferences>(() => getResolvedUserPreferences());
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => {
    function sync() {
      setPrefs(getResolvedUserPreferences());
    }
    window.addEventListener(USER_PREFERENCES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(USER_PREFERENCES_CHANGED_EVENT, sync);
  }, []);

  function commit(next: UserPreferences) {
    saveUserPreferences(next);
    setPrefs(next);
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const focus = Math.round(Number(prefs.focusLengthMinutes));
    const spend = Number(prefs.dailySpendingLimit);
    const freq = Math.round(Number(prefs.defaultCleaningFrequencyDays));
    if (!Number.isFinite(focus) || focus < 10 || focus > 180) return;
    if (!Number.isFinite(spend) || spend < 1) return;
    if (!Number.isFinite(freq) || freq < 1 || freq > 365) return;
    commit({
      ...prefs,
      focusLengthMinutes: focus,
      dailySpendingLimit: spend,
      defaultCleaningFrequencyDays: freq
    });
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={ds.typography.uiLabel} htmlFor="pref-focus">
            Preferred focus length (minutes)
          </label>
          <input
            id="pref-focus"
            type="number"
            min={10}
            max={180}
            step={1}
            required
            className={`${ui.inputClass} h-10 tabular-nums`}
            value={prefs.focusLengthMinutes}
            onChange={(ev) => setPrefs((p) => ({ ...p, focusLengthMinutes: Number(ev.target.value) }))}
          />
          <BodyText as="p" className={ds.typography.bodyMuted}>
            Used for Pomodoro and the daily plan.
          </BodyText>
        </div>
        <div className="grid gap-2">
          <label className={ds.typography.uiLabel} htmlFor="pref-spend">
            Daily spending limit (€)
          </label>
          <input
            id="pref-spend"
            type="number"
            min={1}
            step={1}
            required
            className={`${ui.inputClass} h-10 tabular-nums`}
            value={prefs.dailySpendingLimit}
            onChange={(ev) => setPrefs((p) => ({ ...p, dailySpendingLimit: Number(ev.target.value) }))}
          />
          <BodyText as="p" className={ds.typography.bodyMuted}>
            Finance alerts use this limit.
          </BodyText>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <label className={ds.typography.uiLabel} htmlFor="pref-clean-freq">
            Default cleaning frequency (days)
          </label>
          <input
            id="pref-clean-freq"
            type="number"
            min={1}
            max={365}
            step={1}
            required
            className={`${ui.inputClass} h-10 max-w-xs tabular-nums`}
            value={prefs.defaultCleaningFrequencyDays}
            onChange={(ev) => setPrefs((p) => ({ ...p, defaultCleaningFrequencyDays: Number(ev.target.value) }))}
          />
          <BodyText as="p" className={ds.typography.bodyMuted}>
            Default when you add a zone.
          </BodyText>
        </div>
        <div className="grid gap-2">
          <label className={ds.typography.uiLabel} htmlFor="pref-work-start">
            Workday start
          </label>
          <input
            id="pref-work-start"
            type="time"
            required
            className={`${ui.inputClass} h-10`}
            value={prefs.workdayStart}
            onChange={(ev) => setPrefs((p) => ({ ...p, workdayStart: ev.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <label className={ds.typography.uiLabel} htmlFor="pref-work-end">
            Workday end
          </label>
          <input
            id="pref-work-end"
            type="time"
            required
            className={`${ui.inputClass} h-10`}
            value={prefs.workdayEnd}
            onChange={(ev) => setPrefs((p) => ({ ...p, workdayEnd: ev.target.value }))}
          />
          <BodyText as="p" className={ds.typography.bodyMuted}>
            Daily plan and a few suggestions use this window (local time).
          </BodyText>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={cn(ui.secondaryButton, "min-h-10 border-lifeos-accent bg-lifeos-accent/15 text-lifeos-accent hover:bg-lifeos-accent/25")}
        >
          Save personalization
        </button>
        <button
          type="button"
          className={cn(ds.typography.bodySecondary, "text-lifeos-fg-muted underline-offset-2 hover:underline")}
          onClick={() => commit(DEFAULT_USER_PREFERENCES)}
        >
          Reset to defaults
        </button>
        {savedHint ? <span className={cn(ds.typography.bodySecondary, "text-lifeos-success")}>Saved.</span> : null}
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AutomationSetting[]>(() => getAutomationSettingsForUi());

  const refresh = useCallback(() => {
    setSettings(getAutomationSettingsForUi());
  }, []);

  const grouped = useMemo(() => groupByCategory(settings), [settings]);

  const toggle = useCallback(
    (id: string, next: boolean) => {
      setAutomationRuleEnabled(id, next);
      refresh();
    },
    [refresh]
  );

  const catalogEmpty = AUTOMATION_RULE_SETTING_CATALOG.length === 0;

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <PageTitle>Settings</PageTitle>
        <MutedText className={cn("mt-ds-4", ds.typography.proseMax)}>
          Automations and defaults for this browser.
        </MutedText>

        <Surface variant="primary" className="mt-6 space-y-ds-4">
          <div className="space-y-ds-2">
            <SectionTitle>Appearance</SectionTitle>
            <MutedText className={ds.typography.proseMax}>
              Dark, light, or match your OS. Preference is saved in this browser.
            </MutedText>
          </div>
          <div className="max-w-md">
            <ThemePreferenceRadios />
          </div>
        </Surface>

        <LanguageSection />

        <Surface variant="primary" className="mt-6 space-y-ds-4">
          <div className="space-y-ds-2">
            <SectionTitle>Personalization</SectionTitle>
            <MutedText className={ds.typography.proseMax}>Defaults until you save. Local only.</MutedText>
          </div>
          <PersonalizationForm />
        </Surface>

        <Surface variant="primary" className="mt-6 space-y-ds-4">
          <div className="space-y-ds-2">
            <SectionTitle>Automation Settings</SectionTitle>
            <MutedText className={ds.typography.proseMax}>Turn rules on or off. Stored locally.</MutedText>
          </div>

          {catalogEmpty ? (
            <MutedText className="mt-ds-6">No automation rules are configured yet.</MutedText>
          ) : (
            <div className="mt-ds-5 space-y-ds-6">
              {CATEGORY_ORDER.map((cat) => {
                const rows = grouped.get(cat) ?? [];
                if (rows.length === 0) return null;
                return (
                  <div key={cat}>
                    <LabelText as="p" className="font-semibold text-lifeos-fg-secondary">
                      {CATEGORY_LABEL[cat]}
                    </LabelText>
                    <Surface as="ul" variant="inset" className="mt-ds-3 !p-0 list-none divide-y divide-lifeos-border-subtle/[0.07] overflow-hidden">
                      {rows.map((s) => (
                        <li
                          key={s.id}
                          className="flex flex-col gap-3 px-ds-4 py-ds-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:px-ds-5"
                        >
                          <div className="min-w-0 flex-1 space-y-ds-2">
                            <BodyText as="p" className="font-semibold text-lifeos-fg">
                              {s.name}
                            </BodyText>
                            <MutedText className={ds.typography.proseWideMax}>{s.description}</MutedText>
                          </div>
                          <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                            <span className={cn(ds.typography.caption, "font-medium tabular-nums text-lifeos-accent")}>
                              {s.enabled ? "On" : "Off"}
                            </span>
                            <ToggleSwitch enabled={s.enabled} onToggle={() => toggle(s.id, !s.enabled)} />
                          </div>
                        </li>
                      ))}
                    </Surface>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        <Surface
          variant="secondary"
          className="mt-6 space-y-ds-4 rounded-ds-card bg-lifeos-muted/15 px-ds-5 py-ds-6 shadow-inner md:px-ds-6"
        >
          <div className="space-y-ds-2">
            <SectionTitle>Developer tools</SectionTitle>
            <MutedText className={ds.typography.proseMax}>For testing and debugging. Kept off the main dashboard.</MutedText>
          </div>
          <Link
            href="/settings/developer"
            className="mt-ds-2 inline-flex min-h-11 items-center justify-center rounded-ds-button bg-lifeos-muted/40 px-ds-5 text-lifeos-body font-medium text-lifeos-accent shadow-sm transition hover:bg-lifeos-hover hover:text-lifeos-fg"
          >
            Open developer tools
          </Link>
        </Surface>
      </section>
    </div>
  );
}
