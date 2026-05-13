import { API_URL } from "@/lib/api";
import type { BehaviorPattern, BehaviorPatternsResponse } from "@/lib/patterns/types";

/**
 * Half-open window [fromIso, toIso), same contract as finance summary range.
 */
export async function fetchBehaviorPatterns(
  fromIso: string,
  toIso: string,
  baseUrl: string = API_URL
): Promise<BehaviorPatternsResponse> {
  const qs = `from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  const response = await fetch(`${baseUrl}/analytics/behavior-patterns?${qs}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load behavior patterns");
  const data = (await response.json()) as BehaviorPatternsResponse | BehaviorPattern[];
  if (Array.isArray(data)) {
    return { patterns: data, insufficientHistory: false };
  }
  return {
    patterns: data.patterns ?? [],
    insufficientHistory: Boolean(data.insufficientHistory)
  };
}
