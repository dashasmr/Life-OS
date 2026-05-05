"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, EventItem, EventType, TaskItem, TaskStatus } from "@/lib/api";

const EVENT_TYPES: EventType[] = [
  "work_started",
  "task_in_progress",
  "task_completed",
  "expense_added",
  "cleaning_done"
];

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    const response = await fetch(`${API_URL}/events?limit=20`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }
    setEvents(await response.json());
  }

  async function loadTasks() {
    const response = await fetch(`${API_URL}/tasks?limit=20`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    setTasks(await response.json());
  }

  useEffect(() => {
    Promise.all([loadEvents(), loadTasks()]).catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError("Payload must be valid JSON");
      return;
    }

    const response = await fetch(`${API_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventType,
        source: "web",
        payload
      })
    });

    if (!response.ok) {
      setError("Failed to create event");
      return;
    }

    setPayloadText('{"note":"manual event"}');
    await loadEvents();
  }

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!taskTitle.trim()) {
      setError("Task title is required");
      return;
    }

    const response = await fetch(`${API_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle.trim() })
    });

    if (!response.ok) {
      setError("Failed to create task");
      return;
    }

    setTaskTitle("");
    await loadTasks();
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    setError(null);
    const response = await fetch(`${API_URL}/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      setError("Failed to update task status");
      return;
    }

    await Promise.all([loadTasks(), loadEvents()]);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">Life OS MVP - Tasks + Events</h1>

      <section className="mt-6 rounded-xl bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <form onSubmit={onCreateTask} className="mt-3 grid gap-3">
          <label className="text-sm text-slate-300">Task title</label>
          <input
            className="rounded-md bg-slate-800 p-2"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Example: Finish backend MVP docs"
          />
          <button className="rounded-md bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500" type="submit">
            Add task
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-lg bg-slate-800 p-3">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-slate-400">Status: {task.status}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
                  onClick={() => updateTaskStatus(task.id, "in_progress")}
                  type="button"
                >
                  Start
                </button>
                <button
                  className="rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-500"
                  onClick={() => updateTaskStatus(task.id, "done")}
                  type="button"
                >
                  Done
                </button>
                <button
                  className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
                  onClick={() => updateTaskStatus(task.id, "todo")}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-xl bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Manual event (debug)</h2>
        <label className="text-sm text-slate-300">Event type</label>
        <select
          className="rounded-md bg-slate-800 p-2"
          value={eventType}
          onChange={(e) => setEventType(e.target.value as EventType)}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label className="text-sm text-slate-300">Payload JSON</label>
        <textarea
          className="min-h-24 rounded-md bg-slate-800 p-2 font-mono text-sm"
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
        />

        <button className="rounded-md bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500" type="submit">
          Add event
        </button>
      </form>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Latest events</h2>
        <div className="mt-3 space-y-3">
          {events.map((item) => (
            <article key={item.id} className="rounded-lg bg-slate-900 p-3">
              <p className="font-medium">{item.type}</p>
              <p className="text-sm text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
              <pre className="mt-2 overflow-auto rounded bg-slate-800 p-2 text-xs">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
