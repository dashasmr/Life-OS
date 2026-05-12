"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL, CleaningZone, DailyInsight, DailySummary, EventItem, EventType, FinanceRangeSummary, FocusSession, TaskItem } from "@/lib/api";
import { cleaningActionLabel, formatSignedEur, pickNextCleaningZone, pickTopPriorityTask } from "@/lib/commandCenter";
import {
  formatDateFiNumeric,
  formatDateTimeFiNumeric,
  getLocalDayRangeIso,
  getLocalMonthRangeIso
} from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { DashboardNotificationsSection } from "@/components/DashboardNotificationsSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  generateDailyPlan,
  loadDailyPlanCompletedIds,
  saveDailyPlanCompletedIds,
  type DailyPlanItem
} from "@/lib/dailyPlan";
import { generateNextActions, type NextActionRecommendation } from "@/lib/recommendations";
import { computeSystemStatus, type SystemStatusPillar, type SystemStatusTone } from "@/lib/systemStatus";
import { Brain, Home, ListTodo, Wallet } from "lucide-react";
import { toast } from "sonner";

function systemStatusToneStyles(tone: SystemStatusTone): { shell: string; badge: string; glow: string } {
  switch (tone) {
    case "positive":
      return {
        shell: "border-[#2f4b3a]/70 bg-[#0c1210] shadow-[0_0_0_1px_rgba(47,75,58,0.25)_inset]",
        badge: "border-[#3d6b52]/80 bg-[#152019] text-[#b7e4c7]",
        glow: "text-[#7dccb0]"
      };
    case "caution":
      return {
        shell: "border-[#6d572f]/70 bg-[#100e0a] shadow-[0_0_0_1px_rgba(109,87,47,0.2)_inset]",
        badge: "border-[#8a7349]/80 bg-[#221c12] text-[#f3d59e]",
        glow: "text-[#e8c48a]"
      };
    case "critical":
      return {
        shell: "border-[#7a2b2b]/65 bg-[#120d0d] shadow-[0_0_0_1px_rgba(122,43,43,0.22)_inset]",
        badge: "border-[#a04444]/70 bg-[#2a1616] text-[#ffb3b3]",
        glow: "text-[#ff8f8f]"
      };
    default:
      return {
        shell: "border-[#2A2F36] bg-[#0F1318]",
        badge: "border-[#2A2F36] bg-[#141A22] text-[#c9d0d8]",
        glow: "text-[#8A8F98]"
      };
  }
}

function SystemStatusIcon({ pillar }: { pillar: SystemStatusPillar["key"] }) {
  const cls = "size-4 shrink-0 opacity-90";
  if (pillar === "mind") return <Brain className={cls} strokeWidth={1.75} />;
  if (pillar === "home") return <Home className={cls} strokeWidth={1.75} />;
  return <Wallet className={cls} strokeWidth={1.75} />;
}

const EVENT_TYPES: EventType[] = [
  "work_started",
  "focus_started",
  "focus_ended",
  "focus_session_completed",
  "pomodoro_completed",
  "task_completed",
  "income_added",
  "expense_added",
  "cleaning_done"
];

export type DashboardTabId = "overview" | "command-center" | "daily-plan" | "recommendations" | "notifications";

