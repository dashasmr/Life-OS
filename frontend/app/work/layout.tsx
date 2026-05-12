"use client";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const WORK_TABS = [
  { href: "/work/tasks", label: "Tasks" },
  { href: "/work/focus", label: "Focus" },
  { href: "/work/pomodoro", label: "Pomodoro" }
] as const;

export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <SectionTabNav ariaLabel="Work sections" tabs={WORK_TABS} />
      {children}
    </div>
  );
}
