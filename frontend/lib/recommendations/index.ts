export {
  generateNextActions,
  runRecommendationsAutomation,
  type RecommendationsEngineInput,
  type RecommendationsAutomationResult,
  type TodayAutomationStats
} from "@/lib/recommendations/engine";
export type {
  NextActionRecommendation,
  RecommendationCategory,
  RecommendationPrimaryAction,
  RecommendationPriority
} from "@/lib/recommendations/types";
export type { AutomationPositiveInsight, AutomationRiskSignal } from "@/services/automation/types";
