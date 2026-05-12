"use client";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const DASHBOARD_TABS = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/command-center", label: "Command Center" },
  { href: "/dashboard/daily-plan", label: "Daily Plan" },
  { href: "/dashboard/recommendations", label: "Recommendations" },
  { href: "/dashboard/notifications", label: "Notifications" }
] as const;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <SectionTabNav ariaLabel="Dashboard sections" tabs={DASHBOARD_TABS} />
      {children}
    </div>
  );
}
