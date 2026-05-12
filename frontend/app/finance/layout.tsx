"use client";

import { SectionTabNav } from "@/components/nav/SectionTabNav";

const FINANCE_TABS = [
  { href: "/finance/dashboard", label: "Dashboard" },
  { href: "/finance/transactions", label: "Transactions" }
] as const;

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <SectionTabNav ariaLabel="Finance sections" tabs={FINANCE_TABS} />
      {children}
    </div>
  );
}
