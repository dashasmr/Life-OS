"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, CleaningZone } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CleaningPage() {
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [name, setName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState("7");
  const [error, setError] = useState<string | null>(null);

  function cleaningStatusBadge(status: CleaningZone["status"]): { label: string; className: string } {
    if (status === "ok") {
      return { label: "OK", className: "border border-[#2f4b3a] bg-[#17231c] text-[#b7e4c7]" };
    }
    if (status === "soon") {
      return { label: "Soon", className: "border border-[#6d572f] bg-[#2a2418] text-[#f3d59e]" };
    }
    return { label: "Overdue", className: "border border-[#7a2b2b] bg-[#2a1616] text-[#ffb3b3]" };
  }

  async function loadZones() {
    const response = await fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch cleaning zones");
    setZones(await response.json());
  }

  useEffect(() => {
    loadZones().catch((err: Error) => setError(err.message));
  }, []);

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
    setFrequencyDays("7");
    toast.success("Zone added");
    await loadZones();
  }

  async function markDone(zoneId: string) {
    setError(null);
    const response = await fetch(`${API_URL}/cleaning/zones/${zoneId}/done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      setError("Failed to mark cleaning as done");
      toast.error("Failed to mark cleaning as done");
      return;
    }
    toast.success("Marked as cleaned");
    await loadZones();
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

      <div className={ui.formCard}>
        <form onSubmit={onCreateZone} className={ui.formGrid}>
          <div className="grid gap-2">
            <label className={ui.formLabel}>Zone name</label>
            <input className={ui.inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Desk, Kitchen, Bathroom..." />
          </div>
          <div className="grid gap-2">
            <label className={ui.formLabel}>Frequency (days)</label>
            <input className={ui.inputClass} value={frequencyDays} onChange={(e) => setFrequencyDays(e.target.value)} placeholder="7" />
          </div>
          <div className="flex justify-end md:col-span-2">
            <Button className={ui.primaryButton} type="submit">
              Add zone
            </Button>
          </div>
        </form>
        </div>

      {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

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

