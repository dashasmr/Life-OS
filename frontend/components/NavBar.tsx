"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ui } from "@/lib/ui";

const links = [
  { href: "/", label: "Overview" },
  { href: "/activity", label: "Activity" },
  { href: "/tasks", label: "Tasks" },
  { href: "/finance", label: "Finance" },
  { href: "/cleaning", label: "Cleaning" },
  { href: "/focus", label: "Focus" },
  { href: "/pomodoro", label: "Pomodoro" }
] as const;

export function NavBar() {
  const pathname = usePathname();
  const isOverview = pathname === "/" || pathname === "/overview";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition",
        scrolled ? "bg-[#0B0D10]/90 backdrop-blur border-b border-[#2A2F36]" : "bg-transparent"
      ].join(" ")}
    >
      <nav className={`${ui.containerClass} flex items-center justify-between gap-4 py-4`}>
        <div>
          <p className={`text-xs uppercase tracking-[0.18em] ${ui.mutedText}`}>Life OS</p>
          <p className="text-lg font-semibold tracking-wide text-[#E5E5E5]">Dashboard</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const isActive = link.href === "/" ? isOverview : pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={isActive ? ui.pillActive : ui.pill}>
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

