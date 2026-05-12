import type { EventItem, EventType } from "@/lib/api";

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatEur(n: unknown): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `€${x.toFixed(2)}`;
}

/** Primary line: friendly title for the event type (no snake_case in UI). */
export const TIMELINE_EVENT_HEADLINE: Record<EventType, string> = {
  work_started: "Manual event logged",
  focus_started: "Focus session started",
  focus_ended: "Focus session ended",
  focus_session_completed: "Focus session completed",
  pomodoro_completed: "Pomodoro completed",
  task_completed: "Task completed",
  income_added: "Income added",
  expense_added: "Expense added",
  cleaning_done: "Cleaning completed"
};

function joinDetail(parts: string[]): string | null {
  const cleaned = parts.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return null;
  return cleaned.join(" · ");
}

/**
 * Maps a stored event to readable headline (from type) + optional detail line.
 */
export function mapEventToTimelineCopy(event: EventItem): { headline: string; detail: string | null } {
  const headline = TIMELINE_EVENT_HEADLINE[event.type] ?? "Event";
  const p = event.payload;

  switch (event.type) {
    case "work_started":
      return { headline, detail: str(p.note) || null };
    case "focus_started": {
      const label = str(p.label);
      const task = str(p.task_title);
      const bits: string[] = [];
      if (label) bits.push(`“${label}”`);
      if (task) bits.push(`Task: ${task}`);
      return { headline, detail: joinDetail(bits) };
    }
    case "focus_ended": {
      const sec = Math.round(Number(p.duration_seconds ?? 0));
      return { headline, detail: Number.isFinite(sec) && sec > 0 ? `${sec} sec` : null };
    }
    case "focus_session_completed": {
      const mins = p.duration_minutes;
      const task = str(p.task_title);
      const bits: string[] = [];
      if (mins != null && str(mins)) bits.push(`${str(mins)} min`);
      if (task) bits.push(`Task: ${task}`);
      else bits.push("General focus");
      return { headline, detail: joinDetail(bits) };
    }
    case "pomodoro_completed": {
      const w = str(p.work_minutes);
      const b = str(p.break_minutes);
      const task = str(p.task_title);
      const bits: string[] = [];
      if (w && b) bits.push(`${w}m work / ${b}m break`);
      if (task) bits.push(`Task: ${task}`);
      return { headline, detail: joinDetail(bits) };
    }
    case "task_completed":
      return { headline, detail: str(p.title) || null };
    case "income_added":
      return { headline, detail: joinDetail([formatEur(p.amount), str(p.category)].filter(Boolean)) };
    case "expense_added":
      return { headline, detail: joinDetail([formatEur(p.amount), str(p.category)].filter(Boolean)) };
    case "cleaning_done": {
      const zone = str(p.zone_name);
      return { headline, detail: zone ? `(${zone})` : null };
    }
    default:
      return { headline, detail: null };
  }
}
