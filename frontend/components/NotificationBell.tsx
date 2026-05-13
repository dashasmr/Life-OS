"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { sendWithOfflineQueue } from "@/services/offlineQueue";
import { API_URL, CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WhyMuted } from "@/components/explainability/WhyLine";
import { getLocalDayRangeIso } from "@/lib/datetime";
import { ui } from "@/lib/ui";
import { useAutomationPrefsEpoch } from "@/hooks/useAutomationPrefsEpoch";
import { useUserPreferencesEpoch } from "@/hooks/useUserPreferencesEpoch";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";
import {
  categoryNotificationEmoji,
  generateNotifications,
  loadNotificationReadIds,
  mergeNotificationReadState,
  NOTIFICATION_MUTATION,
  notificationReadCompoundKey,
  saveNotificationReadIds,
  type AppNotification
} from "@/services/notifications";

const PANEL_MAX_WIDTH_PX = 416;
const VIEWPORT_MARGIN_PX = 12;

function measureNotificationPanelRect(buttonEl: HTMLButtonElement): { top: number; left: number; width: number } {
  const r = buttonEl.getBoundingClientRect();
  const vw = typeof window !== "undefined" ? (window.visualViewport?.width ?? window.innerWidth) : 400;
  const margin = VIEWPORT_MARGIN_PX;
  const width = Math.min(PANEL_MAX_WIDTH_PX, Math.max(260, vw - margin * 2));
  let left = r.left;
  if (left + width > vw - margin) left = vw - margin - width;
  if (left < margin) left = margin;
  return { top: r.bottom + 8, left, width };
}

async function fetchNotificationDrivers(): Promise<{
  tasks: TaskItem[];
  zones: CleaningZone[];
  focusSessions: FocusSession[];
  expensesTodayTotal: number;
}> {
  const now = new Date();
  const day = getLocalDayRangeIso(now);
  const qs = `from=${encodeURIComponent(day.from)}&to=${encodeURIComponent(day.to)}`;

  const [tasksRes, zonesRes, focusRes, finRes] = await Promise.all([
    fetch(`${API_URL}/tasks?limit=100`, { cache: "no-store" }),
    fetch(`${API_URL}/cleaning/zones`, { cache: "no-store" }),
    fetch(`${API_URL}/focus/sessions?limit=50`, { cache: "no-store" }),
    fetch(`${API_URL}/finance/summary/range?${qs}`, { cache: "no-store" })
  ]);

  if (!tasksRes.ok) throw new Error("tasks");
  if (!zonesRes.ok) throw new Error("zones");
  if (!focusRes.ok) throw new Error("focus");
  if (!finRes.ok) throw new Error("finance");

  const [tasks, zones, focusSessions, fin] = await Promise.all([
    tasksRes.json() as Promise<TaskItem[]>,
    zonesRes.json() as Promise<CleaningZone[]>,
    focusRes.json() as Promise<FocusSession[]>,
    finRes.json() as Promise<{ expense_total: number }>
  ]);

  return {
    tasks,
    zones,
    focusSessions,
    expensesTodayTotal: fin?.expense_total ?? 0
  };
}

