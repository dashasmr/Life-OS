import { API_URL } from "@/lib/api";
import type { PendingMutation, PendingMutationInput, SendMutationResult } from "@/services/offlineQueue/types";
import { loadQueue, saveQueue } from "@/services/offlineQueue/storage";

const listeners = new Set<() => void>();
let syncing = false;

export function subscribeOfflineQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function getOfflineQueueCount(): number {
  return loadQueue().length;
}

export function getOfflineQueueSnapshot(): PendingMutation[] {
  return [...loadQueue()].sort((a, b) => a.createdAt - b.createdAt);
}

export function isOfflineQueueSyncing(): boolean {
  return syncing;
}

function enqueue(item: PendingMutationInput): PendingMutation {
  const row: PendingMutation = {
    ...item,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now()
  } as PendingMutation;
  const next = [...loadQueue(), row];
  saveQueue(next);
  notify();
  return row;
}

function removeById(id: string): void {
  const next = loadQueue().filter((x) => x.id !== id);
  saveQueue(next);
  notify();
}

export function clearOfflineQueue(): void {
  saveQueue([]);
  notify();
}

function isRecoverableFetchFailure(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg === "Failed to fetch" ||
    msg.startsWith("NetworkError") ||
    msg === "Load failed" ||
    msg === "The Internet connection appears to be offline."
  );
}

function shouldRetryHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function executePending(p: PendingMutation): Promise<boolean> {
  try {
    switch (p.kind) {
      case "patch_task_status": {
        const r = await fetch(`${API_URL}/tasks/${encodeURIComponent(p.taskId)}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: p.status })
        });
        return r.ok;
      }
      case "post_task": {
        const r = await fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.body)
        });
        return r.ok;
      }
      case "post_finance_transaction": {
        const r = await fetch(`${API_URL}/finance/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.body)
        });
        return r.ok;
      }
      case "cleaning_done": {
        const r = await fetch(`${API_URL}/cleaning/zones/${encodeURIComponent(p.zoneId)}/done`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        return r.ok;
      }
      case "focus_start": {
        const r = await fetch(`${API_URL}/focus/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.body)
        });
        return r.ok;
      }
      case "focus_stop": {
        const r = await fetch(`${API_URL}/focus/sessions/${encodeURIComponent(p.sessionId)}/stop`, {
          method: "POST"
        });
        return r.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Try live request first; on network/availability failure enqueue for later flush.
 */
export async function sendWithOfflineQueue(
  pendingInput: PendingMutationInput,
  exec: () => Promise<Response>
): Promise<SendMutationResult> {
  try {
    const response = await exec();
    if (response.ok) {
      return { mode: "sent", response };
    }
    if (shouldRetryHttpStatus(response.status)) {
      const row = enqueue(pendingInput);
      return { mode: "queued", id: row.id };
    }
    return { mode: "sent", response };
  } catch (err) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const row = enqueue(pendingInput);
      return { mode: "queued", id: row.id };
    }
    if (isRecoverableFetchFailure(err)) {
      const row = enqueue(pendingInput);
      return { mode: "queued", id: row.id };
    }
    throw err;
  }
}

export async function flushOfflineQueue(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pending = getOfflineQueueSnapshot();
  if (pending.length === 0) return;

  if (syncing) return;
  syncing = true;
  notify();

  try {
    for (const item of pending) {
      const ok = await executePending(item);
      if (ok) {
        removeById(item.id);
      } else {
        break;
      }
    }
  } finally {
    syncing = false;
    notify();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lifeos-offline-sync"));
    }
  }
}
