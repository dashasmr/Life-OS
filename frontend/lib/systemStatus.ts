import type { CleaningZone, FocusSession } from "@/lib/api";

export type SystemStatusTone = "positive" | "neutral" | "caution" | "critical";

export type SystemStatusPillar = {
  key: "mind" | "home" | "finance";
  title: string;
  /** Short headline, e.g. "Focused" */
  statusLabel: string;
  tone: SystemStatusTone;
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/**
 * In-flight focus counts as active mental state. Otherwise, a session counts if it
 * started or ended on the local calendar day of `now`.
 */
export function hasFocusTouchToday(sessions: FocusSession[], now: Date = new Date()): boolean {
  for (const s of sessions) {
    const started = new Date(s.started_at);
    if (Number.isNaN(started.getTime())) continue;

    if (!s.ended_at) {
      return true;
    }
    const ended = new Date(s.ended_at);
    if (Number.isNaN(ended.getTime())) continue;
    if (isSameLocalDay(started, now) || isSameLocalDay(ended, now)) {
      return true;
    }
  }
  return false;
}

/**
 * Priority: high task throughput → Productive; then any focus touch today → Focused; else Distracted.
 */
export function computeMindStatus(
  tasksCompletedToday: number,
  focusSessions: FocusSession[],
  now: Date = new Date()
): Pick<SystemStatusPillar, "statusLabel" | "tone"> {
  if (tasksCompletedToday >= 5) {
    return { statusLabel: "Productive", tone: "positive" };
  }
  if (hasFocusTouchToday(focusSessions, now)) {
    return { statusLabel: "Focused", tone: "positive" };
  }
  return { statusLabel: "Distracted", tone: "caution" };
}

export function computeHomeStatus(zones: CleaningZone[]): Pick<SystemStatusPillar, "statusLabel" | "tone"> {
  const overdue = zones.filter((z) => z.status === "overdue").length;
  if (overdue > 2) {
    return { statusLabel: "Critical", tone: "critical" };
  }
  if (overdue === 1) {
    return { statusLabel: "Needs attention", tone: "caution" };
  }
  return { statusLabel: "Stable", tone: "positive" };
}

/** Monthly cashflow balance: income − expenses for the current local calendar month. */
export function computeFinanceStatus(monthlyBalanceDelta: number | null): Pick<SystemStatusPillar, "statusLabel" | "tone"> {
  if (monthlyBalanceDelta === null || Number.isNaN(monthlyBalanceDelta)) {
    return { statusLabel: "Stable", tone: "neutral" };
  }
  if (monthlyBalanceDelta < 0) {
    return { statusLabel: "Warning", tone: "caution" };
  }
  return { statusLabel: "Stable", tone: "positive" };
}

export type SystemStatusInput = {
  tasksCompletedToday: number;
  focusSessions: FocusSession[];
  cleaningZones: CleaningZone[];
  monthlyBalanceDelta: number | null;
  now?: Date;
};

export function computeSystemStatus(input: SystemStatusInput): SystemStatusPillar[] {
  const now = input.now ?? new Date();
  const mind = computeMindStatus(input.tasksCompletedToday, input.focusSessions, now);
  const home = computeHomeStatus(input.cleaningZones);
  const finance = computeFinanceStatus(input.monthlyBalanceDelta);

  return [
    { key: "mind", title: "Mind", ...mind },
    { key: "home", title: "Home", ...home },
    { key: "finance", title: "Finance", ...finance }
  ];
}
