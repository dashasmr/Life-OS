"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL, TaskEnergyType, TaskItem, TaskPriority, TaskStatus } from "@/lib/api";
import { ui } from "@/lib/ui";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSectionSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendWithOfflineQueue } from "@/services/offlineQueue";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

type TaskBoardFilter = "active" | TaskStatus;

function TasksPageContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskBoardFilter>("active");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "today" | "week">("all");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEnergyType, setTaskEnergyType] = useState<TaskEnergyType | "">("");
  const [error, setError] = useState<string | null>(null);
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      setTasks(await response.json());
    } catch {
      setError("Cannot connect to API. Please check backend server.");
      toast.error("Cannot connect to API");
    }
  }, []);

  useEffect(() => {
    loadTasks().catch((err: Error) => setError(err.message));
  }, [loadTasks]);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    void loadTasks();
  }, [realtimeEpoch, loadTasks]);

  useEffect(() => {
    if (!highlightId) return;
    setTaskFilter("active");
    setDueFilter("all");
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId) return;
    const t = window.setTimeout(() => {
      document.getElementById(`task-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlightId, tasks]);

  async function onCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!taskTitle.trim()) {
      setError("Task title is required");
      toast.error("Task title is required");
      return;
    }
    try {
      const body = {
        title: taskTitle.trim(),
        priority: taskPriority,
        due_date: taskDueDate || null,
        energy_type: taskEnergyType || null
      };
      const result = await sendWithOfflineQueue({ kind: "post_task", body }, () =>
        fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Task saved locally — will upload when online." });
        setTaskTitle("");
        setTaskPriority("medium");
        setTaskDueDate("");
        setTaskEnergyType("");
        await loadTasks();
        return;
      }
      if (!result.response.ok) {
        setError("Failed to create task");
        toast.error("Failed to create task");
        return;
      }
      setTaskTitle("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setTaskEnergyType("");
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
      const result = await sendWithOfflineQueue({ kind: "patch_task_status", taskId, status }, () =>
        fetch(`${API_URL}/tasks/${taskId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        })
      );
      if (result.mode === "queued") {
        toast.info("Pending sync", { description: "Change saved locally — will sync when online." });
        await loadTasks();
        return;
      }
      if (!result.response.ok) {
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
    active: tasks.filter((t) => t.status !== "done").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length
  };
  const priorityLabel: Record<TaskPriority, string> = {
    low: "Low",
    medium: "Medium",
    high: "High"
  };

  const energyLabel: Record<TaskEnergyType, string> = {
    high_focus: "High focus",
    low_energy: "Low energy",
    creative: "Creative",
    admin: "Admin"
  };

  function energyBadgeClass(energy: TaskEnergyType | null): string {
    if (!energy) return "border border-lifeos-border bg-lifeos-muted text-lifeos-fg-muted";
    if (energy === "high_focus")
      return "border border-lifeos-status-focus-border bg-lifeos-status-focus-bg text-lifeos-status-focus";
    if (energy === "low_energy")
      return "border border-lifeos-status-healthy-border bg-lifeos-status-healthy-bg text-lifeos-status-healthy";
    if (energy === "creative")
      return "border border-lifeos-accent-soft-border bg-lifeos-accent-soft text-lifeos-accent";
    return "border border-lifeos-border-subtle bg-lifeos-muted text-lifeos-fg-secondary";
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const statusFiltered = tasks.filter((task) => {
    if (taskFilter === "active") return task.status !== "done";
    return task.status === taskFilter;
  });

  const filteredTasks = statusFiltered.filter((task) => {
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
    if (priority === "high")
      return "border border-lifeos-status-risk-border bg-lifeos-status-risk-bg text-lifeos-status-risk";
    if (priority === "medium")
      return "border border-lifeos-warning-muted bg-lifeos-warning-muted/25 text-lifeos-warning";
    return "border border-lifeos-status-healthy-border bg-lifeos-status-healthy-bg text-lifeos-status-healthy";
  }

  function getDueMeta(dueDate: string | null, status: TaskStatus): { label: string; className: string } | null {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (Number.isNaN(dueStart.getTime())) return null;

    const diffDays = Math.floor((dueStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0 && status !== "done") {
      return {
        label: `Overdue (${dueDate})`,
        className: "border border-lifeos-status-risk-border bg-lifeos-status-risk-bg text-lifeos-status-risk"
      };
    }
    if (diffDays === 0) {
      return {
        label: `Due today (${dueDate})`,
        className: "border border-lifeos-warning-muted bg-lifeos-warning-muted/25 text-lifeos-warning"
      };
    }
    return {
      label: `Due ${dueDate}`,
      className: "border border-lifeos-border bg-lifeos-muted text-lifeos-fg-secondary"
    };
  }

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className={ui.pageHint}>
          Add a task, pick priority, then move it through Todo → In progress → Done. Finished work disappears from Active but stays under Done and in the activity log. Use advanced deadline filters when you need planning focus.
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ${
            tasks.length === 0 ? "mt-3 max-h-10 opacity-100" : "mt-0 max-h-0 opacity-0"
          }`}
        >
          <p className={ui.microHint}>Tip: add task → start → done</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={taskFilter === "active" ? ui.pillActive : ui.pill} onClick={() => setTaskFilter("active")} type="button">
            Active ({counters.active})
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
        <details className="mt-3 rounded-xl border border-lifeos-border bg-lifeos-card px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-lifeos-fg-secondary">Advanced filters: deadlines</summary>
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
            <FormField id="task-title" label="Title">
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ship finance MVP"
                autoComplete="off"
              />
            </FormField>
            <FormField id="task-priority" label="Priority">
              <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as TaskPriority)}>
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="task-due" label="Due date" optional>
              <Input id="task-due" type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            </FormField>
            <FormField id="task-energy" label="Energy" optional>
              <Select
                value={taskEnergyType === "" ? "__none__" : taskEnergyType}
                onValueChange={(v) => setTaskEnergyType(v === "__none__" ? "" : (v as TaskEnergyType))}
              >
                <SelectTrigger id="task-energy" className="w-full">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  <SelectItem value="high_focus">High focus</SelectItem>
                  <SelectItem value="low_energy">Low energy</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <div className="flex items-end justify-end md:col-span-2">
              <Button className={ui.primaryButton} type="submit">
                Add task
              </Button>
            </div>
          </form>
        </div>

        {error && <p className="mt-4 text-lifeos-danger">{error}</p>}

        <div className="mt-6 space-y-3">
          {filteredTasks.length === 0 && (
            <div className={ui.emptyState}>No tasks for current filters yet. Add your first task above.</div>
          )}
          {filteredTasks.map((task) => (
            <article
              key={task.id}
              id={`task-row-${task.id}`}
              className={`${ui.card} ${highlightId === task.id ? "ring-2 ring-lifeos-accent/50 ring-offset-2 ring-offset-lifeos-page" : ""}`}
            >
            <p className={ui.cardTitle}>{task.title}</p>
            <p className={`text-sm ${ui.mutedText}`}>Status: {statusLabel[task.status]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${energyBadgeClass(task.energy_type ?? null)}`}>
                Energy: {task.energy_type ? energyLabel[task.energy_type] : "Not set"}
              </span>
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
                className="h-10 rounded-xl"
                variant="primary"
                size="sm"
                onClick={() => updateTaskStatus(task.id, "in_progress")}
                type="button"
              >
                Start
              </Button>
              <Button
                className="h-10 rounded-xl"
                variant="primary"
                size="sm"
                onClick={() => updateTaskStatus(task.id, "done")}
                type="button"
              >
                Done
              </Button>
              <Button
                className="h-10 rounded-xl"
                variant="secondary"
                size="sm"
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

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className={ui.contentClass}>
          <PageSectionSkeleton className="mt-4" />
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