export function NotificationBell() {
  const automationPrefsEpoch = useAutomationPrefsEpoch();
  const userPrefsEpoch = useUserPreferencesEpoch();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [expenseToday, setExpenseToday] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelRect, setPanelRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  const refresh = useCallback(async () => {
    try {
      const d = await fetchNotificationDrivers();
      setTasks(d.tasks);
      setZones(d.zones);
      setFocusSessions(d.focusSessions);
      setExpenseToday(d.expensesTodayTotal);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    setReadIds(loadNotificationReadIds());
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoadError(true));
  }, [pathname, refresh]);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    refresh().catch(() => setLoadError(true));
  }, [realtimeEpoch, refresh]);

  const notifications: AppNotification[] = useMemo(() => {
    const now = new Date();
    const drafts = generateNotifications({
      cleaningZones: zones,
      focusSessions,
      tasks,
      expensesTodayTotal: expenseToday,
      now
    });
    return mergeNotificationReadState(drafts, readIds, now);
  }, [zones, focusSessions, tasks, expenseToday, readIds, automationPrefsEpoch, userPrefsEpoch]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }

    function updatePanelPosition() {
      const btn = buttonRef.current;
      if (!btn) return;
      setPanelRect(measureNotificationPanelRect(btn));
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.visualViewport?.addEventListener("resize", updatePanelPosition);
    window.visualViewport?.addEventListener("scroll", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.visualViewport?.removeEventListener("resize", updatePanelPosition);
      window.visualViewport?.removeEventListener("scroll", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(notificationReadCompoundKey(id, new Date()));
      saveNotificationReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    const t = new Date();
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(notificationReadCompoundKey(n.id, t));
      saveNotificationReadIds(next);
      return next;
    });
  }

  async function runNotificationAction(n: AppNotification) {
    const a = n.action;
    if (!a?.target) return;

    if (a.type === "navigate") {
      markRead(n.id);
      setOpen(false);
      router.push(a.target as Route);
      return;
    }

    if (a.type === "mutation") {
      setActionBusyId(n.id);
      try {
        if (a.target === NOTIFICATION_MUTATION.focus_start) {
          const result = await sendWithOfflineQueue(
            { kind: "focus_start", body: { label: null, task_id: null } },
            () =>
              fetch(`${API_URL}/focus/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: null, task_id: null })
              })
          );
          if (result.mode === "queued") {
            toast.info("Pending sync", { description: "Saved offline. Syncs when you are online." });
            markRead(n.id);
            await refresh();
            setOpen(false);
            return;
          }
          if (!result.response.ok) throw new Error("focus");
          toast.success("Focus session started");
          markRead(n.id);
          await refresh();
          setOpen(false);
          router.push("/work/focus");
          return;
        }

        if (a.target === NOTIFICATION_MUTATION.cleaning_mark_done) {
          const zoneId = a.payload?.zoneId;
          if (typeof zoneId !== "string") throw new Error("zone");
          const result = await sendWithOfflineQueue({ kind: "cleaning_done", zoneId }, () =>
            fetch(`${API_URL}/cleaning/zones/${zoneId}/done`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            })
          );
          if (result.mode === "queued") {
            toast.info("Pending sync", { description: "Cleaning logged locally." });
            markRead(n.id);
            await refresh();
            return;
          }
          if (!result.response.ok) throw new Error("cleaning");
          toast.success("Marked as cleaned");
          markRead(n.id);
          await refresh();
          return;
        }

        throw new Error("unknown");
      } catch {
        toast.error("Could not complete action");
      } finally {
        setActionBusyId(null);
      }
    }
  }

  function typeStyles(t: AppNotification["type"]): string {
    if (t === "warning") return "border-l-lifeos-warning bg-lifeos-warning-muted/40";
    if (t === "success") return "border-l-lifeos-success bg-lifeos-success-muted/40";
    return "border-l-lifeos-accent/40 bg-lifeos-muted";
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        className="relative flex min-h-[44px] items-center gap-1 rounded-[10px] border border-transparent bg-transparent px-2.5 text-lifeos-fg-muted transition hover:bg-lifeos-hover/90 hover:text-lifeos-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lifeos-accent/35"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const btn = buttonRef.current;
          if (btn) setPanelRect(measureNotificationPanelRect(btn));
          setOpen(true);
        }}
      >
        <Bell className="size-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
        {unreadCount > 0 ? (
          <span className="min-w-[1.125rem] rounded-md bg-lifeos-muted px-1 text-center text-[10px] font-semibold tabular-nums text-lifeos-fg-secondary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open && panelRect ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "fixed",
            top: panelRect.top,
            left: panelRect.left,
            width: panelRect.width,
            zIndex: 60
          }}
          className="flex max-h-[min(70vh,22rem)] flex-col overflow-hidden rounded-xl border border-lifeos-border bg-lifeos-card shadow-ds-lg"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-lifeos-border px-3 py-2">
            <p className="text-lifeos-caption font-medium text-lifeos-fg-secondary">Notifications</p>
            {notifications.length > 0 && unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-lifeos-accent hover:underline"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,20rem)] overflow-y-auto">
            {loadError ? (
              <p className={`px-3 py-4 text-sm ${ui.mutedText}`}>Could not load notifications. Check your connection.</p>
            ) : notifications.length === 0 ? (
              <p className={`px-3 py-4 text-sm ${ui.mutedText}`}>Nothing new right now.</p>
            ) : (
              <ul className="divide-y divide-lifeos-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <div
                      className={`border-l-4 text-left transition hover:bg-lifeos-hover/80 ${typeStyles(n.type)} ${
                        n.read ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex gap-2 px-3 py-2.5">
                        <span className="text-lg leading-none" aria-hidden>
                          {categoryNotificationEmoji(n.category)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-lifeos-fg">{n.title}</span>
                          <span className={`mt-0.5 block break-words text-xs leading-snug ${ui.mutedText}`}>
                            {n.message}
                          </span>
                          <WhyMuted text={n.explanation ?? ""} />
                          {n.action ? (
                            <div className="mt-2">
                              <Button
                                variant={n.action.type === "mutation" ? "primary" : "secondary"}
                                size="sm"
                                className="h-8 min-h-8 px-3 text-xs"
                                disabled={actionBusyId === n.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void runNotificationAction(n);
                                }}
                                type="button"
                              >
                                {actionBusyId === n.id ? "Working…" : n.action.label}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        {!n.read ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-lifeos-accent/80" title="Unread" />
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
