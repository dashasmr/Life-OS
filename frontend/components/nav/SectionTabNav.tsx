"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type SectionTabItem = { href: string; label: string };

type Props = {
  tabs: readonly SectionTabItem[];
  ariaLabel: string;
};

/**
 * Secondary section navigation — plain row, lighter than primary app nav (underline / muted inactive).
 */
export function SectionTabNav({ tabs, ariaLabel }: Props) {
  const pathname = usePathname();
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  return (
    <div className="-mx-1 mb-ds-6 overflow-x-auto pb-0.5 md:mb-ds-7">
      <nav
        className="flex min-w-0 flex-wrap items-center gap-ds-2 md:gap-ds-3"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = normalized === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href as Route}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-ds-button px-ds-4 py-ds-2 text-[13px] leading-snug transition-[background-color,color,box-shadow] duration-200 md:text-sm",
                active
                  ? "bg-lifeos-elevated font-medium text-lifeos-fg shadow-ds-sm"
                  : "font-normal text-lifeos-fg-muted hover:bg-lifeos-muted/50 hover:text-lifeos-fg-secondary"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
