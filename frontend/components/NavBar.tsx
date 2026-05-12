"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ui } from "@/lib/ui";

const primaryNav = [
  { href: "/dashboard/overview", label: "Dashboard", prefix: "/dashboard" as const },
  { href: "/work/tasks", label: "Work", prefix: "/work" as const },
  { href: "/life/cleaning", label: "Life", prefix: "/life" as const },
  { href: "/finance/dashboard", label: "Finance", prefix: "/finance" as const },
  { href: "/insights/activity", label: "Insights", prefix: "/insights" as const }
] as const;

function isPrimaryActive(pathname: string, prefix: (typeof primaryNav)[number]["prefix"]): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function NavBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const mobileMenu =
    mounted && mobileNavOpen
      ? createPortal(
          <div className="md:hidden">
            <button
              type="button"
              className="fixed inset-0 z-[140] bg-[#050608]/70 backdrop-blur-[2px]"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              id="mobile-nav-drawer"
              className="fixed inset-y-0 right-0 z-[150] flex w-[min(20rem,calc(100vw-1rem))] flex-col border-l border-[#2A2F36] bg-[#0F1318] shadow-[0_0_0_1px_rgba(42,47,54,0.6)]"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#2A2F36] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A8F98]">Navigate</span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2A2F36] text-[#B8BFC7] transition hover:bg-[#171B21]"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {primaryNav.map((link) => {
                  const active = isPrimaryActive(pathname, link.prefix);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={
                        active
                          ? "rounded-xl bg-[#C6A36B] px-4 py-3 text-sm font-medium text-black"
                          : "rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-[#E5E5E5] transition hover:border-[#2A2F36] hover:bg-[#141A22]"
                      }
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 overflow-visible transition",
          scrolled || mobileNavOpen
            ? "bg-[#0B0D10]/90 backdrop-blur border-b border-[#2A2F36]"
            : "bg-transparent"
        ].join(" ")}
      >
        <nav
          className={`${ui.containerClass} flex items-center justify-between gap-3 overflow-visible py-3 sm:py-4`}
          aria-label="Primary"
        >
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/overview"
              className="group shrink-0 rounded-lg py-1 pr-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[#C6A36B]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]"
              aria-label="Life OS — home"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B8BFC7] transition group-hover:text-[#E5E5E5] group-hover:drop-shadow-[0_0_12px_rgba(198,163,107,0.15)]">
                Life OS
              </span>
            </Link>
            <div className="shrink-0">
              <NotificationBell />
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-2 md:flex">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isPrimaryActive(pathname, link.prefix) ? ui.pillActive : ui.pill}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2A2F36] bg-[#141A22] text-[#E5E5E5] transition hover:border-[#3d4652] hover:bg-[#1a2028] md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
          </button>
        </nav>
      </header>
      {mobileMenu}
    </>
  );
}
