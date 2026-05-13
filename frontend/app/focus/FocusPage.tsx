"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL, FocusSession, TaskItem } from "@/lib/api";
import { formatDateTimeFiNumeric } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/typography";
import { toast } from "sonner";
import { sendWithOfflineQueue } from "@/services/offlineQueue";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

export default function FocusPage() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [label, setLabel] = useState("");
  const [focusTaskId, setFocusTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => !session.ended_at) ?? null;
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const loadSessions = useCallback(async () => {
    const response = await fetch(`${API_URL}/focus/sessions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch focus sessions");
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

  async function startSession() {
    setError(null);
    const body = {
      label: label.trim() || null,
      task_id: focusTaskId || null
    };
    try {
      const result = await sendWithOfflineQueue({ kind: "focus_start", body }, () =>
        fetch(`${API_URL}/focus/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Focus start saved locally — will sync when online." });
        setLabel("");
        setFocusTaskId("");
        await loadSessions();
        return;
      }
      if (!result.response.ok) {
        setError("Failed to start focus session");
        toast.error("Failed to start focus session");
        return;
      }
      setLabel("");
      setFocusTaskId("");
      toast.success("Focus session started");
      await loadSessions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
      toast.error("Could not start focus session");
    }
  }

  async function stopSession(sessionId: string) {
    setError(null);
    try {
      const result = await sendWithOfflineQueue({ kind: "focus_stop", sessionId }, () =>
        fetch(`${API_URL}/focus/sessions/${sessionId}/stop`, {
          method: "POST"
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Stop command saved locally — will sync when online." });
        await loadSessions();
        return;
      }
      if (!result.response.ok) {
        setError("Failed to stop focus session");
        toast.error("Failed to stop focus session");
        return;
      }
      toast.success("Focus session stopped");
      await loadSessions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
      toast.error("Could not stop focus session");
    }
  }

  return (
    <div className={ui.contentClass}>
      <section className={cn(ui.panelClass, "space-y-ds-4")}>
        <div className="flex flex-wrap items-end justify-between gap-ds-3">
          <div>
            <PageTitle className="text-lifeos-section md:text-lifeos-card-title">Focus sessions</PageTitle>
            <p className={cn(ui.pageHint, "mt-ds-2")}>
              Link a task for the activity log, or leave empty for general focus.
            </p>
          </div>
          <p className={cn(ds.typography.caption, "tabular-nums text-lifeos-fg-muted")}>{sessions.length} in list</p>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            sessions.length === 0 ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: stop the session right after deep work</p>
        </div>

        <div className="grid gap-ds-5 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
          <div className="min-w-0 space-y-ds-3">
            {activeSession && (
              <div className="rounded-ds-card bg-lifeos-warning-muted/15 px-ds-4 py-ds-3 shadow-inner">
                <p className={ds.typography.labelMicro + " text-lifeos-warning"}>Now running</p>
                <p className="mt-ds-1 text-sm text-lifeos-fg-secondary">
                  {activeSession.label ?? "Untitled focus session"}
                  {activeSession.task_id ? (
                    <span className={`mt-1 block text-xs ${ui.mutedText}`}>
                      Task: {tasks.find((t) => t.id === activeSession.task_id)?.title ?? activeSession.task_id}
                    </span>
                  ) : (
                    <span className={`mt-1 block text-xs ${ui.mutedText}`}>General focus</span>
                  )}
                </p>
                <Button className={`${ui.secondaryButton} mt-ds-2`} onClick={() => stopSession(activeSession.id)} type="button">
                  Stop active session
                </Button>
              </div>
            )}

            {sessions.length === 0 && (
              <div className={cn(ui.emptyState, "py-ds-4")}>
                <p className="font-medium text-lifeos-fg-secondary">No focus data yet.</p>
                <p className="mt-ds-2 text-sm">Start a session from the right to populate history.</p>
              </div>
            )}

            <ul className="space-y-ds-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-x-ds-4 gap-y-ds-2 rounded-ds-input bg-lifeos-muted/25 px-ds-3 py-ds-2.5 shadow-inner"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-lifeos-fg">{s.label ?? "Untitled focus session"}</p>
                    <p className={`mt-0.5 text-sm ${ui.mutedText}`}>
                      {s.task_id ? `Task: ${tasks.find((t) => t.id === s.task_id)?.title ?? s.task_id} · ` : "General focus · "}
                      {formatDateTimeFiNumeric(s.started_at)}
                      {s.duration_seconds ? ` — ${Math.round(s.duration_seconds / 60)} min` : " — In progress"}
                    </p>
                  </div>
                  {!s.ended_at && (
                    <Button className={ui.secondaryButton} onClick={() => stopSession(s.id)} type="button" size="sm">
                      Stop
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
                  <label className={ui.formLabel} htmlFor="focus-task">
                    Focus on
                  </label>
                  <select
                    id="focus-task"
                    className={ui.inputClass}
                    value={focusTaskId}
                    onChange={(e) => setFocusTaskId(e.target.value)}
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
                  <label className={ui.formLabel} htmlFor="focus-label">
                    Label (optional)
                  </label>
                  <input
                    id="focus-label"
                    className={ui.inputClass}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Deep work, Reading…"
                  />
                </div>
                <Button className={`${ui.primaryButton} w-full justify-center`} onClick={startSession} type="button">
                  Start focus
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
