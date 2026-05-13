export type RiskSeverity = "low" | "medium" | "high";
export type RiskCategory = "focus" | "finance" | "environment";

export type RiskSignal = {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  message: string;
  /** Why this signal fired (from backend detectors). */
  explanation?: string;
  detectedAt: string;
};
