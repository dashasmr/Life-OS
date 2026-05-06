"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL, DailyInsight, DailySummary, EventItem, EventType } from "@/lib/api";
import { formatDateFiNumeric, formatDateTimeFiNumeric } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EVENT_TYPES: EventType[] = [
  "work_started",
  "focus_started",
  "focus_ended",
  "pomodoro_completed",
  "task_completed",
  "income_added",
  "expense_added",
  "cleaning_done"
];

export default function OverviewPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [error, setError] = useState<string | null>(null);
  const [startingFocus, setStartingFocus] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const showDebugTools = process.env.NODE_ENV === "development";
  const apiConnectionError = "Cannot connect to API. Please check backend server.";

  async function loadEvents() {
    const response = await fetch(`${API_URL}/events?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch events");
    const rawItems = (await response.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
    const filteredItems = rawItems.filter((item) => item.type !== "task_in_progress") as EventItem[];
    setEvents(filteredItems);
  }

  async function loadSummary() {
    const response = await fetch(`${API_URL}/analytics/daily-summary`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch daily summary");
    setSummary(await response.json());
  }

  async function loadInsight() {
    const response = await fetch(`${API_URL}/analytics/daily-insight`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch daily insight");
    setInsight(await response.json());
  }

  useEffect(() => {
    Promise.all([loadEvents(), loadSummary(), loadInsight()]).catch((err: Error) => {
      if (err.message === "Failed to fetch") {
        setError(apiConnectionError);
        return;
      }
      setError(err.message);
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError("Payload must be valid JSON");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: eventType, source: "web", payload })
      });
      if (!response.ok) {
        setError("Failed to create event");
        return;
      }
      setPayloadText('{"note":"manual event"}');
      await loadEvents();
    } catch {
      setError(apiConnectionError);
    }
  }

  async function onStartFocusFromQuickAction() {
    setError(null);
    setStartingFocus(true);
    try {
      const response = await fetch(`${API_URL}/focus/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: null })
      });
      if (!response.ok) {
        setError("Failed to start focus session");
        toast.error("Failed to start focus session");
        return;
      }
      toast.success("Focus session started");
      router.push("/focus");
    } catch {
      setError(apiConnectionError);
      toast.error("Cannot connect to API");
    } finally {
      setStartingFocus(false);
    }
  }

  const focusMinutes = Math.round(
    events
      .filter((item) => item.type === "focus_ended")
      .map((item) => Number((item.payload as Record<string, unknown>).duration_seconds ?? 0))
      .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) / 60
  );

  const kpis = [
    { label: "Tasks", value: summary?.tasks_completed ?? 0 },
    { label: "Focus", value: `${focusMinutes}m` },
    { label: "Income", value: `$${(summary?.income_total ?? 0).toFixed(0)}` },
    { label: "Balance", value: `${(summary?.balance_delta ?? 0).toFixed(0)}` }
  ];
  const recentEvents = events.slice(0, 3);
  const recommendations = insight?.recommendations ?? [];
  const visibleRecommendations = showAllRecommendations ? recommendations : recommendations.slice(0, 2);

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

  return (
    <div className={ui.contentClass}>
      {error && <p className="text-[#f7b0a2]">{error}</p>}

      <section className="rounded-2xl border border-[#2A2F36] bg-gradient-to-br from-[#11151A] to-[#0B0D10] p-8 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge
            variant="outline"
            className="inline-flex h-10 items-center rounded-xl border-[#C6A36B] px-5 text-sm font-medium text-[#C6A36B]"
          >
            AI Daily Insight
          </Badge>
          <span className={`text-sm ${ui.mutedText}`}>
            {summary?.date ? formatDateFiNumeric(summary.date) : "Today"}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">{insight?.headline ?? "Light execution day"}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#8A8F98]">
          {insight?.summary ?? "Loading insight..."}
        </p>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className={ui.card}>
              <p className="text-sm text-[#8A8F98]">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{kpi.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-6">
          <h2 className="text-xl font-semibold text-white">Recommendations</h2>
          <div className="mt-4 space-y-3">
            {visibleRecommendations.map((item) => (
              <article key={item} className="rounded-xl border-l-3 border-[#C6A36B] bg-[#171B21] p-4">
                <p className="text-sm leading-6 text-[#E5E5E5]">{item}</p>
              </article>
            ))}
            {!visibleRecommendations.length && <div className={ui.emptyState}>No recommendations yet.</div>}
          </div>
          {recommendations.length > 2 && (
            <button
              className={`${ui.secondaryButton} mt-4`}
              onClick={() => setShowAllRecommendations((prev) => !prev)}
              type="button"
            >
              {showAllRecommendations ? "Show less" : `Show more (${recommendations.length - 2})`}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-6">
          <h2 className="text-xl font-semibold text-white">Quick actions</h2>
          <div className="mt-4 grid gap-3">
            <Button className={ui.primaryButton} onClick={onStartFocusFromQuickAction} type="button" disabled={startingFocus}>
              {startingFocus ? "Starting..." : "Start focus session"}
            </Button>
            <Button className={ui.secondaryButton} onClick={() => router.push("/tasks")} type="button">
              Open tasks board
            </Button>
            <Button className={ui.secondaryButton} onClick={() => router.push("/finance")} type="button">
              Review finance summary
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Recent activity</h2>
          <Link href="/activity" className={ui.secondaryButton}>
            Open full log
          </Link>
        </div>

        <div className="mt-4 space-y-0">
          {recentEvents.map((item) => (
            <article key={item.id} className="flex gap-3 border-b border-[#2A2F36] py-4 last:border-b-0">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-[#C6A36B]" />
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize text-white">{item.type.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-[#8A8F98]">{formatDateTimeFiNumeric(item.created_at)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eventDetails(item)
                    .slice(0, 2)
                    .map((detail) => (
                    <span
                      key={`${item.id}-${detail.label}`}
                      className="rounded-lg border border-[#2A2F36] bg-[#171B21] px-2.5 py-1 text-xs text-[#8A8F98]"
                    >
                      <span className="text-[#E5E5E5]">{detail.label}:</span> {detail.value}
                    </span>
                    ))}
                  {eventDetails(item).length > 2 && (
                    <span className="rounded-lg border border-[#2A2F36] bg-[#171B21] px-2.5 py-1 text-xs text-[#8A8F98]">
                      +{eventDetails(item).length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!recentEvents.length && <p className="py-2 text-sm text-[#8A8F98]">No recent activity yet.</p>}
        </div>
      </section>

      {showDebugTools && (
        <section className="rounded-2xl border border-dashed border-[#2A2F36] bg-[#11151A] p-4">
          <details>
            <summary className="cursor-pointer list-none select-none text-sm font-medium text-[#8A8F98]">
              Dev tools: manual event
            </summary>

            <form onSubmit={onSubmit} className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="grid gap-2">
                  <label className={`text-sm ${ui.mutedText}`}>Event type</label>
                  <Select value={eventType} onValueChange={(value) => setEventType(value as EventType)}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-[#2A2F36] bg-transparent">
                      <SelectValue placeholder="Choose event type" />
                    </SelectTrigger>
                    <SelectContent className="border-[#2A2F36] bg-[#11151A] text-[#E5E5E5]">
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="self-end">
                  <Button className={ui.primaryButton} type="submit">
                    Add event
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className={`text-sm ${ui.mutedText}`}>Payload JSON</label>
                <Textarea
                  className="min-h-20 rounded-xl border-[#2A2F36] bg-transparent font-mono text-sm text-[#E5E5E5]"
                  value={payloadText}
                  onChange={(e) => setPayloadText(e.target.value)}
                />
              </div>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}

