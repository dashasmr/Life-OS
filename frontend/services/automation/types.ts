import type { CleaningZone, FocusSession, TaskItem } from "@/lib/api";
import type { GoalCategory, GoalStatus, GoalUnit } from "@/lib/goals/types";
import type { NotificationDraft } from "@/services/notifications";
import type { NextActionRecommendation } from "@/lib/recommendations/types";
import type { RiskCategory, RiskSeverity } from "@/lib/risks/types";

/**
 * Unified snapshot for IF → THEN automations (no React).
 * Optional fields stay undefined when a surface does not load that data yet.
 */
export type AutomationContext = {
  cleaningZones: CleaningZone[];
  focusSessions: FocusSession[];
  tasks: TaskItem[];
  expensesTodayTotal: number;
  dailyEventsTotal?: number | null;
  goals?: Array<{
    id: string;
    title: string;
    status: GoalStatus;
    period: string;
    category: GoalCategory;
    currentValue: number;
    targetValue: number;
    unit: GoalUnit;
  }> | null;
  todayTasksCompleted?: number;
  todayFocusMinutes?: number;
  now: Date;
};

export type AutomationRiskSignal = {
  id: string;
  message: string;
  explanation: string;
  severity: RiskSeverity;
  category: RiskCategory;
  detectedAt: string;
  source: "automation";
};

export type AutomationPositiveInsight = {
  message: string;
  explanation: string;
};

export type AutomationSink = {
  notifications: NotificationDraft[];
  recommendations: NextActionRecommendation[];
  automationRiskSignals: AutomationRiskSignal[];
  positiveInsights: AutomationPositiveInsight[];
};

export type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  condition: (ctx: AutomationContext) => boolean;
  action: (ctx: AutomationContext, sink: AutomationSink) => void;
};
