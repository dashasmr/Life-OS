"use client";

import Link from "next/link";
import { ManualEventForm } from "@/components/developer/ManualEventForm";
import { ui } from "@/lib/ui";
import { ds } from "@/styles/design-system";
import { cn } from "@/lib/utils";

export default function DeveloperToolsPage() {
  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <nav className="text-lifeos-caption font-medium text-lifeos-accent" aria-label="Breadcrumb">
          <Link href="/settings" className="text-lifeos-fg-muted transition hover:text-lifeos-accent">
            Settings
          </Link>
          <span className="mx-2 text-lifeos-fg-muted" aria-hidden>
            /
          </span>
          <span className="text-lifeos-fg-secondary">Developer tools</span>
        </nav>

        <h1 className="mt-4 text-2xl font-semibold text-lifeos-fg">Developer tools</h1>
        <p className={`mt-2 max-w-2xl ${ui.pageHint}`}>Testing and internal controls.</p>

        <section className={cn("mt-10", ds.card.dashboardInset)}>
          <h2 className="text-lg font-semibold text-lifeos-fg">Manual event</h2>
          <p className={`mt-1 text-sm ${ui.mutedText}`}>POST a test event to the log.</p>
          <div className="mt-6">
            <ManualEventForm />
          </div>
        </section>
      </section>
    </div>
  );
}
