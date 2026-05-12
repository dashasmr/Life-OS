"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, EventItem, EventType } from "@/lib/api";
import { EventDetailModal } from "@/components/EventDetailModal";
import { formatTimeLocalHm } from "@/lib/datetime";
import { formatEventTypeTitle } from "@/lib/eventDetail";
import { ui } from "@/lib/ui";

const EVENT_FILTERS: Array<{ id: "all" | EventType; label: string }> = [
  { id: "all", label: "All" },
  { id: "task_completed", label: "Tasks" },
  { id: "income_added", label: "Income" },
  { id: "expense_added", label: "Expenses" },
  { id: "cleaning_done", label: "Cleaning" },
  { id: "focus_started", label: "Focus start" },
  { id: "focus_ended", label: "Focus end" },
  { id: "focus_session_completed", label: "Focus done" },
  { id: "pomodoro_completed", label: "Pomodoro" },
  { id: "work_started", label: "Manual" }
];

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** YYYY-MM-DD in the user's local calendar (for grouping). */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatActivityDayHeading(dayKey: string, now: Date = new Date()): string {
  if (dayKey === "invalid") return "Unknown date";
  const [ys, ms, ds] = dayKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return "Unknown date";

  const groupDate = startOfLocalDay(new Date(y, m - 1, day));
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (groupDate.getTime() === todayStart.getTime()) return "Today";
  if (groupDate.getTime() === yesterdayStart.getTime()) return "Yesterday";

  return groupDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function eventDetails(item: EventItem): Array<{ label: string; value: string }> {
  const payload = item.payload as Record<string, unknown>;

  switch (item.type) {
    case "work_started":
      return [{ label: "Note", value: formatPayloadValue(payload.note) }];
    case "focus_started": {
      const rows: Array<{ label: string; value: string }> = [{ label: "Label", value: formatPayloadValue(payload.label) }];
      if (payload.task_title != null && String(payload.task_title).length > 0) {
        rows.push({ label: "Task", value: formatPayloadValue(payload.task_title) });
      }
      return rows;
    }
    case "focus_ended":
      return [{ label: "Duration", value: `${Math.round(Number(payload.duration_seconds ?? 0))} sec` }];
    case "focus_session_completed": {
      const rows: Array<{ label: string; value: string }> = [
        { label: "Duration", value: `${formatPayloadValue(payload.duration_minutes)} min` }
      ];
      if (payload.task_title != null && String(payload.task_title).length > 0) {
        rows.push({ label: "Task", value: formatPayloadValue(payload.task_title) });
      } else {
        rows.push({ label: "Mode", value: "General focus" });
      }
      return rows;
    }
    case "pomodoro_completed": {
      const rows: Array<{ label: string; value: string }> = [
        { label: "Work", value: `${formatPayloadValue(payload.work_minutes)} min` },
        { label: "Break", value: `${formatPayloadValue(payload.break_minutes)} min` }
      ];
      if (payload.task_title != null && String(payload.task_title).length > 0) {
        rows.push({ label: "Task", value: formatPayloadValue(payload.task_title) });
      }
      return rows;
    }
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
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiConnectionError = "Cannot connect to API. Please check backend server.";

  useEffect(() => {
    async function loadEvents() {
      const response = await fetch(`${API_URL}/events?limit=100`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch activity log");
      const rawItems = (await response.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
      setEvents(rawItems.filter((item) => item.type !== "task_in_progress") as EventItem[]);
    }

    loadEvents().catch((err: Error) => {
      if (err.message === "Failed to fetch") {
        setError(apiConnectionError);
        return;
      }
      setError(err.message);
    });
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

  const groupedByDay = useMemo(() => {
    const sorted = [...filteredEvents].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const map = new Map<string, EventItem[]>();
    for (const item of sorted) {
      const key = localDayKey(item.created_at);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    const keys = Array.from(map.keys()).filter((k) => k !== "invalid").sort((a, b) => b.localeCompare(a));
    return keys.map((dayKey) => ({ dayKey, items: map.get(dayKey) ?? [] }));
  }, [filteredEvents]);

  return (
    <div className={ui.contentClass}>
      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-white">Activity log</h1>
        <p className={ui.pageHint}>Clean history of important actions across Life OS.</p>
        <p className={ui.microHint}>Tip: use date filter first, then search</p>

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

        <details className="mt-4 rounded-xl border border-[#2A2F36] bg-[#0F1318] px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-[#C6A36B]">Advanced filters: event type</summary>
          <div className="mt-3 flex flex-wrap gap-2">
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
        </details>

        {error && <p className="mt-4 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 space-y-10">
          {groupedByDay.map(({ dayKey, items }) => (
            <section key={dayKey}>
              <h2 className="border-b border-[#2A2F36] pb-2 text-lg font-semibold tracking-tight text-white">
                {formatActivityDayHeading(dayKey)}
              </h2>
              <ul className="mt-4 space-y-6">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-[#2A2F36]/80 pb-6 last:border-b-0 last:pb-0">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-transparent px-2 py-1 text-left transition hover:border-[#2A2F36] hover:bg-[#141A22]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A36B]/40"
                      onClick={() => setDetailEvent(item)}
                    >
                      <p className="text-sm font-medium text-white">
                        <span className="text-[#C6A36B]">•</span> {formatEventTypeTitle(item.type)}
                      </p>
                      <p className="mt-1 pl-4 text-sm tabular-nums text-[#8A8F98]">{formatTimeLocalHm(item.created_at)}</p>
                      <div className="mt-2 space-y-1 pl-4 text-sm leading-relaxed text-[#c9d0d8]">
                        {eventDetails(item).map((detail) => (
                          <p key={`${item.id}-${detail.label}`}>
                            <span className="text-[#8A8F98]">{detail.label}:</span> {detail.value}
                          </p>
                        ))}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!filteredEvents.length && <div className={ui.emptyState}>No activity for this filter yet.</div>}
        </div>
      </section>
    </div>
  );
}

