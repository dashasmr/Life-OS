"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { API_URL, CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ui } from "@/lib/ui";
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

type Props = {
  tasks: TaskItem[];
  zones: CleaningZone[];
  focusSessions: FocusSession[];
  expensesTodayTotal: number;
  onRefresh?: () => void | Promise<void>;
};

export function DashboardNotificationsSection({
  tasks,
  zones,
  focusSessions,
  expensesTodayTotal,
  onRefresh
}: Props) {
  const router = useRouter();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  useEffect(() => {
    setReadIds(loadNotificationReadIds());
  }, []);

  const notifications: AppNotification[] = useMemo(() => {
    const now = new Date();
    const drafts = generateNotifications({
      cleaningZones: zones,
      focusSessions,
      tasks,
      expensesTodayTotal,
      now
    });
    return mergeNotificationReadState(drafts, readIds, now);
  }, [zones, focusSessions, tasks, expensesTodayTotal, readIds]);

  const markRead = useCallback((id: string) => {
    const now = new Date();
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(notificationReadCompoundKey(id, now));
      saveNotificationReadIds(next);
      return next;
    });
  }, []);

  const runAction = useCallback(
    async (n: AppNotification) => {
      const a = n.action;
      if (!a?.target) return;

      if (a.type === "navigate") {
        markRead(n.id);
        router.push(a.target as Route);
        return;
      }

      if (a.type === "mutation") {
        setActionBusyId(n.id);
        try {
          if (a.target === NOTIFICATION_MUTATION.focus_start) {
            const res = await fetch(`${API_URL}/focus/sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label: null, task_id: null })
            });
            if (!res.ok) throw new Error("focus");
            toast.success("Focus session started");
            markRead(n.id);
            await onRefresh?.();
            router.push("/work/focus");
            return;
          }

          if (a.target === NOTIFICATION_MUTATION.cleaning_mark_done) {
            const zoneId = a.payload?.zoneId;
            if (typeof zoneId !== "string") throw new Error("zone");
            const res = await fetch(`${API_URL}/cleaning/zones/${zoneId}/done`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({})
            });
            if (!res.ok) throw new Error("cleaning");
            toast.success("Marked as cleaned");
            markRead(n.id);
            await onRefresh?.();
            return;
          }

          throw new Error("unknown");
        } catch {
          toast.error("Could not complete action");
        } finally {
          setActionBusyId(null);
        }
      }
    },
    [markRead, onRefresh, router]
  );

  function typeBorder(t: AppNotification["type"]): string {
    if (t === "warning") return "border-l-amber-500/80";
    if (t === "success") return "border-l-emerald-500/70";
    return "border-l-[#3d5a7a]/80";
  }

  return (
    <section className="rounded-2xl border border-[#2A2F36] bg-[#11151A] p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          <p className={`mt-1 text-sm ${ui.mutedText}`}>
            Same live signals as the bell — handle them here on mobile or from the top bar.
          </p>
        </div>
      </div>

      {notifications.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {notifications.map((n) => (
            <li key={n.id}>
              <article
                className={`rounded-xl border border-[#2A2F36] border-l-4 bg-[#0F1318] p-4 ${typeBorder(n.type)} ${
                  n.read ? "opacity-70" : ""
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-xl leading-none" aria-hidden>
                    {categoryNotificationEmoji(n.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    <p className={`mt-1 text-xs leading-snug ${ui.mutedText}`}>{n.message}</p>
                    {n.action ? (
                      <div className="mt-3">
                        <Button
                          className={`min-h-11 px-4 text-xs ${n.action.type === "mutation" ? ui.primaryButton : ui.secondaryButton}`}
                          disabled={actionBusyId === n.id}
                          onClick={() => void runAction(n)}
                          type="button"
                        >
                          {actionBusyId === n.id ? "Working…" : n.action.label}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {!n.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-[#C6A36B]" title="Unread" /> : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-[#2A2F36] bg-[#141A22]/60 px-3 py-3">
          <p className={`text-sm ${ui.mutedText}`}>
            <span className="font-medium text-[#c9d0d8]">You&apos;re caught up.</span> No actionable notifications right now.
          </p>
        </div>
      )}
    </section>
  );
}
