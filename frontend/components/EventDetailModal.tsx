"use client";

import { useEffect, useRef } from "react";
import type { EventItem } from "@/lib/api";
import { formatLocalDateTimeLong } from "@/lib/datetime";
import {
  eventToRawJsonRecord,
  eventTypeToModule,
  formatMetadataLabel,
  formatMetadataValue,
  isEventPayloadEmpty
} from "@/lib/eventDetail";
import { ui } from "@/lib/ui";
import { X } from "lucide-react";

type EventDetailModalProps = {
  event: EventItem | null;
  onClose: () => void;
};

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = Boolean(event);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open, event?.id]);

  if (!event) return null;

  const payloadEmpty = isEventPayloadEmpty(event.payload);
  const sortedKeys = Object.keys(event.payload).sort((a, b) => a.localeCompare(b));
  const rawJson = JSON.stringify(eventToRawJsonRecord(event), null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-lifeos-nav-overlay backdrop-blur-[2px]"
        aria-label="Close event details"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-lifeos-border bg-lifeos-card shadow-ds-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-detail-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-lifeos-border px-5 py-4 sm:px-6">
          <h2 id="event-detail-title" className="text-lg font-semibold text-lifeos-fg">
            Event details
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-lifeos-fg-muted outline-none transition hover:bg-lifeos-hover hover:text-lifeos-fg focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className={`${ui.mutedText} font-medium`}>Type</dt>
              <dd className="mt-1 font-mono text-[0.8125rem] text-lifeos-fg">{event.type}</dd>
            </div>
            <div>
              <dt className={`${ui.mutedText} font-medium`}>Module</dt>
              <dd className="mt-1 text-lifeos-fg">{eventTypeToModule(event.type)}</dd>
            </div>
            <div>
              <dt className={`${ui.mutedText} font-medium`}>Time</dt>
              <dd className="mt-1 tabular-nums text-lifeos-fg">{formatLocalDateTimeLong(event.created_at)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-lifeos-accent">Metadata</p>
            {payloadEmpty ? (
              <p className={`mt-2 text-sm ${ui.mutedText}`}>No metadata</p>
            ) : (
              <dl className="mt-3 space-y-2 rounded-xl border border-lifeos-border bg-lifeos-inset p-4">
                {sortedKeys.map((key) => (
                  <div key={key} className="grid gap-1 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)] sm:gap-3">
                    <dt className={`break-words text-sm ${ui.mutedText}`}>{formatMetadataLabel(key)}</dt>
                    <dd className="break-words font-mono text-[0.8125rem] text-lifeos-fg-secondary">{formatMetadataValue(event.payload[key])}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-lifeos-accent">Raw JSON</p>
            <pre
              className={`${ui.codeBlock} mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[0.75rem] leading-relaxed text-lifeos-fg-secondary`}
            >
              {rawJson}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
