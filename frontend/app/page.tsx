"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  API_URL,
  DailySummary,
  EventItem,
  EventType,
  DailyInsight,
  FinanceKind,
  FinanceTransaction,
  CleaningZone,
  PomodoroSession,
  TaskItem,
  TaskStatus,
  FocusSession
} from "@/lib/api";

const EVENT_TYPES: EventType[] = [
  "work_started",
  "focus_started",
  "focus_ended",
  "task_in_progress",
  "task_completed",
  "income_added",
  "expense_added",
  "cleaning_done"
];

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [cleaningZones, setCleaningZones] = useState<CleaningZone[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus>("all");
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [taskTitle, setTaskTitle] = useState("");
  const [financeKind, setFinanceKind] = useState<FinanceKind>("expense");
  const [financeAmount, setFinanceAmount] = useState("");
  const [financeCategory, setFinanceCategory] = useState("");
  const [financeNote, setFinanceNote] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneFrequencyDays, setZoneFrequencyDays] = useState("7");
  const [focusLabel, setFocusLabel] = useState("");
  const [pomodoroLabel, setPomodoroLabel] = useState("");
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState("25");
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState("5");
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

  async function loadInsight() {
    const response = await fetch(`${API_URL}/analytics/daily-insight`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch daily insight");
    }
    setInsight(await response.json());
  }

  async function loadTransactions() {
    const response = await fetch(`${API_URL}/finance/transactions?limit=10`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch finance transactions");
    }
    setTransactions(await response.json());
  }

  async function loadCleaningZones() {
    const response = await fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch cleaning zones");
    }
    setCleaningZones(await response.json());
  }

  async function loadFocusSessions() {
    const response = await fetch(`${API_URL}/focus/sessions?limit=10`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch focus sessions");
    }
    setFocusSessions(await response.json());
  }

  async function loadPomodoroSessions() {
    const response = await fetch(`${API_URL}/pomodoro/sessions?limit=10`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch pomodoro sessions");
    }
    setPomodoroSessions(await response.json());
  }

  useEffect(() => {
    Promise.all([
      loadEvents(),
      loadTasks(),
      loadSummary(),
      loadInsight(),
      loadTransactions(),
      loadCleaningZones(),
      loadFocusSessions(),
      loadPomodoroSessions()
    ]).catch((err: Error) =>
      setError(err.message)
    );
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

    await Promise.all([loadTasks(), loadEvents(), loadSummary(), loadInsight()]);
  }

  async function onCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(financeAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!financeCategory.trim()) {
      setError("Category is required");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/finance/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: financeKind,
          amount: parsedAmount,
          category: financeCategory.trim(),
          note: financeNote.trim() || null
        })
      });

      if (!response.ok) {
        setError("Failed to create finance transaction");
        return;
      }

      setFinanceAmount("");
      setFinanceCategory("");
      setFinanceNote("");
      await Promise.all([loadTransactions(), loadEvents(), loadSummary(), loadInsight()]);
    } catch {
      setError("Cannot connect to API. Please check backend server.");
    }
  }

  async function onCreateCleaningZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const frequency = Number(zoneFrequencyDays);
    if (!zoneName.trim()) {
      setError("Zone name is required");
      return;
    }
    if (!Number.isInteger(frequency) || frequency < 1) {
      setError("Frequency must be a positive integer");
      return;
    }
    const response = await fetch(`${API_URL}/cleaning/zones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: zoneName.trim(),
        frequency_days: frequency
      })
    });
    if (!response.ok) {
      setError("Failed to create cleaning zone");
      return;
    }
    setZoneName("");
    setZoneFrequencyDays("7");
    await loadCleaningZones();
  }

  async function markZoneDone(zoneId: string) {
    setError(null);
    const response = await fetch(`${API_URL}/cleaning/zones/${zoneId}/done`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    if (!response.ok) {
      setError("Failed to mark cleaning as done");
      return;
    }
    await Promise.all([loadCleaningZones(), loadEvents(), loadSummary(), loadInsight()]);
  }

  async function startFocusSession() {
    setError(null);
    const response = await fetch(`${API_URL}/focus/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: focusLabel.trim() || null })
    });
    if (!response.ok) {
      setError("Failed to start focus session");
      return;
    }
    setFocusLabel("");
    await Promise.all([loadFocusSessions(), loadEvents()]);
  }

  async function stopFocusSession(sessionId: string) {
    setError(null);
    const response = await fetch(`${API_URL}/focus/sessions/${sessionId}/stop`, {
      method: "POST"
    });
    if (!response.ok) {
      setError("Failed to stop focus session");
      return;
    }
    await Promise.all([loadFocusSessions(), loadEvents()]);
  }

  async function startPomodoroSession() {
    setError(null);
    const work = Number(pomodoroWorkMinutes);
    const breakMinutes = Number(pomodoroBreakMinutes);
    if (!Number.isInteger(work) || work < 10) {
      setError("Work minutes must be an integer >= 10");
      return;
    }
    if (!Number.isInteger(breakMinutes) || breakMinutes < 1) {
      setError("Break minutes must be an integer >= 1");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/pomodoro/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: pomodoroLabel.trim() || null,
          work_minutes: work,
          break_minutes: breakMinutes
        })
      });
      if (!response.ok) {
        setError("Failed to start pomodoro session");
        return;
      }
      setPomodoroLabel("");
      await Promise.all([loadPomodoroSessions(), loadEvents()]);
    } catch {
      setError("Cannot connect to API. Please check backend server.");
    }
  }

  async function completePomodoroSession(sessionId: string) {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/pomodoro/sessions/${sessionId}/complete`, {
        method: "POST"
      });
      if (!response.ok) {
        setError("Failed to complete pomodoro session");
        return;
      }
      await Promise.all([loadPomodoroSessions(), loadEvents(), loadSummary(), loadInsight()]);
    } catch {
      setError("Cannot connect to API. Please check backend server.");
    }
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
        <h2 className="text-xl font-semibold">AI daily insight (MVP)</h2>
        {insight ? (
          <div className="mt-3 space-y-3">
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Headline</p>
              <p className="font-medium text-[#f2ead9]">{insight.headline}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Summary</p>
              <p className="text-[#f2ead9]">{insight.summary}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Recommendations</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#f2ead9]">
                {insight.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        ) : (
          <p className={`mt-3 ${mutedClass}`}>Loading insight...</p>
        )}
      </section>

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
              <p className={`text-sm ${mutedClass}`}>Pomodoros completed</p>
              <p className="font-medium text-[#f2ead9]">{summary.pomodoros_completed}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Income total</p>
              <p className="font-medium text-[#f2ead9]">{summary.income_total.toFixed(2)}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Expense total</p>
              <p className="font-medium text-[#f2ead9]">{summary.expense_total.toFixed(2)}</p>
            </article>
            <article className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className={`text-sm ${mutedClass}`}>Balance delta</p>
              <p className="font-medium text-[#f2ead9]">{summary.balance_delta.toFixed(2)}</p>
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

      <section className={`mt-8 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Pomodoro</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <input
            className={`rounded-xl border p-2.5 ${inputClass} md:col-span-2`}
            value={pomodoroLabel}
            onChange={(e) => setPomodoroLabel(e.target.value)}
            placeholder="Label (optional): API docs, Refactor..."
          />
          <input
            className={`rounded-xl border p-2.5 ${inputClass}`}
            value={pomodoroWorkMinutes}
            onChange={(e) => setPomodoroWorkMinutes(e.target.value)}
            placeholder="Work min"
          />
          <input
            className={`rounded-xl border p-2.5 ${inputClass}`}
            value={pomodoroBreakMinutes}
            onChange={(e) => setPomodoroBreakMinutes(e.target.value)}
            placeholder="Break min"
          />
          <button
            className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4] md:col-span-4"
            onClick={startPomodoroSession}
            type="button"
          >
            Start pomodoro
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {pomodoroSessions.map((session) => (
            <article key={session.id} className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className="font-medium text-[#f2ead9]">{session.label ?? "Untitled pomodoro"}</p>
              <p className={`text-sm ${mutedClass}`}>
                {session.work_minutes}m work / {session.break_minutes}m break - {session.status}
              </p>
              {session.status === "running" && (
                <button
                  className="mt-2 rounded-lg bg-[#d2bc93] px-3 py-1 text-xs font-semibold text-[#2b2317] hover:bg-[#dec9a4]"
                  onClick={() => completePomodoroSession(session.id)}
                  type="button"
                >
                  Complete pomodoro
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={`mt-8 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Focus sessions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className={`rounded-xl border p-2.5 ${inputClass}`}
            value={focusLabel}
            onChange={(e) => setFocusLabel(e.target.value)}
            placeholder="Session label (optional): Deep work, Reading..."
          />
          <button className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4]" onClick={startFocusSession} type="button">
            Start focus
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {focusSessions.map((session) => (
            <article key={session.id} className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className="font-medium text-[#f2ead9]">{session.label ?? "Untitled focus session"}</p>
              <p className={`text-sm ${mutedClass}`}>
                Started: {new Date(session.started_at).toLocaleString()}
                {session.duration_seconds ? ` - Duration: ${Math.round(session.duration_seconds / 60)} min` : " - In progress"}
              </p>
              {!session.ended_at && (
                <button
                  className="mt-2 rounded-lg bg-[#d2bc93] px-3 py-1 text-xs font-semibold text-[#2b2317] hover:bg-[#dec9a4]"
                  onClick={() => stopFocusSession(session.id)}
                  type="button"
                >
                  Stop session
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className={`mt-8 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Cleaning</h2>
        <form onSubmit={onCreateCleaningZone} className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Zone name</label>
            <input
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Desk, Kitchen, Bathroom..."
            />
          </div>
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Frequency (days)</label>
            <input
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={zoneFrequencyDays}
              onChange={(e) => setZoneFrequencyDays(e.target.value)}
              placeholder="7"
            />
          </div>
          <button className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4] md:col-span-2" type="submit">
            Add zone
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {cleaningZones.map((zone) => (
            <article key={zone.id} className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className="font-medium text-[#f2ead9]">{zone.name}</p>
              <p className={`text-sm ${mutedClass}`}>
                Every {zone.frequency_days} days - Status: {zone.status}
              </p>
              <button
                className="mt-2 rounded-lg bg-[#d2bc93] px-3 py-1 text-xs font-semibold text-[#2b2317] hover:bg-[#dec9a4]"
                onClick={() => markZoneDone(zone.id)}
                type="button"
              >
                Mark cleaned
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={`mt-8 rounded-2xl border p-5 ${panelClass}`}>
        <h2 className="text-xl font-semibold">Finance</h2>
        <form onSubmit={onCreateTransaction} className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Type</label>
            <select
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={financeKind}
              onChange={(e) => setFinanceKind(e.target.value as FinanceKind)}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Amount</label>
            <input
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={financeAmount}
              onChange={(e) => setFinanceAmount(e.target.value)}
              placeholder="100.00"
            />
          </div>
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Category</label>
            <input
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={financeCategory}
              onChange={(e) => setFinanceCategory(e.target.value)}
              placeholder="Food, Salary, Transport..."
            />
          </div>
          <div className="grid gap-2">
            <label className={`text-sm ${mutedClass}`}>Note</label>
            <input
              className={`rounded-xl border p-2.5 ${inputClass}`}
              value={financeNote}
              onChange={(e) => setFinanceNote(e.target.value)}
              placeholder="Optional comment"
            />
          </div>
          <button className="rounded-xl bg-[#f1e8d6] px-4 py-2 text-sm font-semibold text-[#1a1d26] hover:bg-[#e7dbc4] md:col-span-2" type="submit">
            Add transaction
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {transactions.map((transaction) => (
            <article key={transaction.id} className="rounded-xl border border-[#313544] bg-[#202331] p-3">
              <p className="font-medium text-[#f2ead9]">
                {transaction.kind === "income" ? "+" : "-"}
                {transaction.amount.toFixed(2)} ({transaction.category})
              </p>
              <p className={`text-sm ${mutedClass}`}>{transaction.note ?? "No note"}</p>
            </article>
          ))}
        </div>
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
