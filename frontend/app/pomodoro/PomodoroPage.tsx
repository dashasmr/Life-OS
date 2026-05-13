"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, PomodoroSession, TaskItem } from "@/lib/api";
import { formatDateTimeFiNumeric } from "@/lib/datetime";
import { useUserPreferencesEpoch } from "@/hooks/useUserPreferencesEpoch";
import { getResolvedUserPreferences } from "@/services/preferences";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/typography";
import { toast } from "sonner";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

export default function PomodoroPage() {
  const userPrefsEpoch = useUserPreferencesEpoch();
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [label, setLabel] = useState("");
  const [pomodoroTaskId, setPomodoroTaskId] = useState("");
  const [workMinutes, setWorkMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => session.status === "running") ?? null;
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const loadSessions = useCallback(async () => {
    const response = await fetch(`${API_URL}/pomodoro/sessions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch pomodoro sessions");
    setSessions(await response.json());
  }, []);

  const loadTasks = useCallback(async () => {
    const response = await fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch tasks");
    setTasks(await response.json());
  }, []);

  useEffect(() => {
    Promise.all([loadSessions(), loadTasks()]).catch((err: Error) => setError(err.message));
  }, [loadSessions, loadTasks]);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    Promise.all([loadSessions(), loadTasks()]).catch((err: Error) => setError(err.message));
  }, [realtimeEpoch, loadSessions, loadTasks]);

  useEffect(() => {
    setWorkMinutes(String(getResolvedUserPreferences().focusLengthMinutes));
  }, [userPrefsEpoch]);

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
          task_id: pomodoroTaskId || null,
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
      setPomodoroTaskId("");
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
      <section className={cn(ui.panelClass, "space-y-ds-4")}>
        <div className="flex flex-wrap items-end justify-between gap-ds-3">
          <div>
            <PageTitle className="text-lifeos-section md:text-lifeos-card-title">Pomodoro</PageTitle>
            <p className={cn(ui.pageHint, "mt-ds-2")}>
              Timed work blocks. Link a task to record what you worked on, or leave general focus.
            </p>
          </div>
          <p className={cn(ds.typography.caption, "tabular-nums text-lifeos-fg-muted")}>{sessions.length} in list</p>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            sessions.length === 0 ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: keep one simple cycle, then repeat</p>
        </div>

        <div className="grid gap-ds-5 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
          <div className="min-w-0 space-y-ds-3">
            {activeSession && (
              <div className="rounded-ds-card bg-lifeos-warning-muted/15 px-ds-4 py-ds-3 shadow-inner">
                <p className={ds.typography.labelMicro + " text-lifeos-warning"}>Now running</p>
                <p className="mt-ds-1 text-sm text-lifeos-fg-secondary">
                  {activeSession.label ?? "Untitled pomodoro"} — {activeSession.work_minutes}m / {activeSession.break_minutes}m
                  {activeSession.task_id ? (
                    <span className={`mt-1 block text-xs ${ui.mutedText}`}>
                      Task: {tasks.find((t) => t.id === activeSession.task_id)?.title ?? activeSession.task_id}
                    </span>
                  ) : (
                    <span className={`mt-1 block text-xs ${ui.mutedText}`}>General focus</span>
                  )}
                </p>
                <Button className={`${ui.secondaryButton} mt-ds-2`} onClick={() => completeSession(activeSession.id)} type="button">
                  Complete active pomodoro
                </Button>
              </div>
            )}

            {sessions.length === 0 && (
              <div className={cn(ui.emptyState, "py-ds-4")}>
                <p className="font-medium text-lifeos-fg-secondary">No pomodoro sessions yet.</p>
                <p className="mt-ds-2 text-sm">Start a cycle from the right to populate history.</p>
              </div>
            )}

            <ul className="space-y-ds-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-x-ds-4 gap-y-ds-2 rounded-ds-input bg-lifeos-muted/25 px-ds-3 py-ds-2.5 shadow-inner"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-lifeos-fg">{s.label ?? "Untitled pomodoro"}</p>
                    <p className={`mt-0.5 text-sm ${ui.mutedText}`}>
                      {s.task_id ? `Task: ${tasks.find((t) => t.id === s.task_id)?.title ?? s.task_id} · ` : "General focus · "}
                      {s.work_minutes}m / {s.break_minutes}m — {s.status}
                      <span className="mt-0.5 block text-xs tabular-nums">{formatDateTimeFiNumeric(s.started_at)}</span>
                    </p>
                  </div>
                  {s.status === "running" && (
                    <Button className={ui.secondaryButton} onClick={() => completeSession(s.id)} type="button" size="sm">
                      Complete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <aside className="min-w-0 space-y-ds-3 lg:sticky lg:top-4">
            <div className={cn(ui.formCard, "!mt-0")}>
              <p className={cn(ds.typography.sectionEyebrow, "mb-ds-2")}>Start</p>
              <div className="grid gap-ds-2">
                <div className="grid gap-ds-1">
                  <label className={ui.formLabel} htmlFor="pomo-task">
                    Focus on
                  </label>
                  <select
                    id="pomo-task"
                    className={ui.inputClass}
                    value={pomodoroTaskId}
                    onChange={(e) => setPomodoroTaskId(e.target.value)}
                  >
                    <option value="">General focus</option>
                    {tasks
                      .filter((t) => t.status !== "done")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-ds-1">
                  <label className={ui.formLabel} htmlFor="pomo-label">
                    Label (optional)
                  </label>
                  <input
                    id="pomo-label"
                    className={ui.inputClass}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Work block name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-ds-2">
                  <div className="grid gap-ds-1">
                    <label className={ui.formLabel} htmlFor="pomo-work">
                      Work (min)
                    </label>
                    <input
                      id="pomo-work"
                      className={ui.inputClass}
                      inputMode="numeric"
                      value={workMinutes}
                      onChange={(e) => setWorkMinutes(e.target.value)}
                      placeholder="25"
                    />
                  </div>
                  <div className="grid gap-ds-1">
                    <label className={ui.formLabel} htmlFor="pomo-break">
                      Break (min)
                    </label>
                    <input
                      id="pomo-break"
                      className={ui.inputClass}
                      inputMode="numeric"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>
                <Button className={`${ui.primaryButton} w-full justify-center`} onClick={startSession} type="button">
                  Start pomodoro
                </Button>
              </div>
            </div>
          </aside>
        </div>

        {error && <p className="text-sm text-lifeos-danger">{error}</p>}
      </section>
    </div>
  );
}
