import { ui } from "@/lib/ui";

/** Short human-readable “why” line for recommendations, risks, and insights. */
export function WhyLine({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <p className="mt-2 border-l-2 border-lifeos-border-subtle pl-3 text-sm leading-relaxed text-lifeos-nav-text">
      <span className="font-medium text-lifeos-fg-secondary">Why? </span>
      {t}
    </p>
  );
}

export function WhyMuted({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return null;
  return (
    <p className={`mt-1.5 text-xs leading-snug ${ui.mutedText}`}>
      <span className="font-medium text-lifeos-fg-muted">Why? </span>
      {t}
    </p>
  );
}
