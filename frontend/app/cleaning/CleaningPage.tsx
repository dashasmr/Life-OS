"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, CleaningZone } from "@/lib/api";
import { computeHomeHealthScore } from "@/lib/cleaningHealth";
import { useUserPreferencesEpoch } from "@/hooks/useUserPreferencesEpoch";
import { getResolvedUserPreferences } from "@/services/preferences";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendWithOfflineQueue } from "@/services/offlineQueue";

export default function CleaningPage() {
  const userPrefsEpoch = useUserPreferencesEpoch();
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [name, setName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState("7");
  const [error, setError] = useState<string | null>(null);

  function cleaningStatusBadge(status: CleaningZone["status"]): { label: string; className: string } {
    if (status === "ok") {
      return {
        label: "OK",
        className: "border border-lifeos-status-healthy-border bg-lifeos-status-healthy-bg text-lifeos-status-healthy"
      };
    }
    if (status === "soon") {
      return {
        label: "Soon",
        className: "border border-lifeos-warning-muted bg-lifeos-warning-muted/25 text-lifeos-warning"
      };
    }
    return {
      label: "Overdue",
      className: "border border-lifeos-status-risk-border bg-lifeos-status-risk-bg text-lifeos-status-risk"
    };
  }

  async function loadZones() {
    const response = await fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch cleaning zones");
    setZones(await response.json());
  }

  useEffect(() => {
    loadZones().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setFrequencyDays(String(getResolvedUserPreferences().defaultCleaningFrequencyDays));
  }, [userPrefsEpoch]);

  const homeHealth = useMemo(() => computeHomeHealthScore(zones), [zones]);

  function healthStatusClass(level: NonNullable<typeof homeHealth>["level"]): string {
    if (level === "healthy") return "text-lifeos-status-healthy";
    if (level === "needs_attention") return "text-lifeos-warning";
    return "text-lifeos-status-risk";
  }

  async function onCreateZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const frequency = Number(frequencyDays);
    if (!name.trim()) {
      setError("Zone name is required");
      toast.error("Zone name is required");
      return;
    }
    if (!Number.isInteger(frequency) || frequency < 1) {
      setError("Frequency must be a positive integer");
      toast.error("Frequency must be a positive integer");
      return;
    }
    const response = await fetch(`${API_URL}/cleaning/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), frequency_days: frequency })
    });
    if (!response.ok) {
      setError("Failed to create cleaning zone");
      toast.error("Failed to create cleaning zone");
      return;
    }
    setName("");
    setFrequencyDays(String(getResolvedUserPreferences().defaultCleaningFrequencyDays));
    toast.success("Zone added");
    await loadZones();
  }

  async function markDone(zoneId: string) {
    setError(null);
    try {
      const result = await sendWithOfflineQueue({ kind: "cleaning_done", zoneId }, () =>
        fetch(`${API_URL}/cleaning/zones/${zoneId}/done`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Cleaning logged locally — will sync when online." });
        await loadZones();
        return;
      }
      if (!result.response.ok) {
        setError("Failed to mark cleaning as done");
        toast.error("Failed to mark cleaning as done");
        return;
      }
      toast.success("Marked as cleaned");
      await loadZones();
    } catch {
      setError("Cannot reach API.");
      toast.error("Cannot reach API");
    }
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Cleaning</h1>
        <p className={ui.pageHint}>
          Create home zones and set cleaning frequency. Mark a zone as cleaned right after you finish to keep reminders realistic.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            zones.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: mark zone right after cleaning</p>
        </div>

        <div className={`mt-6 ${ds.surfaces.contentPanel}`}>
          <h2 className="text-lg font-semibold text-lifeos-fg">Home health score</h2>
          {homeHealth ? (
            <div className="mt-4">
              <p className="text-4xl font-semibold tabular-nums text-lifeos-fg">{homeHealth.scorePercent}%</p>
              <p className={`mt-2 text-sm font-medium ${healthStatusClass(homeHealth.level)}`}>
                Status: {homeHealth.statusLabel}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-lifeos-border bg-lifeos-muted px-5 py-8 text-center">
              <p className="text-lg font-medium text-lifeos-fg">No zones yet</p>
              <p className={`mt-2 text-sm ${ui.mutedText}`}>
                Add a cleaning zone below to see how your home is doing overall.
              </p>
            </div>
          )}
        </div>

      <div className={ui.formCard}>
        <form onSubmit={onCreateZone} className={ui.formGrid}>
          <FormField id="zone-name" label="Zone name">
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kitchen" autoComplete="off" />
          </FormField>
          <FormField id="zone-frequency" label="Every (days)">
            <Input
              id="zone-frequency"
              className="tabular-nums"
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(e.target.value)}
              placeholder="7"
              inputMode="numeric"
            />
          </FormField>
          <div className="flex justify-end md:col-span-2">
            <Button className={ui.primaryButton} type="submit">
              Add zone
            </Button>
          </div>
        </form>
        </div>

      {error && <p className="mt-4 text-lifeos-danger">{error}</p>}

        <div className="mt-6 space-y-3">
          {zones.length === 0 && <div className={ui.emptyState}>No cleaning zones yet. Add your first zone above.</div>}
          {zones.map((z) => (
            <article key={z.id} className={ui.card}>
            <p className={ui.cardTitle}>{z.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className={`text-sm ${ui.mutedText}`}>Every {z.frequency_days} days</p>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${cleaningStatusBadge(z.status).className}`}>
                {cleaningStatusBadge(z.status).label}
              </span>
            </div>
            <Button className={`${ui.secondaryButton} mt-2`} onClick={() => markDone(z.id)} type="button">
              Mark cleaned
            </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

