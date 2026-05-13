import Link from "next/link";
import { ui } from "@/lib/ui";

export default function HomeHealthPage() {
  return (
    <div className={ui.contentClass}>
      <section className={ui.panelClass}>
        <h1 className="text-2xl font-semibold text-lifeos-fg">Home Health</h1>
        <p className={ui.pageHint}>
          A dedicated space for how your home feels over time. Zone health scores and cadence live on the Cleaning tab for now —
          this section is a home for future vitals (air, sleep environment, maintenance debt) without mixing them into finance or
          work.
        </p>
        <div className={`mt-6 rounded-xl border border-lifeos-border bg-lifeos-muted/60 px-4 py-4 text-sm ${ui.mutedText}`}>
          <p>
            <span className="font-medium text-lifeos-fg-secondary">Coming together.</span> Use{" "}
            <Link className="text-lifeos-accent underline-offset-2 hover:underline" href="/life/cleaning">
              Cleaning
            </Link>{" "}
            to manage zones and the home health score derived from them.
          </p>
        </div>
      </section>
    </div>
  );
}
