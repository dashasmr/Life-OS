import type { PendingMutation } from "@/services/offlineQueue/types";

const STORAGE_KEY = "life-os-offline-mutation-queue-v1";

export function loadQueue(): PendingMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as PendingMutation[];
  } catch {
    return [];
  }
}

export function saveQueue(items: PendingMutation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}
