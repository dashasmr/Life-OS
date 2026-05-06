"use client";

import { useEffect, useState } from "react";
import { API_URL, PomodoroSession } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PomodoroPage() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [label, setLabel] = useState("");
  const [workMinutes, setWorkMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => session.status === "running") ?? null;

  async function loadSessions() {
    const response = await fetch(`${API_URL}/pomodoro/sessions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch pomodoro sessions");
    setSessions(await response.json());
  }

  useEffect(() => {
    loadSessions().catch((err: Error) => setError(err.message));
  }, []);

  async function startSession() {
    setError(null);
    const work = Number(workMinutes);
    const brk = Number(breakMinutes);
    if (!Number.isInteger(work) || work < 10) {
      setError("Work minutes must be an integer >= 10");
      toast.error("Work minutes must be an integer >= 10");
      return;
    }
    if (!Number.isInteger(brk) || brk < 1) {
      setError("Break minutes must be an integer >= 1");
      toast.error("Break minutes must be an integer >= 1");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/pomodoro/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
          work_minutes: work,
          break_minutes: brk
        })
      });
      if (!response.ok) {
        setError("Failed to start pomodoro session");
        toast.error("Failed to start pomodoro session");
        return;
      }
      setLabel("");
      toast.success("Pomodoro started");
      await loadSessions();
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  async function completeSession(sessionId: string) {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/pomodoro/sessions/${sessionId}/complete`, { method: "POST" });
      if (!response.ok) {
        setError("Failed to complete pomodoro session");
        toast.error("Failed to complete pomodoro session");
        return;
      }
      toast.success("Pomodoro completed");
      await loadSessions();
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Pomodoro</h1>
        <p className={ui.pageHint}>
          Use short timed work blocks to stay consistent. Start one pomodoro, finish it, then review your completed cycles below.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            sessions.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: keep one simple cycle, then repeat</p>
        </div>

      {activeSession && (
        <article className="mt-4 rounded-xl border border-[#6d572f] bg-[#2a2418] p-4">
          <p className="text-xs uppercase tracking-wide text-[#f3d59e]">Now running</p>
          <p className="mt-1 text-sm text-[#f6e5be]">
            {activeSession.label ?? "Untitled pomodoro"} — {activeSession.work_minutes}m / {activeSession.break_minutes}m
          </p>
          <Button className={`${ui.secondaryButton} mt-3`} onClick={() => completeSession(activeSession.id)} type="button">
            Complete active pomodoro
          </Button>
        </article>
      )}

      <div className={ui.formCard}>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="grid gap-2 md:col-span-2">
            <label className={ui.formLabel}>Label (optional)</label>
            <input className={ui.inputClass} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work block name" />
          </div>
          <div className="grid gap-2">
            <label className={ui.formLabel}>Work (minutes)</label>
            <input className={ui.inputClass} value={workMinutes} onChange={(e) => setWorkMinutes(e.target.value)} placeholder="25" />
          </div>
          <div className="grid gap-2">
            <label className={ui.formLabel}>Break (minutes)</label>
            <input className={ui.inputClass} value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} placeholder="5" />
          </div>
          <div className="flex justify-end md:col-span-4">
            <Button className={ui.primaryButton} onClick={startSession} type="button">
              Start pomodoro
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 space-y-3">
          {sessions.length === 0 && <div className={ui.emptyState}>No pomodoro sessions yet. Start your first cycle above.</div>}
          {sessions.map((s) => (
            <article key={s.id} className={ui.card}>
            <p className={ui.cardTitle}>{s.label ?? "Untitled pomodoro"}</p>
            <p className={`text-sm ${ui.mutedText}`}>
              {s.work_minutes}m work / {s.break_minutes}m break — {s.status}
            </p>
            {s.status === "running" && (
              <Button className={`${ui.secondaryButton} mt-2`} onClick={() => completeSession(s.id)} type="button">
                Complete pomodoro
              </Button>
            )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

