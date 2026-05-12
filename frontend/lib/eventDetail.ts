import type { EventItem, EventType } from "@/lib/api";

export function formatEventTypeTitle(type: EventType | string): string {
  return type
    .replaceAll("_", " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Product / domain area for Activity detail UI. */
export function eventTypeToModule(type: EventType): string {
  switch (type) {
    case "task_completed":
    case "focus_started":
    case "focus_ended":
    case "focus_session_completed":
    case "pomodoro_completed":
      return "productivity";
    case "income_added":
    case "expense_added":
      return "finance";
    case "cleaning_done":
      return "home";
    case "work_started":
      return "manual";
    default:
      return "other";
  }
}

export function isEventPayloadEmpty(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).length === 0;
}

export function formatMetadataLabel(key: string): string {
  return key.replaceAll("_", " ");
}

export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function eventToRawJsonRecord(event: EventItem): Record<string, unknown> {
  return {
    id: event.id,
    type: event.type,
    source: event.source,
    payload: event.payload,
    created_at: event.created_at
  };
}
