"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, EventItem } from "@/lib/api";
import { localCalendarDayKeyFromDate } from "@/lib/datetime";
import { buildDailyTimeline, type TimelineRow } from "@/lib/timeline";
import { ui } from "@/lib/ui";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayHeading(dayKey: string): string {
  const [ys, ms, ds] = dayKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const day = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) return dayKey;
  const dt = new Date(y, m - 1, day);
  if (Number.isNaN(dt.getTime())) return dayKey;
  return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function TimelineList({ rows }: { rows: TimelineRow[] }) {
  return (
    <ul className="relative ml-1 border-l border-[#2A2F36] pl-8">
      {rows.map((row, i) => (
        <li key={row.id} className={`relative ${i < rows.length - 1 ? "pb-10" : "pb-1"}`}>
          <span
            className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-[#C6A36B] shadow-[0_0_0_4px_#11151A]"
            aria-hidden
          />
          <time className="text-sm font-medium tabular-nums text-[#C6A36B]" dateTime={new Date(row.atMs).toISOString()}>
            {row.timeLabel}
          </time>
          <p className="mt-1 text-base font-medium leading-snug text-white">{row.headline}</p>
          {row.detail ? <p className={`mt-1 text-sm leading-relaxed ${ui.mutedText}`}>{row.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export default function DailyTimelinePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dayKey, setDayKey] = useState(todayInputValue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/events?limit=500`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load events");
        const raw = (await res.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
        setEvents(raw.filter((e) => e.type !== "task_in_progress") as EventItem[]);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => buildDailyTimeline(events, dayKey), [events, dayKey]);

  const isToday = dayKey === localCalendarDayKeyFromDate(new Date());

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-white">Daily timeline</h1>
        <p className={ui.pageHint}>How your day unfolded — one chronological stream from your event log.</p>
        <p className={ui.microHint}>Tip: pick any calendar day; events use your local timezone.</p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <label className={ui.formLabel} htmlFor="timeline-day">
              Day
            </label>
            <input
              id="timeline-day"
              type="date"
              className={ui.inputClass}
              value={dayKey}
              onChange={(e) => setDayKey(e.target.value)}
            />
          </div>
          <p className={`pb-2 text-sm ${ui.mutedText}`}>
            {formatDayHeading(dayKey)}
            {isToday ? " · Today" : ""}
          </p>
        </div>

        {error && <p className="mt-6 text-[#f7b0a2]">{error}</p>}
        {loading && <p className={`mt-6 text-sm ${ui.mutedText}`}>Loading events…</p>}

        {!loading && !error && rows.length === 0 && (
          <div className="mt-8 rounded-xl border border-[#2A2F36] bg-[#141A22] px-6 py-12 text-center">
            <p className="text-lg font-medium text-white">Nothing logged this day yet</p>
            <p className={`mt-2 text-sm ${ui.mutedText}`}>
              Complete tasks, run focus, add expenses, or mark cleaning — they will appear here in order.
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="mt-8 rounded-2xl border border-[#2A2F36] bg-[#0F1318] p-6 md:p-8">
            <TimelineList rows={rows} />
          </div>
        )}
      </section>
    </div>
  );
}
