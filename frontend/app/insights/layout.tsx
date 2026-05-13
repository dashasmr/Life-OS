"use client";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const INSIGHTS_TABS = [
  { href: "/insights/activity", label: "Activity" },
  { href: "/insights/timeline", label: "Timeline" },
  { href: "/insights/review", label: "Review" },
  { href: "/insights/monthly-review", label: "Monthly Review" },
  { href: "/insights/ai-insight", label: "Daily insight" },
  { href: "/insights/ai-reviews", label: "Review history" }
] as const;

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <SectionTabNav ariaLabel="Insights sections" tabs={INSIGHTS_TABS} />
      {children}
    </div>
  );
}
