"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, EventItem } from "@/lib/api";
import { computeConsistencyStreaks } from "@/lib/consistency";
import { ui } from "@/lib/ui";

function streakDaysPhrase(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

function normalizeEventList(rawItems: Array<Omit<EventItem, "type"> & { type: string }>): EventItem[] {
  return rawItems.filter((item) => item.type !== "task_in_progress") as EventItem[];
}

export default function ConsistencyPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/events?limit=500`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("events");
        const rawItems = (await res.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
        setEvents(normalizeEventList(rawItems));
      })
      .catch(() => setError("Could not load events for streaks."));
  }, []);

  const consistencyStreaks = useMemo(() => computeConsistencyStreaks(events, new Date()), [events]);

  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-white">Consistency</h1>
        <p className={ui.pageHint}>
          Streaks from your event log — regularity, not just task checkmarks. Uses up to 500 recent events.
        </p>
        {error && <p className="mt-3 text-[#f7b0a2]">{error}</p>}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#2A2F36] bg-[#0F1318] p-3 md:p-4">
            <p className="text-sm font-medium leading-snug text-white">
              <span aria-hidden className="mr-1.5">
                🔥
              </span>
              Focus streak
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold tabular-nums ${consistencyStreaks.focusDays > 0 ? "text-[#f3d59e]" : "text-[#8A8F98]"}`}
              suppressHydrationWarning
            >
              {streakDaysPhrase(consistencyStreaks.focusDays)}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${ui.mutedText}`}>
              {consistencyStreaks.focusDays > 0
                ? "Days in a row with any focus / Pomodoro event."
                : "No streak yet — start or finish a focus session today."}
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2F36] bg-[#0F1318] p-3 md:p-4">
            <p className="text-sm font-medium leading-snug text-white">
              <span aria-hidden className="mr-1.5">
                🧹
              </span>
              Cleaning streak
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold tabular-nums ${consistencyStreaks.cleaningDays > 0 ? "text-[#b7e4c7]" : "text-[#8A8F98]"}`}
              suppressHydrationWarning
            >
              {streakDaysPhrase(consistencyStreaks.cleaningDays)}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${ui.mutedText}`}>
              {consistencyStreaks.cleaningDays > 0
                ? "Days in a row with at least one cleaning_done event."
                : "No streak yet — log cleaning from the Cleaning page."}
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2F36] bg-[#0F1318] p-3 md:p-4">
            <p className="text-sm font-medium leading-snug text-white">
              <span aria-hidden className="mr-1.5">
                ✅
              </span>
              Task streak
            </p>
            <p
              className={`mt-1.5 text-xl font-semibold tabular-nums ${consistencyStreaks.taskDays > 0 ? "text-white" : "text-[#8A8F98]"}`}
              suppressHydrationWarning
            >
              {streakDaysPhrase(consistencyStreaks.taskDays)}
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${ui.mutedText}`}>
              {consistencyStreaks.taskDays > 0
                ? "Days in a row completing at least one task."
                : "No streak yet — complete a task to begin."}
            </p>
          </div>
        </div>
        <p className={`mt-3 text-[11px] leading-snug ${ui.mutedText}`}>Local calendar days, up to 500 recent events.</p>
      </section>
    </div>
  );
}
