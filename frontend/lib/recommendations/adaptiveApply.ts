import type { AdaptiveContext } from "@/lib/api";
import type { NextActionRecommendation, RecommendationPriority } from "@/lib/recommendations/types";

const PRIORITY_SCORE: Record<RecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1
};

function adjustmentFor(ctx: AdaptiveContext | undefined, id: string) {
  const raw = ctx?.adjustments[id];
  return {
    priority_weight: raw?.priority_weight ?? 1,
    confidence: raw?.confidence ?? 0.55,
    avoid_hours_local: raw?.avoid_hours_local ?? [],
    prefer_hours_local: raw?.prefer_hours_local ?? [],
    defer_show_until_hour_local: raw?.defer_show_until_hour_local ?? null,
    min_minutes_between_suggestions: raw?.min_minutes_between_suggestions ?? 0
  };
}

function cooldownActive(id: string, minMinutes: number): boolean {
  if (minMinutes <= 0 || typeof sessionStorage === "undefined") return false;
  const raw = sessionStorage.getItem(`lifeos_rec_cd_${id}`);
  if (!raw) return false;
  const ts = Number.parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < minMinutes * 60_000;
}

/** Call when user dismisses or ignores so frequency adaptation can throttle repeats. */
export function touchRecommendationCooldown(id: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`lifeos_rec_cd_${id}`, String(Date.now()));
}

export function clearRecommendationCooldown(id: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`lifeos_rec_cd_${id}`);
}

/**
 * Applies persisted adaptive profile: timing windows, priority weights, frequency cooldown.
 * Pure aside from optional sessionStorage cooldown reads.
 */
export function applyAdaptiveRecommendations(
  items: NextActionRecommendation[],
  ctx: AdaptiveContext | undefined,
  now: Date
): NextActionRecommendation[] {
  const hour = now.getHours();

  const scored: Array<{ rec: NextActionRecommendation; score: number; confidence: number }> = [];

  for (const rec of items) {
    const adj = adjustmentFor(ctx, rec.id);

    if (cooldownActive(rec.id, adj.min_minutes_between_suggestions)) {
      continue;
    }

    if (adj.avoid_hours_local.includes(hour)) {
      continue;
    }

    if (rec.type === "cleaning" && adj.defer_show_until_hour_local != null) {
      if (hour < adj.defer_show_until_hour_local) {
        continue;
      }
    }

    const base = PRIORITY_SCORE[rec.priority];
    let score = base * adj.priority_weight;
    if (adj.prefer_hours_local.includes(hour)) {
      score *= 1.1;
    }

    scored.push({
      rec: { ...rec, confidence: adj.confidence },
      score,
      confidence: adj.confidence
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.rec);
}
