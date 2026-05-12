"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Lightbulb, ListTodo, Wallet } from "lucide-react";

const items = [
  { href: "/dashboard/overview", label: "Dashboard", Icon: LayoutDashboard, prefix: "/dashboard" as const },
  { href: "/work/tasks", label: "Work", Icon: ListTodo, prefix: "/work" as const },
  { href: "/life/cleaning", label: "Life", Icon: Home, prefix: "/life" as const },
  { href: "/finance/dashboard", label: "Finance", Icon: Wallet, prefix: "/finance" as const },
  { href: "/insights/activity", label: "Insights", Icon: Lightbulb, prefix: "/insights" as const }
] as const;

function routeActive(pathname: string, prefix: (typeof items)[number]["prefix"]): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2A2F36] bg-[#0B0D10]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Primary mobile"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-5 gap-0.5 px-1 pt-1">
        {items.map(({ href, label, Icon, prefix }) => {
          const active = routeActive(pathname, prefix);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium leading-tight transition touch-manipulation",
                active
                  ? "text-[#C6A36B]"
                  : "text-[#8A8F98] active:bg-[#141A22] hover:text-[#c9d0d8]"
              ].join(" ")}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="max-w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