export function OverviewDashboard({ tab }: { tab: DashboardTabId }) {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [eventType, setEventType] = useState<EventType>("work_started");
  const [payloadText, setPayloadText] = useState('{"note":"manual event"}');
  const [error, setError] = useState<string | null>(null);
  const [startingFocus, setStartingFocus] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [commandTasks, setCommandTasks] = useState<TaskItem[]>([]);
  const [commandZones, setCommandZones] = useState<CleaningZone[]>([]);
  const [financeToday, setFinanceToday] = useState<FinanceRangeSummary | null>(null);
  const [financeMonth, setFinanceMonth] = useState<FinanceRangeSummary | null>(null);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [recActionBusy, setRecActionBusy] = useState<string | null>(null);
  const [planCompletedIds, setPlanCompletedIds] = useState<Set<string>>(() => new Set());
  const showDebugTools = process.env.NODE_ENV === "development";
  const apiConnectionError = "Cannot connect to API. Please check backend server.";

  function normalizeEventList(rawItems: Array<Omit<EventItem, "type"> & { type: string }>): EventItem[] {
    return rawItems.filter((item) => item.type !== "task_in_progress") as EventItem[];
  }

  async function loadEvents() {
    const response = await fetch(`${API_URL}/events?limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch events");
    const rawItems = (await response.json()) as Array<Omit<EventItem, "type"> & { type: string }>;
    setEvents(normalizeEventList(rawItems));
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

  async function loadCommandCenterTasks() {
    const response = await fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch tasks");
    setCommandTasks(await response.json());
  }

  async function loadCommandCenterZones() {
    const response = await fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch cleaning zones");
    setCommandZones(await response.json());
  }

  async function loadFinanceRangeSummaries() {
    const now = new Date();
    const day = getLocalDayRangeIso(now);
    const month = getLocalMonthRangeIso(now);
    const qs = (from: string, to: string) => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const [dayRes, monthRes] = await Promise.all([
      fetch(`${API_URL}/finance/summary/range?${qs(day.from, day.to)}`, { cache: "no-store" }),
      fetch(`${API_URL}/finance/summary/range?${qs(month.from, month.to)}`, { cache: "no-store" })
    ]);
    if (!dayRes.ok) throw new Error("Failed to fetch finance day summary");
    if (!monthRes.ok) throw new Error("Failed to fetch finance month summary");
    setFinanceToday(await dayRes.json());
    setFinanceMonth(await monthRes.json());
  }

  async function loadFocusSessions() {
    const response = await fetch(`${API_URL}/focus/sessions?limit=50`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch focus sessions");
    setFocusSessions(await response.json());
  }

  async function refreshRecommendationDrivers() {
    await Promise.all([
      loadCommandCenterZones(),
      loadFocusSessions(),
      loadCommandCenterTasks(),
      loadFinanceRangeSummaries(),
      loadSummary(),
      loadEvents()
    ]);
  }

  useEffect(() => {
    Promise.all([
      loadEvents(),
      loadSummary(),
      loadInsight(),
      loadCommandCenterTasks(),
      loadCommandCenterZones(),
      loadFinanceRangeSummaries(),
      loadFocusSessions()
    ]).catch((err: Error) => {
      if (err.message === "Failed to fetch") {
        setError(apiConnectionError);
        return;
      }
      setError(err.message);
    });
  }, []);

  useEffect(() => {
    setPlanCompletedIds(loadDailyPlanCompletedIds(new Date()));
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
      router.push("/work/focus");
    } catch {
      setError(apiConnectionError);
      toast.error("Cannot connect to API");
    } finally {
      setStartingFocus(false);
    }
  }

  const focusMinutes = Math.round(
    events
      .filter((item) => item.type === "focus_ended" || item.type === "focus_session_completed")
      .map((item) => {
        const p = item.payload as Record<string, unknown>;
        if (item.type === "focus_session_completed") {
          const sec = Number(p.duration_seconds ?? 0);
          if (Number.isFinite(sec) && sec > 0) return sec;
          return Number(p.duration_minutes ?? 0) * 60;
        }
        return Number(p.duration_seconds ?? 0);
      })
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

  const topTask = pickTopPriorityTask(commandTasks);
  const nextZone = pickNextCleaningZone(commandZones);
  const systemPillars = useMemo(
    () =>
      computeSystemStatus({
        tasksCompletedToday: summary?.tasks_completed ?? 0,
        focusSessions,
        cleaningZones: commandZones,
        monthlyBalanceDelta: financeMonth?.balance_delta ?? null
      }),
    [summary?.tasks_completed, focusSessions, commandZones, financeMonth?.balance_delta]
  );

  const nextActions = useMemo(
    () =>
      generateNextActions({
        focusSessions,
        cleaningZones: commandZones,
        tasks: commandTasks,
        expensesTodayTotal: financeToday?.expense_total ?? 0,
        dailyEventsTotal: summary?.events_total ?? null,
        now: new Date()
      }),
    [focusSessions, commandZones, commandTasks, financeToday?.expense_total, summary?.events_total]
  );

  const dailyPlanBase = useMemo(
    () =>
      generateDailyPlan({
        tasks: commandTasks,
        cleaningZones: commandZones,
        focusSessions,
        expensesTodayTotal: financeToday?.expense_total ?? 0
      }),
    [commandTasks, commandZones, focusSessions, financeToday?.expense_total]
  );

  const dailyPlanItems: DailyPlanItem[] = useMemo(
    () => dailyPlanBase.map((row) => ({ ...row, completed: planCompletedIds.has(row.id) })),
    [dailyPlanBase, planCompletedIds]
  );

  function toggleDailyPlanItem(id: string) {
    setPlanCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDailyPlanCompletedIds(new Date(), next);
      return next;
    });
  }

  async function runRecommendationPrimaryAction(item: NextActionRecommendation) {
    const pa = item.primaryAction;
    if (!pa) return;
    setRecActionBusy(item.id);
    setError(null);
    try {
      if (pa.kind === "cleaning_mark_done") {
        const res = await fetch(`${API_URL}/cleaning/zones/${pa.zoneId}/done`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        if (!res.ok) throw new Error("Failed to mark cleaning as done");
        toast.success("Marked as cleaned");
        await refreshRecommendationDrivers();
      } else if (pa.kind === "focus_start") {
        const res = await fetch(`${API_URL}/focus/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: null, task_id: null })
        });
        if (!res.ok) throw new Error("Failed to start focus session");
        toast.success("Focus session started");
        await refreshRecommendationDrivers();
        router.push("/work/focus");
      } else if (pa.kind === "navigate") {
        router.push(pa.href as Route);
      } else if (pa.kind === "task_open") {
        router.push((pa.taskId ? `/work/tasks?highlight=${encodeURIComponent(pa.taskId)}` : "/work/tasks") as Route);
      }
    } catch {
      toast.error("Action failed");
      setError(apiConnectionError);
    } finally {
      setRecActionBusy(null);
    }
  }

  function nextActionCategoryLabel(category: NextActionRecommendation["type"]): string {
    if (category === "productivity") return "Productivity";
    if (category === "cleaning") return "Cleaning";
    if (category === "finance") return "Finance";
    return "Tasks";
  }

  function dailyPlanCategoryLabel(category: DailyPlanItem["category"]): string {
    if (category === "task") return "Task";
    if (category === "focus") return "Focus";
    if (category === "cleaning") return "Cleaning";
    return "Finance";
  }

  function nextActionPriorityClass(p: NextActionRecommendation["priority"]): string {
    if (p === "high") return "border-[#7a2b2b]/50 bg-[#2a1616] text-[#ffb3b3]";
    if (p === "medium") return "border-[#6d572f]/50 bg-[#2a2418] text-[#f3d59e]";
    return "border-[#2A2F36] bg-[#141A22] text-[#8A8F98]";
  }

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

  return (
    <div className={ui.contentClass}>
      {error && <p className="text-[#f7b0a2]">{error}</p>}

      <div className="flex flex-col gap-5 max-md:gap-4 md:gap-6">
      {tab === "command-center" ? (
      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Today Command Center</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>What matters most right now</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className={`${ui.card} border-[#2A2F36] bg-[#0F1318]`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C6A36B]">Top priority task</p>
            {topTask ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-medium text-white">{topTask.title}</p>
                <p className={`text-sm ${ui.mutedText}`}>
                  High priority
                  {topTask.due_date ? ` · Due ${formatDateFiNumeric(topTask.due_date)}` : ""}
                </p>
                <Link href="/work/tasks" className={`${ui.secondaryButton} mt-2 inline-flex`}>
                  Open tasks
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-medium text-white">No priority task yet</p>
                <p className={`text-sm ${ui.mutedText}`}>Create a task marked high priority to surface it here.</p>
                <Link href="/work/tasks" className={`${ui.secondaryButton} mt-2 inline-flex`}>
                  Add a high-priority task
                </Link>
              </div>
            )}
          </Card>

          <Card className={`${ui.card} border-[#2A2F36] bg-[#0F1318]`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C6A36B]">Next cleaning action</p>
            {nextZone ? (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-medium text-white">{cleaningActionLabel(nextZone)}</p>
                <p className={`text-sm ${ui.mutedText}`}>Every {nextZone.frequency_days} days</p>
                <Link href="/life/cleaning" className={`${ui.secondaryButton} mt-2 inline-flex`}>
                  Open cleaning
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-lg font-medium text-white">No cleaning zones yet</p>
                <p className={`text-sm ${ui.mutedText}`}>Add zones to track what needs attention.</p>
                <Link href="/life/cleaning" className={`${ui.secondaryButton} mt-2 inline-flex`}>
                  Add a zone
                </Link>
              </div>
            )}
          </Card>

          <Card className={`${ui.card} border-[#2A2F36] bg-[#0F1318]`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C6A36B]">Financial snapshot</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className={`text-sm ${ui.mutedText}`}>Today balance</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {financeToday ? formatSignedEur(financeToday.balance_delta) : "—"}
                </p>
              </div>
              <div>
                <p className={`text-sm ${ui.mutedText}`}>Monthly balance</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {financeMonth ? formatSignedEur(financeMonth.balance_delta) : "—"}
                </p>
              </div>
              <p className={`text-xs ${ui.mutedText}`}>
                Full-month totals from the server (all transactions in your local calendar day/month).
              </p>
              <Link href="/finance/dashboard" className={`${ui.secondaryButton} inline-flex`}>
                Open finance
              </Link>
            </div>
          </Card>
        </div>
      </section>
      ) : null}

      {tab === "daily-plan" ? (
      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Daily Plan</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>Check off a short list built from your real signals for today.</p>
          </div>
        </div>

        {dailyPlanItems.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {dailyPlanItems.map((item) => (
              <li key={item.id}>
                <label
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors md:px-5 md:py-4 ${
                    item.completed
                      ? "border-[#2A2F36]/80 bg-[#0c0f12] opacity-75"
                      : "border-[#2A2F36] bg-[#0F1318] hover:border-[#3d4652]"
                  }`}
                >
                  <input
                    checked={item.completed}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-[#3d4652] bg-[#141A22] text-[#C6A36B] accent-[#C6A36B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6A36B]/60"
                    onChange={() => toggleDailyPlanItem(item.id)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-base font-medium leading-snug ${
                        item.completed ? "text-[#8A8F98] line-through decoration-[#5c6370]" : "text-white"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${nextActionPriorityClass(item.priority)}`}
                      >
                        {item.priority}
                      </span>
                      <span className="rounded-md border border-[#2A2F36] bg-[#141A22] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C6A36B]">
                        {dailyPlanCategoryLabel(item.category)}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex gap-3 rounded-lg border border-[#2A2F36] bg-[#141A22]/60 px-3 py-2.5 sm:items-center">
            <ListTodo className="size-4 shrink-0 text-[#6B7280]" strokeWidth={1.75} aria-hidden />
            <p className={`text-sm ${ui.mutedText}`}>
              <span className="font-medium text-[#c9d0d8]">Nothing to plan yet.</span> Add a high-priority task, spending, or
              cleaning zones — items appear here automatically.
            </p>
          </div>
        )}
      </section>
      ) : null}

      {tab === "recommendations" ? (
      <>
      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Recommended next actions</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>One-tap moves tied to your data — do these before tweaking analytics.</p>
          </div>
        </div>

        {nextActions.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {nextActions.map((action) => (
              <li key={action.id}>
                <article className="flex flex-col gap-4 rounded-xl border border-[#2A2F36] bg-[#0F1318] p-4 sm:flex-row sm:items-start sm:justify-between md:p-5">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span className="text-2xl leading-none" aria-hidden>
                      {action.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium leading-snug text-white">{action.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${nextActionPriorityClass(action.priority)}`}
                        >
                          {action.priority}
                        </span>
                        <span className="rounded-md border border-[#2A2F36] bg-[#141A22] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C6A36B]">
                          {nextActionCategoryLabel(action.type)}
                        </span>
                        <span
                          className={`text-xs tabular-nums ${ui.mutedText}`}
                          suppressHydrationWarning
                          title="Generated when this list was computed"
                        >
                          {formatDateTimeFiNumeric(action.generatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {action.primaryAction ? (
                    <Button
                      className={`${ui.primaryButton} min-h-11 w-full shrink-0 self-stretch sm:w-auto sm:self-center`}
                      disabled={recActionBusy === action.id}
                      onClick={() => runRecommendationPrimaryAction(action)}
                      type="button"
                    >
                      {recActionBusy === action.id ? "Working…" : action.primaryAction.buttonLabel}
                    </Button>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-[#2A2F36] bg-[#141A22]/60 px-3 py-2.5">
            <p className={`text-sm ${ui.mutedText}`}>
              <span className="font-medium text-[#c9d0d8]">Nothing urgent.</span> You&apos;re within thresholds — check back as
              the day changes.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
          <div className="mt-3 space-y-2">
            {visibleRecommendations.map((item) => (
              <article key={item} className="rounded-xl border-l-3 border-[#C6A36B] bg-[#171B21] p-3 md:p-4">
                <p className="text-sm leading-6 text-[#E5E5E5]">{item}</p>
              </article>
            ))}
            {!visibleRecommendations.length && (
              <p className={`rounded-lg border border-[#2A2F36] bg-[#141A22]/50 px-3 py-2 text-sm ${ui.mutedText}`}>
                No recommendations yet.
              </p>
            )}
          </div>
          {recommendations.length > 2 && (
            <button
              className={`${ui.secondaryButton} mt-4 w-full min-h-11 sm:w-fit`}
              onClick={() => setShowAllRecommendations((prev) => !prev)}
              type="button"
            >
              {showAllRecommendations ? "Show less" : `Show more (${recommendations.length - 2})`}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <div className="mt-3 grid gap-2.5">
            <Button
              className={`${ui.primaryButton} w-full min-h-11 sm:w-fit`}
              onClick={onStartFocusFromQuickAction}
              type="button"
              disabled={startingFocus}
            >
              {startingFocus ? "Starting..." : "Start focus session"}
            </Button>
            <Button
              className={`${ui.secondaryButton} w-full min-h-11 sm:w-fit`}
              onClick={() => router.push("/work/tasks")}
              type="button"
            >
              Open tasks board
            </Button>
            <Button
              className={`${ui.secondaryButton} w-full min-h-11 sm:w-fit`}
              onClick={() => router.push("/finance/dashboard")}
              type="button"
            >
              Review finance summary
            </Button>
          </div>
        </div>
      </section>
      </>
      ) : null}

      {tab === "notifications" ? (
      <DashboardNotificationsSection
        expensesTodayTotal={financeToday?.expense_total ?? 0}
        focusSessions={focusSessions}
        onRefresh={() => refreshRecommendationDrivers()}
        tasks={commandTasks}
        zones={commandZones}
      />
      ) : null}

      {tab === "overview" ? (
      <>
      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-4 md:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A8F98]">Today at a glance</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className={`${ui.card} border-[#2A2F36] bg-[#0F1318] px-3 py-2.5`}>
              <p className="text-xs text-[#8A8F98]">{kpi.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">{kpi.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">System Status</h2>
            <p className={`mt-1 text-sm ${ui.mutedText}`}>Mind, home, and money at a glance.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {systemPillars.map((pillar) => {
            const st = systemStatusToneStyles(pillar.tone);
            return (
              <div
                key={pillar.key}
                className={`rounded-2xl border px-4 py-4 transition duration-300 hover:-translate-y-0.5 ${st.shell}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={st.glow}>
                      <SystemStatusIcon pillar={pillar.key} />
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A8F98]">{pillar.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${st.badge}`}>
                    {pillar.statusLabel}
                  </span>
                </div>
                <p className={`mt-3 text-xl font-semibold tracking-tight ${st.glow}`}>{pillar.statusLabel}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Recent activity</h2>
          <Link href="/insights/activity" className={ui.secondaryButton}>
            Open full log
          </Link>
        </div>

        <div className="mt-3 space-y-0">
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
          {!recentEvents.length && (
            <p className={`rounded-lg border border-[#2A2F36] bg-[#141A22]/50 px-3 py-2 text-sm ${ui.mutedText}`}>
              No recent activity yet.
            </p>
          )}
        </div>
      </section>
      </>
      ) : null}

      </div>

      {tab === "overview" && showDebugTools && (
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

