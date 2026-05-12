"use client";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const LIFE_TABS = [
  { href: "/life/cleaning", label: "Cleaning" },
  { href: "/life/home-health", label: "Home Health" },
  { href: "/life/consistency", label: "Consistency" }
] as const;

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <SectionTabNav ariaLabel="Life sections" tabs={LIFE_TABS} />
      {children}
    </div>
  );
}
