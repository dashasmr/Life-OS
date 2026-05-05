"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, DailySummary, EventItem, EventType, TaskItem, TaskStatus } from "@/lib/api";

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
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus>("all");
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [taskTitle, setTaskTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pageClass = "bg-[#b4a181] text-[#efe7d7]";
  const panelClass = "border-[#2e313c] bg-[#191b24] shadow-[0_18px_45px_rgba(10,10,14,0.35)]";
  const inputClass = "bg-[#242735] border-[#3a3e4f] text-[#f4edde] placeholder:text-[#9c9a93]";
  const mutedClass = "text-[#b6b0a2]";
  const pillClass = "bg-[#2a2e3d] text-[#d8d1c2] hover:bg-[#34384a]";
  const activePillClass = "bg-[#f1e8d6] text-[#1a1d26]";

  async function loadEvents() {
    const response = await fetch(`${API_URL}/events?limit=20`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }
    setEvents(await response.json());
  }

  async function loadTasks() {
    const statusQuery = taskFilter === "all" ? "" : `&status=${taskFilter}`;
    const response = await fetch(`${API_URL}/tasks?limit=20${statusQuery}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    setTasks(await response.json());
  }

  async function loadSummary() {
    const response = await fetch(`${API_URL}/analytics/daily-summary`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch daily summary");
    }
    setSummary(await response.json());
  }

  useEffect(() => {
    Promise.all([loadEvents(), loadTasks(), loadSummary()]).catch((err: Error) => setError(err.message));
  }, [taskFilter]);

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

    await Promise.all([loadTasks(), loadEvents(), loadSummary()]);
  }

  const taskCounters = {
    all: tasks.length,
    todo: tasks.filter((task) => task.status === "todo").length,
    in_progress: tasks.filter((task) => task.status === "in_progress").length,
    done: tasks.filter((task) => task.status === "done").length
  };

  return (
    <main className={`min-h-screen ${pageClass}`}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <div>
            <p className={`text-sm uppercase tracking-[0.14em] ${mutedClass}`}>Life OS</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#f6efde]">Tasks + Events Dashboard</h1>
          </div>
        </header>

        <section className={`rounded-2xl border p-5 shadow-sm ${panelClass}`}>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              taskFilter === "all"
                ? activePillClass
                : pillClass
            }`}
            onClick={() => setTaskFilter("all")}
            type="button"
          >
            All ({taskCounters.all})
          </button>
          <button
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              taskFilter === "todo"
                ? activePillClass
                : pillClass
            }`}
            onClick={() => setTaskFilter("todo")}
            type="button"
          >
            Todo ({taskCounters.todo})
          </button>
          <button
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              taskFilter === "in_progress"
                ? activePillClass
                : pillClass
            }`}
            onClick={() => setTaskFilter("in_progress")}
            type="button"
          >
            In progress ({taskCounters.in_progress})
          </button>
          <button
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              taskFilter === "done"
                ? activePillClass
                : pillClass
            }`}
            onClick={() => setTaskFilter("done")}
            type="button"
          >
            Done ({taskCounters.done})
          </button>
        </div>
        <form onSubmit={onCreateTask} className="mt-3 grid gap-3">
          <label className={`text-sm ${mutedClass}`}>Task title</label>
          <input
            className={`rounded-xl border p-2.5 ${inputClass}`}
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Example: Finish backend MVP docs"
          />
          <button className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4]" type="submit">
            Add task
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className="font-medium text-[#f2ead9]">{task.title}</p>
              <p className={`text-sm ${mutedClass}`}>Status: {task.status}</p>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-lg bg-[#7f8da3] px-3 py-1 text-xs font-semibold text-[#171b23] hover:bg-[#93a0b4]"
                  onClick={() => updateTaskStatus(task.id, "in_progress")}
                  type="button"
                >
                  Start
                </button>
                <button
                  className="rounded-lg bg-[#d2bc93] px-3 py-1 text-xs font-semibold text-[#2b2317] hover:bg-[#dec9a4]"
                  onClick={() => updateTaskStatus(task.id, "done")}
                  type="button"
                >
                  Done
                </button>
                <button
                  className="rounded-lg bg-[#343949] px-3 py-1 text-xs font-semibold text-[#ddd5c6] hover:bg-[#40465a]"
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

      <form onSubmit={onSubmit} className={`mt-6 grid gap-3 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Manual event (debug)</h2>
        <label className={`text-sm ${mutedClass}`}>Event type</label>
        <select
          className={`rounded-xl border p-2.5 ${inputClass}`}
          value={eventType}
          onChange={(e) => setEventType(e.target.value as EventType)}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label className={`text-sm ${mutedClass}`}>Payload JSON</label>
        <textarea
          className={`min-h-24 rounded-xl border p-2.5 font-mono text-sm ${inputClass}`}
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
        />

        <button className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4]" type="submit">
          Add event
        </button>
      </form>

      {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

      <section className={`mt-8 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Daily summary</h2>
        {summary ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Date</p>
              <p className="font-medium text-[#f2ead9]">{summary.date}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Events total</p>
              <p className="font-medium text-[#f2ead9]">{summary.events_total}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Tasks created</p>
              <p className="font-medium text-[#f2ead9]">{summary.tasks_created}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Tasks in progress</p>
              <p className="font-medium text-[#f2ead9]">{summary.tasks_in_progress}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Tasks completed</p>
              <p className="font-medium text-[#f2ead9]">{summary.tasks_completed}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Cleaning done</p>
              <p className="font-medium text-[#f2ead9]">{summary.cleanings_done}</p>
            </article>
          </div>
        ) : (
          <p className={`mt-3 ${mutedClass}`}>Loading summary...</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Latest events</h2>
        <div className="mt-3 space-y-3">
          {events.map((item) => (
            <article key={item.id} className={`rounded-xl border p-3 ${panelClass}`}>
              <p className="font-medium text-[#f2ead9]">{item.type}</p>
              <p className={`text-sm ${mutedClass}`}>{new Date(item.created_at).toLocaleString()}</p>
              <pre className="mt-2 overflow-auto rounded-lg bg-[#151822] p-2 text-xs text-[#d7d0c1]">
                {JSON.stringify(item.payload, null, 2)}
              </pre>
            </article>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
