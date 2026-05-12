"use client";

import { useEffect, useState } from "react";
import { API_URL, PomodoroSession, TaskItem } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PomodoroPage() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [label, setLabel] = useState("");
  const [pomodoroTaskId, setPomodoroTaskId] = useState("");
  const [workMinutes, setWorkMinutes] = useState("25");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const activeSession = sessions.find((session) => session.status === "running") ?? null;

  async function loadSessions() {
    const response = await fetch(`${API_URL}/pomodoro/sessions?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch pomodoro sessions");
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
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Pomodoro</h1>
        <p className={ui.pageHint}>
          Use short timed work blocks to stay consistent. Link a task to record what you worked on, or leave it as general focus.
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
            {activeSession.task_id ? (
              <span className={`mt-1 block text-xs ${ui.mutedText}`}>
                Task: {tasks.find((t) => t.id === activeSession.task_id)?.title ?? activeSession.task_id}
              </span>
            ) : (
              <span className={`mt-1 block text-xs ${ui.mutedText}`}>General focus</span>
            )}
          </p>
          <Button className={`${ui.secondaryButton} mt-3`} onClick={() => completeSession(activeSession.id)} type="button">
            Complete active pomodoro
          </Button>
        </article>
      )}

      <div className={ui.formCard}>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className={ui.formLabel}>Focus on</label>
            <select
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_7.5rem_7.5rem] md:items-end">
            <div className="grid min-w-0 gap-2 sm:col-span-2 md:col-span-1">
              <label className={ui.formLabel}>Label (optional)</label>
              <input
                className={`${ui.inputClass} w-full min-w-0`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Work block name"
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <label className={ui.formLabel}>Work (minutes)</label>
              <input
                className={`${ui.inputClass} w-full min-w-0`}
                inputMode="numeric"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <label className={ui.formLabel}>Break (minutes)</label>
              <input
                className={`${ui.inputClass} w-full min-w-0`}
                inputMode="numeric"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
          <div className="flex justify-end border-t border-[#2A2F36] pt-4">
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
              {s.task_id ? `Task: ${tasks.find((t) => t.id === s.task_id)?.title ?? s.task_id} · ` : ""}
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

