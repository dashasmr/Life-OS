import { localCalendarDayKeyFromDate } from "@/lib/datetime";
import type { DailyPlanCategory, DailyPlanItem, DailyPlanPriority } from "@/lib/dailyPlan/types";

const PREFIX = "lifeos-daily-plan-extra";

function storageKey(now: Date): string {
  return `${PREFIX}:${localCalendarDayKeyFromDate(now)}`;
}

export type StoredExtraPlanItem = {
  id: string;
  title: string;
  category: DailyPlanCategory;
  priority: DailyPlanPriority;
};

/** Extra rows merged into Today’s Daily Plan (habit support, etc.). */
export function loadExtraDailyPlanItems(now: Date): StoredExtraPlanItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(now));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: StoredExtraPlanItem[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      if (
        typeof o.id === "string" &&
        typeof o.title === "string" &&
        typeof o.category === "string" &&
        typeof o.priority === "string"
      ) {
        out.push({
          id: o.id,
          title: o.title,
          category: o.category as DailyPlanCategory,
          priority: o.priority as DailyPlanPriority
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function appendExtraDailyPlanItem(now: Date, item: StoredExtraPlanItem): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cur = loadExtraDailyPlanItems(now);
    if (cur.some((x) => x.id === item.id)) return false;
    cur.push(item);
    window.localStorage.setItem(storageKey(now), JSON.stringify(cur));
    window.dispatchEvent(new CustomEvent("lifeos-daily-plan-extra-changed"));
    return true;
  } catch {
    return false;
  }
}

export function extraItemsToPlanRows(items: StoredExtraPlanItem[], completedIds: Set<string>): DailyPlanItem[] {
  return items.map((x) => ({
    ...x,
    completed: completedIds.has(x.id)
  }));
}
