export { runAutomationEngine, createEmptyAutomationSink } from "@/services/automation/engine";
export type { RunAutomationOptions } from "@/services/automation/engine";
export { AUTOMATION_RULES } from "@/services/automation/rules";
export { AUTOMATION_RULE_SETTING_CATALOG } from "@/services/automation/ruleSettingCatalog";
export type {
  AutomationContext,
  AutomationPositiveInsight,
  AutomationRiskSignal,
  AutomationRule,
  AutomationSink
} from "@/services/automation/types";
export type { AutomationSetting, AutomationSettingCategory } from "@/services/automation/settingsTypes";
export {
  AUTOMATION_SETTINGS_CHANGED_EVENT,
  AUTOMATION_SETTINGS_STORAGE_KEY,
  getAutomationSettingsForUi,
  isAutomationRuleEnabledByUser,
  setAutomationRuleEnabled
} from "@/services/automation/settingsStorage";
