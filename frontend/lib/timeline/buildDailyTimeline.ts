import type { EventItem } from "@/lib/api";
import { formatTimeLocalHm, localDateKeyFromIso } from "@/lib/datetime";
import { mapEventToTimelineCopy } from "@/lib/timeline/eventLabels";
import type { TimelineRow } from "@/lib/timeline/types";

/**
 * All events whose local calendar day matches `dayKey` (YYYY-MM-DD), oldest first.
 */
export function buildDailyTimeline(events: EventItem[], dayKey: string): TimelineRow[] {
  const rows: TimelineRow[] = [];

  for (const event of events) {
    if (localDateKeyFromIso(event.created_at) !== dayKey) continue;
    const at = new Date(event.created_at);
    const atMs = at.getTime();
    if (Number.isNaN(atMs)) continue;

    const { headline, detail } = mapEventToTimelineCopy(event);
    rows.push({
      id: event.id,
      atMs,
      timeLabel: formatTimeLocalHm(event.created_at),
      headline,
      detail
    });
  }

  rows.sort((a, b) => a.atMs - b.atMs);
  return rows;
}
