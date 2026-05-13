"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  API_URL,
  EventItem,
  type DetectedHabit,
  type HabitSupportAction,
  fetchDetectedHabits
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { normalizeAnalyticsEvents } from "@/lib/analytics/normalize";
import { computeConsistencyStreaks } from "@/lib/consistency";
import {
  appendExtraDailyPlanItem,
  type DailyPlanCategory,
  type DailyPlanPriority
} from "@/lib/dailyPlan";
import { logHabitSupportActionDone } from "@/lib/habits/logSupport";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

function streakDaysPhrase(days: number): string {
  return days === 1 ? "1 day" : `${days} days`;
}

export default function ConsistencyPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<DetectedHabit[] | null>(null);
  const [habitsError, setHabitsError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const loadEventsForStreaks = useCallback(async () => {
    const res = await fetch(`${API_URL}/events?limit=500`, { cache: "no-store" });
    if (!res.ok) throw new Error("events");
    const rawItems = (await res.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
    setEvents(normalizeAnalyticsEvents(rawItems));
  }, []);

  const loadHabits = useCallback(async () => {
    const rows = await fetchDetectedHabits(45);
    setHabits(rows.map((r) => ({ ...r, suggestedActions: r.suggestedActions ?? [] })));
  }, []);

  useEffect(() => {
    loadEventsForStreaks().catch(() => setError("Could not load events for streaks."));
  }, [loadEventsForStreaks]);

  useEffect(() => {
    loadHabits().catch(() => setHabitsError("Could not load detected habits."));
  }, [loadHabits]);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    loadEventsForStreaks().catch(() => setError("Could not load events for streaks."));
    loadHabits().catch(() => setHabitsError("Could not load detected habits."));
  }, [realtimeEpoch, loadEventsForStreaks, loadHabits]);

  const consistencyStreaks = useMemo(() => computeConsistencyStreaks(events, new Date()), [events]);

  const runSupportAction = useCallback(
    async (habit: DetectedHabit, action: HabitSupportAction) => {
      const busyKey = `${habit.id}:${action.id}`;
      setBusyAction(busyKey);
      try {
        if (action.type === "navigate" && action.target) {
          await logHabitSupportActionDone(habit.id, action.id, "navigate");
          router.push(action.target as Route);
          toast.success("Opening…");
        } else if (action.type === "mutation" && action.target === "focus_session_start") {
          const label =
            typeof action.payload?.label === "string" ? action.payload.label : "Morning focus (25m)";
          const res = await fetch(`${API_URL}/focus/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label, task_id: null })
          });
          if (!res.ok) throw new Error("focus");
          await logHabitSupportActionDone(habit.id, action.id, "mutation");
          toast.success("Focus session started");
          router.push("/work/focus" as Route);
        } else if (action.type === "plan_item" && action.payload && typeof action.payload === "object") {
          const p = action.payload as Record<string, unknown>;
          const planItemId = typeof p.planItemId === "string" ? p.planItemId : undefined;
          const title = typeof p.title === "string" ? p.title : "Planned item";
          const category = typeof p.category === "string" ? (p.category as DailyPlanCategory) : "task";
          const priority = typeof p.priority === "string" ? (p.priority as DailyPlanPriority) : "medium";
          if (!planItemId) throw new Error("plan_item");
          const added = appendExtraDailyPlanItem(new Date(), {
            id: planItemId,
            title,
            category,
            priority
          });
          await logHabitSupportActionDone(habit.id, action.id, "plan_item");
          toast.success(added ? "Added to today’s plan (Overview → Daily plan)" : "Already on today’s plan");
        }
      } catch {
        toast.error("Couldn’t complete this action");
      } finally {
        setBusyAction(null);
      }
    },
    [router]
  );

  return (
    <div className={cn(ui.contentClass, "space-y-ds-5 md:space-y-ds-6")}>
      <section className={cn(ui.panelClass, "space-y-ds-4")}>
        <div>
          <h1 className="text-2xl font-semibold text-lifeos-fg">Consistency</h1>
          <p className={cn(ui.pageHint, "mt-ds-2")}>
            Streaks from your event log — regularity, not just task checkmarks. Uses up to 500 recent events.
          </p>
        </div>
        {error && <p className="text-sm text-lifeos-danger">{error}</p>}

        <div className={ds.surfaces.metricBand}>
          <p className={cn(ds.typography.sectionEyebrow, "mb-ds-3")}>Streaks</p>
          <div className="grid gap-ds-4 sm:grid-cols-3 sm:gap-ds-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-lifeos-fg-secondary">
                <span aria-hidden className="mr-1">
                  🔥
                </span>
                Focus
              </p>
              <p
                className={`mt-ds-1 text-lg font-semibold tabular-nums sm:text-xl ${consistencyStreaks.focusDays > 0 ? "text-lifeos-warning" : "text-lifeos-fg-muted"}`}
                suppressHydrationWarning
              >
                {streakDaysPhrase(consistencyStreaks.focusDays)}
              </p>
              <p className={`mt-ds-1 text-[11px] leading-snug ${ui.mutedText}`}>
                {consistencyStreaks.focusDays > 0
                  ? "Days with any focus / Pomodoro event."
                  : "Start or finish a focus session today."}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-lifeos-border-subtle/[0.08] sm:pl-ds-4">
              <p className="text-xs font-medium text-lifeos-fg-secondary">
                <span aria-hidden className="mr-1">
                  🧹
                </span>
                Cleaning
              </p>
              <p
                className={`mt-ds-1 text-lg font-semibold tabular-nums sm:text-xl ${consistencyStreaks.cleaningDays > 0 ? "text-lifeos-success" : "text-lifeos-fg-muted"}`}
                suppressHydrationWarning
              >
                {streakDaysPhrase(consistencyStreaks.cleaningDays)}
              </p>
              <p className={`mt-ds-1 text-[11px] leading-snug ${ui.mutedText}`}>
                {consistencyStreaks.cleaningDays > 0
                  ? "Days with at least one cleaning_done event."
                  : "Log cleaning from the Cleaning page."}
              </p>
            </div>
            <div className="min-w-0 sm:border-l sm:border-lifeos-border-subtle/[0.08] sm:pl-ds-4">
              <p className="text-xs font-medium text-lifeos-fg-secondary">
                <span aria-hidden className="mr-1">
                  ✅
                </span>
                Tasks
              </p>
              <p
                className={`mt-ds-1 text-lg font-semibold tabular-nums sm:text-xl ${consistencyStreaks.taskDays > 0 ? "text-lifeos-fg" : "text-lifeos-fg-muted"}`}
                suppressHydrationWarning
              >
                {streakDaysPhrase(consistencyStreaks.taskDays)}
              </p>
              <p className={`mt-ds-1 text-[11px] leading-snug ${ui.mutedText}`}>
                {consistencyStreaks.taskDays > 0 ? "Days completing at least one task." : "Complete a task to begin."}
              </p>
            </div>
          </div>
          <p className={`mt-ds-3 border-t border-lifeos-border-subtle/[0.08] pt-ds-3 text-[11px] leading-snug ${ui.mutedText}`}>
            Local calendar days, up to 500 recent events.
          </p>
        </div>
      </section>

      <section className={ui.panelClass}>
        <h2 className="text-lg font-semibold text-lifeos-fg">Detected habits</h2>
        <p className={cn(ui.pageHint, "mt-ds-2")}>
          Patterns from ~45 days of signals (focus, cleaning, expenses, tasks). Each row can run a quick reinforcement
          action.
        </p>
        {habitsError && <p className="mt-ds-2 text-sm text-lifeos-danger">{habitsError}</p>}
        {!habitsError && habits && habits.length === 0 ? (
          <p className={`mt-ds-3 text-sm ${ui.mutedText}`}>
            Not enough repeating structure yet — keep logging focus, cleaning, expenses, and task completions.
          </p>
        ) : null}
        {!habitsError && habits && habits.length > 0 ? (
          <ul className="mt-ds-3 space-y-ds-2">
            {habits.map((h) => (
              <li
                key={h.id}
                className="rounded-ds-input bg-lifeos-muted/25 px-ds-3 py-ds-3 shadow-inner md:px-ds-4 md:py-ds-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-ds-3 gap-y-ds-1">
                  <p className="min-w-0 font-medium text-lifeos-fg">{h.message}</p>
                  <span className="shrink-0 rounded-md bg-lifeos-status-healthy-bg/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lifeos-success ring-1 ring-lifeos-status-healthy-border/40">
                    {(h.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className={`mt-ds-1 text-sm leading-snug ${ui.mutedText}`}>{h.frequency}</p>
                <p className={`mt-ds-1 text-[10px] uppercase tracking-wide ${ui.mutedText}`}>{h.category}</p>

                {(h.suggestedActions ?? []).length > 0 ? (
                  <div className="mt-ds-3 flex flex-col gap-ds-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {(h.suggestedActions ?? []).map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        className={`${ui.primaryButton} min-h-9 w-full justify-center text-sm sm:w-auto`}
                        disabled={busyAction === `${h.id}:${action.id}`}
                        onClick={() => void runSupportAction(h, action)}
                      >
                        {busyAction === `${h.id}:${action.id}` ? "…" : action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
