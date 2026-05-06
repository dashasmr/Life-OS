"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, TaskItem, TaskPriority, TaskStatus } from "@/lib/api";
import { ui } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | TaskStatus>("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "today" | "week">("all");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadTasks() {
    const statusQuery = taskFilter === "all" ? "" : `&status=${taskFilter}`;
    try {
      const response = await fetch(`${API_URL}/tasks?limit=50${statusQuery}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      setTasks(await response.json());
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  useEffect(() => {
    loadTasks().catch((err: Error) => setError(err.message));
  }, [taskFilter]);

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!taskTitle.trim()) {
      setError("Task title is required");
      toast.error("Task title is required");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          priority: taskPriority,
          due_date: taskDueDate || null
        })
      });
      if (!response.ok) {
        setError("Failed to create task");
        toast.error("Failed to create task");
        return;
      }
      setTaskTitle("");
      setTaskPriority("medium");
      setTaskDueDate("");
      toast.success("Task added");
      await loadTasks();
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    setError(null);
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        setError("Failed to update task status");
        toast.error("Failed to update task status");
        return;
      }
      toast.success("Task status updated");
      await loadTasks();
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }

  const counters = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length
  };
  const priorityLabel: Record<TaskPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High"
  };

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const filteredTasks = tasks.filter((task) => {
    if (dueFilter === "all" || !task.due_date) return dueFilter === "all" ? true : false;

    const due = new Date(task.due_date);
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    if (dueFilter === "overdue") return dueStart < todayStart && task.status !== "done";
    if (dueFilter === "today") return dueStart.getTime() === todayStart.getTime();
    if (dueFilter === "week") return dueStart >= todayStart && dueStart <= weekEnd;
    return true;
  });
  const statusLabel: Record<TaskStatus, string> = {
    todo: "Todo",
    in_progress: "In progress",
    done: "Done"
  };

  function priorityBadgeClass(priority: TaskPriority): string {
    if (priority === "high") return "border border-[#7a2b2b] bg-[#2a1616] text-[#ffb3b3]";
    if (priority === "medium") return "border border-[#6d572f] bg-[#2a2418] text-[#f3d59e]";
    return "border border-[#2f4b3a] bg-[#17231c] text-[#b7e4c7]";
  }

  function getDueMeta(dueDate: string | null, status: TaskStatus): { label: string; className: string } | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (Number.isNaN(dueStart.getTime())) return null;

    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0 && status !== "done") {
      return { label: `Overdue (${dueDate})`, className: "border border-[#7a2b2b] bg-[#2a1616] text-[#ffb3b3]" };
    }
    if (diffDays === 0) {
      return { label: `Due today (${dueDate})`, className: "border border-[#6d572f] bg-[#2a2418] text-[#f3d59e]" };
    }
    return { label: `Due ${dueDate}`, className: "border border-[#2A2F36] bg-[#171B21] text-[#c9d0d8]" };
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className={ui.pageHint}>
          Add a task, pick priority, then move it through Todo -> In progress -> Done. Use advanced deadline filters only when you need planning focus.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            tasks.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: add task -> start -> done</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={taskFilter === "all" ? ui.pillActive : ui.pill} onClick={() => setTaskFilter("all")} type="button">
            All ({counters.all})
          </button>
          <button className={taskFilter === "todo" ? ui.pillActive : ui.pill} onClick={() => setTaskFilter("todo")} type="button">
            Todo ({counters.todo})
          </button>
          <button
            className={taskFilter === "in_progress" ? ui.pillActive : ui.pill}
            onClick={() => setTaskFilter("in_progress")}
            type="button"
          >
            In progress ({counters.in_progress})
          </button>
          <button className={taskFilter === "done" ? ui.pillActive : ui.pill} onClick={() => setTaskFilter("done")} type="button">
            Done ({counters.done})
          </button>
        </div>
        <details className="mt-3 rounded-xl border border-[#2A2F36] bg-[#11151A] px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-[#C6A36B]">Advanced filters: deadlines</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={dueFilter === "all" ? ui.pillActive : ui.pill} onClick={() => setDueFilter("all")} type="button">
              All deadlines
            </button>
            <button className={dueFilter === "overdue" ? ui.pillActive : ui.pill} onClick={() => setDueFilter("overdue")} type="button">
              Overdue
            </button>
            <button className={dueFilter === "today" ? ui.pillActive : ui.pill} onClick={() => setDueFilter("today")} type="button">
              Today
            </button>
            <button className={dueFilter === "week" ? ui.pillActive : ui.pill} onClick={() => setDueFilter("week")} type="button">
              This week
            </button>
          </div>
        </details>

        <div className={ui.formCard}>
          <form onSubmit={onCreateTask} className={ui.formGrid}>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Task title</label>
              <input className={ui.inputClass} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Example: Ship Finance MVP" />
            </div>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Priority</label>
              <select className={ui.inputClass} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className={ui.formLabel}>Due date (optional)</label>
              <input className={ui.inputClass} type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            </div>
            <div className="flex items-end justify-end md:col-span-2">
              <Button className={ui.primaryButton} type="submit">
                Add task
              </Button>
            </div>
          </form>
        </div>

        {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 space-y-3">
          {filteredTasks.length === 0 && (
            <div className={ui.emptyState}>No tasks for current filters yet. Add your first task above.</div>
          )}
          {filteredTasks.map((task) => (
            <article key={task.id} className={ui.card}>
            <p className={ui.cardTitle}>{task.title}</p>
            <p className={`text-sm ${ui.mutedText}`}>Status: {statusLabel[task.status]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${priorityBadgeClass(task.priority)}`}>
                Priority: {priorityLabel[task.priority]}
              </span>
              {(() => {
                const due = getDueMeta(task.due_date, task.status);
                if (!due) return null;
                return (
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${due.className}`}>
                    {due.label}
                  </span>
                );
              })()}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="h-10 rounded-xl bg-[#C6A36B] px-5 text-sm font-medium text-black shadow-[0_4px_14px_rgba(198,163,107,0.2)] hover:-translate-y-px hover:bg-[#A8844F] active:translate-y-0"
                onClick={() => updateTaskStatus(task.id, "in_progress")}
                type="button"
              >
                Start
              </Button>
              <Button
                className="h-10 rounded-xl bg-[#C6A36B] px-5 text-sm font-medium text-black shadow-[0_4px_14px_rgba(198,163,107,0.2)] hover:-translate-y-px hover:bg-[#A8844F] active:translate-y-0"
                onClick={() => updateTaskStatus(task.id, "done")}
                type="button"
              >
                Done
              </Button>
              <Button
                className="h-10 rounded-xl border border-[#C6A36B] bg-transparent px-5 text-sm font-medium text-[#C6A36B] hover:bg-[#171B21] hover:text-[#E5E5E5]"
                onClick={() => updateTaskStatus(task.id, "todo")}
                type="button"
              >
                Reset
              </Button>
            </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

