"use client";

import type { ReactNode } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NavBar } from "@/components/NavBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { AppToaster } from "@/components/ui/toaster";
import { ui } from "@/lib/ui";

type AppShellProps = {
  children: ReactNode;
};

/**
 * Global shell: page background, sticky primary navigation, unified content width, mobile nav.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={ui.pageClass}>
      <NavBar />
      <main className="min-h-0 min-w-0 pt-24 pb-ds-8 transition-[background-color,color] duration-lifeos-theme ease-out max-md:pb-[calc(3.75rem+env(safe-area-inset-bottom)+1.5rem)]">
        <PageContainer className="py-ds-6 md:py-ds-7">{children}</PageContainer>
      </main>
      <MobileBottomNav />
      <AppToaster />
    </div>
  );
}
