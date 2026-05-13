export type BehaviorPatternCategory = "focus" | "cleaning" | "finance";

/**
 * Rule-based behavioral signal from `/analytics/behavior-patterns` (not LLM output).
 */
export type BehaviorPattern = {
  id: string;
  category: BehaviorPatternCategory;
  /** 0–1 strength from sample size and effect size heuristics. */
  confidence: number;
  message: string;
};

/** Envelope from `/analytics/behavior-patterns` including sample sufficiency. */
export type BehaviorPatternsResponse = {
  patterns: BehaviorPattern[];
  insufficientHistory: boolean;
};