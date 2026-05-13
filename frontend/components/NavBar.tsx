"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, UserRound, X } from "lucide-react";
import { PAGE_SHELL_CLASS } from "@/components/layout/constants";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/dashboard/overview", label: "Dashboard", prefix: "/dashboard" as const },
  { href: "/work/tasks", label: "Work", prefix: "/work" as const },
  { href: "/life/cleaning", label: "Life", prefix: "/life" as const },
  { href: "/finance/dashboard", label: "Finance", prefix: "/finance" as const },
  { href: "/insights/activity", label: "Insights", prefix: "/insights" as const },
  { href: "/settings", label: "Settings", prefix: "/settings" as const }
] as const;

function isPrimaryActive(pathname: string, prefix: (typeof primaryNav)[number]["prefix"]): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function primaryNavLinkClass(active: boolean) {
  return cn(
    "inline-flex min-h-10 items-center rounded-lg px-3.5 text-[15px] font-medium leading-none tracking-tight transition-[background-color,color,box-shadow] duration-lifeos-normal ease-lifeos md:px-4",
    active
      ? "bg-lifeos-muted/85 font-semibold text-lifeos-fg shadow-none ring-1 ring-lifeos-border-subtle/50"
      : "text-lifeos-nav-text hover:bg-lifeos-hover/65 hover:text-lifeos-fg"
  );
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
              className="fixed inset-0 z-[140] bg-lifeos-nav-overlay backdrop-blur-[2px]"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={() => setMobileNavOpen(false)}
            />
            <div
              id="mobile-nav-drawer"
              className="fixed inset-y-0 right-0 z-[150] flex w-[min(20rem,calc(100vw-1rem))] flex-col border-l border-lifeos-border bg-lifeos-inset shadow-ds-md"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-lifeos-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <span className="text-sm font-medium text-lifeos-fg-muted">Menu</span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-lifeos-border text-lifeos-nav-text transition hover:bg-lifeos-hover"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3">
                {primaryNav.map((link) => {
                  const active = isPrimaryActive(pathname, link.prefix);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={primaryNavLinkClass(active)}
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
          "fixed inset-x-0 top-0 z-50 overflow-visible transition-[background-color,border-color,backdrop-filter] duration-lifeos-normal ease-lifeos",
          scrolled || mobileNavOpen
            ? "border-b border-lifeos-border bg-lifeos-page/92 backdrop-blur-md"
            : "border-b border-transparent bg-lifeos-page/75 backdrop-blur-sm"
        ].join(" ")}
      >
        <nav
          className={`${PAGE_SHELL_CLASS} flex items-center gap-2 overflow-visible py-3 sm:gap-4 sm:py-4`}
          aria-label="Primary"
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/overview"
              className="group shrink-0 rounded-lg py-1 pr-1 outline-none transition focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page"
              aria-label="Life OS home"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-lifeos-fg transition-colors duration-lifeos-normal ease-lifeos group-hover:text-lifeos-accent">
                Life OS
              </span>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 px-1 md:flex lg:gap-2.5 xl:gap-3">
            {primaryNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={primaryNavLinkClass(isPrimaryActive(pathname, link.prefix))}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <NotificationBell />
            <Link
              href="/settings"
              className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-transparent text-lifeos-fg-muted outline-none transition hover:bg-lifeos-hover/80 hover:text-lifeos-fg focus-visible:ring-2 focus-visible:ring-focus sm:inline-flex"
              aria-label="Account and settings"
            >
              <UserRound className="size-[1.125rem]" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lifeos-border-subtle/40 bg-transparent text-lifeos-fg-muted transition hover:bg-lifeos-hover md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? (
                <X className="size-5" strokeWidth={1.75} />
              ) : (
                <Menu className="size-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </nav>
      </header>
      {mobileMenu}
    </>
  );
}
