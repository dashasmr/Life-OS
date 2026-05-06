"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, EventItem, EventType } from "@/lib/api";
import { formatDateTimeFiNumeric } from "@/lib/datetime";
import { ui } from "@/lib/ui";

const EVENT_FILTERS: Array<{ id: "all" | EventType; label: string }> = [
  { id: "all", label: "All" },
  { id: "task_completed", label: "Tasks" },
  { id: "income_added", label: "Income" },
  { id: "expense_added", label: "Expenses" },
  { id: "cleaning_done", label: "Cleaning" },
  { id: "focus_started", label: "Focus start" },
  { id: "focus_ended", label: "Focus end" },
  { id: "pomodoro_completed", label: "Pomodoro" },
  { id: "work_started", label: "Manual" }
];

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function eventDetails(item: EventItem): Array<{ label: string; value: string }> {
  const payload = item.payload as Record<string, unknown>;

  switch (item.type) {
    case "work_started":
      return [{ label: "Note", value: formatPayloadValue(payload.note) }];
    case "focus_started":
      return [{ label: "Label", value: formatPayloadValue(payload.label) }];
    case "focus_ended":
      return [{ label: "Duration", value: `${Math.round(Number(payload.duration_seconds ?? 0))} sec` }];
    case "pomodoro_completed":
      return [
        { label: "Work", value: `${formatPayloadValue(payload.work_minutes)} min` },
        { label: "Break", value: `${formatPayloadValue(payload.break_minutes)} min` }
      ];
    case "income_added":
    case "expense_added":
      return [
        { label: "Category", value: formatPayloadValue(payload.category) },
        { label: "Amount", value: formatPayloadValue(payload.amount) }
      ];
    case "cleaning_done":
      return [{ label: "Zone", value: formatPayloadValue(payload.zone_name) }];
    case "task_completed":
      return [
        { label: "Task", value: formatPayloadValue(payload.title) },
        { label: "Status", value: formatPayloadValue(payload.status) }
      ];
    default:
      return Object.entries(payload).map(([key, value]) => ({
        label: key.replaceAll("_", " "),
        value: formatPayloadValue(value)
      }));
  }
}

export default function ActivityPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventFilter, setEventFilter] = useState<"all" | EventType>("all");
  const [dateFilter, setDateFilter] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      const response = await fetch(`${API_URL}/events?limit=100`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch activity log");
      const rawItems = (await response.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
      setEvents(rawItems.filter((item) => item.type !== "task_in_progress") as EventItem[]);
    }

    loadEvents().catch((err: Error) => setError(err.message));
  }, []);

  const filteredEvents = useMemo(() => {
    const now = Date.now();

    const byType = eventFilter === "all" ? events : events.filter((event) => event.type === eventFilter);

    const byDate = byType.filter((event) => {
      if (dateFilter === "all") return true;
      const created = new Date(event.created_at).getTime();
      if (Number.isNaN(created)) return false;

      if (dateFilter === "today") {
        const today = new Date();
        const eventDate = new Date(created);
        return (
          eventDate.getFullYear() === today.getFullYear() &&
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getDate() === today.getDate()
        );
      }

      const days = dateFilter === "7d" ? 7 : 30;
      return created >= now - days * 24 * 60 * 60 * 1000;
    });

    const query = searchQuery.trim().toLowerCase();
    if (!query) return byDate;

    return byDate.filter((event) => {
      const payloadText = JSON.stringify(event.payload).toLowerCase();
      const typeText = event.type.toLowerCase();
      return typeText.includes(query) || payloadText.includes(query);
    });
  }, [events, eventFilter, dateFilter, searchQuery]);

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-white">Activity log</h1>
        <p className={`mt-1 text-sm ${ui.mutedText}`}>Full events history for analytics and debugging.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className={ui.inputClass}
            placeholder="Search in type, note, category, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button className={dateFilter === "today" ? ui.pillActive : ui.pill} onClick={() => setDateFilter("today")} type="button">
              Today
            </button>
            <button className={dateFilter === "7d" ? ui.pillActive : ui.pill} onClick={() => setDateFilter("7d")} type="button">
              7 days
            </button>
            <button className={dateFilter === "30d" ? ui.pillActive : ui.pill} onClick={() => setDateFilter("30d")} type="button">
              30 days
            </button>
            <button className={dateFilter === "all" ? ui.pillActive : ui.pill} onClick={() => setDateFilter("all")} type="button">
              All
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EVENT_FILTERS.map((filter) => (
            <button
              key={filter.id}
              className={eventFilter === filter.id ? ui.pillActive : ui.pill}
              onClick={() => setEventFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-4 space-y-0">
          {filteredEvents.map((item) => (
            <article key={item.id} className="flex gap-3 border-b border-[#2A2F36] py-4 last:border-b-0">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-[#C6A36B]" />
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize text-white">{item.type.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-[#8A8F98]">{formatDateTimeFiNumeric(item.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eventDetails(item).map((detail) => (
                    <span
                      key={`${item.id}-${detail.label}`}
                      className="rounded-lg border border-[#2A2F36] bg-[#171B21] px-2.5 py-1 text-xs text-[#8A8F98]"
                    >
                      <span className="text-[#E5E5E5]">{detail.label}:</span> {detail.value}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
          {!filteredEvents.length && <p className="py-2 text-sm text-[#8A8F98]">No activity for this filter.</p>}
        </div>
      </section>
    </div>
  );
}

