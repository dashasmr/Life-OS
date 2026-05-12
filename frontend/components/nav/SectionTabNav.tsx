"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTabItem = { href: string; label: string };

type Props = {
  tabs: readonly SectionTabItem[];
  ariaLabel: string;
};

export function SectionTabNav({ tabs, ariaLabel }: Props) {
  const pathname = usePathname();

  return (
    <div className="-mx-1 mb-6 overflow-x-auto pb-1">
      <nav
        className="flex min-w-0 gap-1 rounded-xl border border-[#2A2F36] bg-[#11151A]/80 p-1"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href as Route}
              className={[
                "inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-[#C6A36B] text-black" : "text-[#B8BFC7] hover:bg-[#171B21] hover:text-white"
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
