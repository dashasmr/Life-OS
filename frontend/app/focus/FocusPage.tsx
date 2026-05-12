"use client";

import { useEffect, useState } from "react";
import { API_URL, FocusSession, TaskItem } from "@/lib/api";
import { formatDateTimeFiNumeric } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function FocusPage() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [label, setLabel] = useState("");
  const [focusTaskId, setFocusTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => !session.ended_at) ?? null;

  async function loadSessions() {
    const response = await fetch(`${API_URL}/focus/sessions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch focus sessions");
    setSessions(await response.json());
  }

  async function loadTasks() {
    const response = await fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch tasks");
    setTasks(await response.json());
  }

  useEffect(() => {
    Promise.all([loadSessions(), loadTasks()]).catch((err: Error) => setError(err.message));
  }, []);

  async function startSession() {
    setError(null);
    const response = await fetch(`${API_URL}/focus/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim() || null,
        task_id: focusTaskId || null
      })
    });
    if (!response.ok) {
      setError("Failed to start focus session");
      toast.error("Failed to start focus session");
      return;
    }
    setLabel("");
    setFocusTaskId("");
    toast.success("Focus session started");
    await loadSessions();
  }

  async function stopSession(sessionId: string) {
    setError(null);
    const response = await fetch(`${API_URL}/focus/sessions/${sessionId}/stop`, {
      method: "POST"
    });
    if (!response.ok) {
      setError("Failed to stop focus session");
      toast.error("Failed to stop focus session");
      return;
    }
    toast.success("Focus session stopped");
    await loadSessions();
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Focus sessions</h1>
        <p className={ui.pageHint}>
          Optionally link a task to see what you focused on in the activity log. Leave task empty for general focus.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            sessions.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: stop session immediately after deep work</p>
        </div>

      {activeSession && (
        <article className="mt-4 rounded-xl border border-[#6d572f] bg-[#2a2418] p-4">
          <p className="text-xs uppercase tracking-wide text-[#f3d59e]">Now running</p>
          <p className="mt-1 text-sm text-[#f6e5be]">
            {activeSession.label ?? "Untitled focus session"}
            {activeSession.task_id ? (
              <span className={`mt-1 block text-xs ${ui.mutedText}`}>
                Task: {tasks.find((t) => t.id === activeSession.task_id)?.title ?? activeSession.task_id}
              </span>
            ) : (
              <span className={`mt-1 block text-xs ${ui.mutedText}`}>General focus</span>
            )}
          </p>
          <Button className={`${ui.secondaryButton} mt-3`} onClick={() => stopSession(activeSession.id)} type="button">
            Stop active session
          </Button>
        </article>
      )}

      <div className={ui.formCard}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <label className={ui.formLabel}>Focus on</label>
            <select
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
          <div className="grid gap-2 md:col-span-2">
            <label className={ui.formLabel}>Label (optional)</label>
            <input
              className={ui.inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Deep work, Reading..."
            />
          </div>
          <div className="flex items-end justify-end md:col-span-2">
            <Button className={ui.primaryButton} onClick={startSession} type="button">
              Start focus
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 space-y-3">
          {sessions.length === 0 && <div className={ui.emptyState}>No focus sessions yet. Start your first session above.</div>}
          {sessions.map((s) => (
            <article key={s.id} className={ui.card}>
            <p className={ui.cardTitle}>{s.label ?? "Untitled focus session"}</p>
            <p className={`text-sm ${ui.mutedText}`}>
              {s.task_id ? `Task: ${tasks.find((t) => t.id === s.task_id)?.title ?? s.task_id} · ` : "General focus · "}
              Started: {formatDateTimeFiNumeric(s.started_at)}
              {s.duration_seconds ? ` — Duration: ${Math.round(s.duration_seconds / 60)} min` : " — In progress"}
            </p>
            {!s.ended_at && (
              <Button className={`${ui.secondaryButton} mt-2`} onClick={() => stopSession(s.id)} type="button">
                Stop session
              </Button>
            )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

