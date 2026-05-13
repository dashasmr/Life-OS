"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/services/offlineQueue";
import { useLifeOsRealtimeEpoch } from "@/services/realtime";

/**
 * Flushes the offline mutation queue when connectivity/API likely returns:
 * window online, periodic retry, app load, and SSE epoch bumps.
 */
export function OfflineQueueMount() {
  const realtimeEpoch = useLifeOsRealtimeEpoch();

  useEffect(() => {
    void flushOfflineQueue();
  }, []);

  useEffect(() => {
    const onOnline = () => void flushOfflineQueue();
    window.addEventListener("online", onOnline);
    const interval = window.setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) void flushOfflineQueue();
    }, 45000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (realtimeEpoch === 0) return;
    void flushOfflineQueue();
  }, [realtimeEpoch]);

  return null;
}
