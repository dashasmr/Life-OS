import type { CleaningZone, CleaningStatus, TaskItem, TaskStatus } from "@/lib/api";

function startOfLocalDayFromDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseTaskDueLocal(dueDateStr: string | null): Date | null {
  if (!dueDateStr) return null;
  const d = new Date(dueDateStr);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDayFromDate(d);
}

export function isTaskOverdue(dueDateStr: string | null, status: TaskStatus, now: Date = new Date()): boolean {
  if (status === "done") return false;
  const dueStart = parseTaskDueLocal(dueDateStr);
  if (!dueStart) return false;
  const todayStart = startOfLocalDayFromDate(now);
  return dueStart.getTime() < todayStart.getTime();
}

/**
 * Picks one high-priority incomplete task: overdue first, then by nearest due date, then newest.
 */
export function pickTopPriorityTask(tasks: TaskItem[], now: Date = new Date()): TaskItem | null {
  const candidates = tasks.filter((t) => t.priority === "high" && t.status !== "done");
  if (!candidates.length) return null;

  const overdue = candidates.filter((t) => isTaskOverdue(t.due_date, t.status, now));
  const notOverdue = candidates.filter((t) => !isTaskOverdue(t.due_date, t.status, now));

  const byDueThenCreated = (a: TaskItem, b: TaskItem) => {
    const da = parseTaskDueLocal(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseTaskDueLocal(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  overdue.sort(byDueThenCreated);
  notOverdue.sort(byDueThenCreated);

  return overdue[0] ?? notOverdue[0] ?? null;
}

const CLEANING_ORDER: Record<CleaningStatus, number> = {
  overdue: 0,
  soon: 1,
  ok: 2
};

/**
 * Next cleaning focus: overdue, then soon, then ok. Stable tie-breaker: name.
 */
export function pickNextCleaningZone(zones: CleaningZone[]): CleaningZone | null {
  if (!zones.length) return null;
  return [...zones].sort((a, b) => {
    const oa = CLEANING_ORDER[a.status];
    const ob = CLEANING_ORDER[b.status];
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  })[0];
}

export function cleaningActionLabel(zone: CleaningZone): string {
  const name = zone.name.trim() || "Zone";
  if (zone.status === "overdue") return `${name} is overdue`;
  if (zone.status === "soon") return `${name} is due soon`;
  return `${name} is on track`;
}

/** Plain € amount; negative balances use a leading minus. */
export function formatEurPlain(value: number): string {
  if (value < 0) return `−€${Math.abs(value).toFixed(2)}`;
  return `€${value.toFixed(2)}`;
}

export function formatSignedEur(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  const abs = Math.abs(value).toFixed(2);
  return `${sign}${abs}€`;
}
