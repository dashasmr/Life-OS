import type { CleaningZone, EventItem, EventType } from "@/lib/api";
import { localDateKeyFromIso } from "@/lib/datetime";

export type WeeklyReviewInsightInput = {
  events: EventItem[];
  weekFromMs: number;
  weekToMs: number;
  zones: CleaningZone[];
  topExpenseCategory: string | null;
  topExpenseAmount: number;
};

function eventInWeek(createdAt: string, weekFromMs: number, weekToMs: number): boolean {
  const t = new Date(createdAt).getTime();
  return !Number.isNaN(t) && t >= weekFromMs && t < weekToMs;
}

function filterWeekEvents(events: EventItem[], weekFromMs: number, weekToMs: number): EventItem[] {
  return events.filter((e) => eventInWeek(e.created_at, weekFromMs, weekToMs));
}

/** Tasks vs focus by local day (Mon–Sun window). */
function insightTasksVsFocus(events: EventItem[], weekFromMs: number, weekToMs: number): string | null {
  const week = filterWeekEvents(events, weekFromMs, weekToMs);
  const taskByDay = new Map<string, number>();
  const focusDays = new Set<string>();

  for (const e of week) {
    const key = localDateKeyFromIso(e.created_at);
    if (!key) continue;
    if (e.type === "task_completed") {
      taskByDay.set(key, (taskByDay.get(key) ?? 0) + 1);
    }
    if (e.type === "focus_session_completed" || e.type === "focus_ended") {
      focusDays.add(key);
    }
  }

  if (focusDays.size === 0 || taskByDay.size === 0) return null;

  let sumOnFocus = 0;
  let daysOnFocus = 0;
  let sumOther = 0;
  let daysOther = 0;

  for (const [day, count] of taskByDay) {
    if (focusDays.has(day)) {
      sumOnFocus += count;
      daysOnFocus += 1;
    } else {
      sumOther += count;
      daysOther += 1;
    }
  }

  if (daysOnFocus === 0 || daysOther === 0) return null;
  const avgFocus = sumOnFocus / daysOnFocus;
  const avgOther = sumOther / daysOther;
  if (avgFocus > avgOther) {
    return "You completed more tasks on days with focus sessions.";
  }
  return null;
}

function insightCleaning(zones: CleaningZone[]): string | null {
  const overdue = zones.filter((z) => z.status === "overdue");
  if (!overdue.length) return null;
  const desk = overdue.find((z) => z.name.toLowerCase().includes("desk"));
  if (desk) {
    return "Desk cleaning is overdue.";
  }
  const name = overdue[0].name.trim() || "A zone";
  return `${name} cleaning is overdue.`;
}

function insightTopSpending(category: string | null, amount: number): string | null {
  if (!category || amount <= 0) return null;
  return `${category} was your top spending category this week.`;
}

const FALLBACK_INSIGHTS = [
  "Start a focus session when you dive into deep work — your weekly review will surface patterns.",
  "Mark cleaning zones when you finish — overdue counts show up here automatically.",
  "Log expenses with categories to see your top spending bucket next week."
] as const;

/**
 * Rule-based weekly copy; always returns at least 3 strings when possible.
 */
export function generateWeeklyInsights(input: WeeklyReviewInsightInput): string[] {
  const out: string[] = [];

  const a = insightTasksVsFocus(input.events, input.weekFromMs, input.weekToMs);
  if (a) out.push(a);

  const b = insightCleaning(input.zones);
  if (b) out.push(b);

  const c = insightTopSpending(input.topExpenseCategory, input.topExpenseAmount);
  if (c) out.push(c);

  let i = 0;
  while (out.length < 3 && i < FALLBACK_INSIGHTS.length) {
    const line = FALLBACK_INSIGHTS[i];
    if (!out.includes(line)) out.push(line);
    i += 1;
  }

  return out.slice(0, 6);
}

export function countEventsByType(
  events: EventItem[],
  types: EventType[],
  weekFromMs: number,
  weekToMs: number
): number {
  const set = new Set(types);
  return filterWeekEvents(events, weekFromMs, weekToMs).filter((e) => set.has(e.type)).length;
}

export function sumFocusMinutesInWeek(events: EventItem[], weekFromMs: number, weekToMs: number): number {
  let seconds = 0;
  for (const e of filterWeekEvents(events, weekFromMs, weekToMs)) {
    if (e.type === "focus_session_completed") {
      const p = e.payload as Record<string, unknown>;
      const sec = Number(p.duration_seconds ?? 0);
      if (Number.isFinite(sec) && sec > 0) seconds += sec;
      else seconds += Number(p.duration_minutes ?? 0) * 60;
    } else if (e.type === "focus_ended") {
      const p = e.payload as Record<string, unknown>;
      seconds += Number(p.duration_seconds ?? 0);
    }
  }
  return Math.max(0, Math.round(seconds / 60));
}

export function topExpenseCategoryInWeek(
  transactions: Array<{ kind: string; category: string; amount: number; created_at: string }>,
  weekFromMs: number,
  weekToMs: number
): { category: string; total: number } | null {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind !== "expense") continue;
    const t = new Date(tx.created_at).getTime();
    if (Number.isNaN(t) || t < weekFromMs || t >= weekToMs) continue;
    const cat = tx.category.trim() || "Uncategorized";
    sums.set(cat, (sums.get(cat) ?? 0) + tx.amount);
  }
  let best: { category: string; total: number } | null = null;
  for (const [category, total] of sums) {
    if (!best || total > best.total) best = { category, total };
  }
  return best;
}
