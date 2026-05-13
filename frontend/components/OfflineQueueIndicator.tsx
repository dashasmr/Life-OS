"use client";

import { useEffect, useState } from "react";
import {
  getOfflineQueueCount,
  isOfflineQueueSyncing,
  subscribeOfflineQueue
} from "@/services/offlineQueue";
import { ui } from "@/lib/ui";

export function OfflineQueueIndicator() {
  const [, setBump] = useState(0);

  useEffect(() => subscribeOfflineQueue(() => setBump((n) => n + 1)), []);

  const count = getOfflineQueueCount();
  const syncing = isOfflineQueueSyncing();

  if (!syncing && count === 0) return null;

  return (
    <div
      className={`max-w-[10rem] truncate rounded-lg border px-2 py-1 text-[10px] font-medium leading-tight sm:max-w-[11rem] sm:px-2.5 sm:py-1.5 sm:text-[11px] ${
        syncing
          ? "border-lifeos-warning-muted/80 bg-lifeos-warning-muted text-lifeos-warning"
          : "border-lifeos-status-neutral-border/70 bg-lifeos-status-neutral-bg text-lifeos-status-neutral"
      }`}
      title={syncing ? "Sending queued actions to the server" : `${count} action(s) waiting for the API`}
    >
      {syncing ? <span className="text-lifeos-warning">Syncing…</span> : <span>Pending sync ({count})</span>}
      <span className={`mt-0.5 block text-[10px] font-normal ${ui.mutedText}`}>
        {syncing ? "Uploading offline queue" : "Will retry automatically"}
      </span>
    </div>
  );
}
