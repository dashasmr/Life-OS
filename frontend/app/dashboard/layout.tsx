"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const DASHBOARD_TABS = [
  { href: "/dashboard/overview", label: "Overview" },
  { href: "/dashboard/goals", label: "Goals" },
  { href: "/dashboard/command-center", label: "Command Center" },
  { href: "/dashboard/daily-plan", label: "Today" },
  { href: "/dashboard/recommendations", label: "Suggestions" },
  { href: "/dashboard/notifications", label: "Notifications" }
] as const;

function DashboardBreadcrumb() {
  const pathname = usePathname();
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const tab = DASHBOARD_TABS.find((t) => t.href === normalized);
  if (!tab) return null;

  return (
    <div className="mb-3 md:mb-4">
      <p className="text-[11px] font-normal tracking-wide text-lifeos-fg-muted/75 md:text-xs">
        <Link href="/dashboard/overview" className="transition hover:text-lifeos-fg-secondary">
          Dashboard
        </Link>
        <span className="mx-2 font-light text-lifeos-border-subtle" aria-hidden>
          /
        </span>
        <span className="text-lifeos-fg-muted">{tab.label}</span>
      </p>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0">
      <DashboardBreadcrumb />
      <SectionTabNav ariaLabel="Dashboard sections" tabs={DASHBOARD_TABS} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}