import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { dashboard } from "@/styles/design-system";

export type SurfaceVariant = "hero" | "primary" | "secondary" | "inset";

/**
 * Visual hierarchy for dashboard-style layouts.
 * Prefer elevation + spacing over heavy outlines; borders stay token-based and subtle.
 */
const VARIANT_CLASS: Record<SurfaceVariant, string> = {
  hero: cn(
    "dashboard-hero-shell relative isolate overflow-hidden rounded-ds-card",
    "bg-lifeos-elevated/80 shadow-surface-hero backdrop-blur-[2px]",
    "py-10 px-12 max-md:px-8 max-md:py-8"
  ),
  /** Highest emphasis — key panels (main actions, primary summaries). */
  primary: cn(
    "relative overflow-hidden rounded-ds-card bg-lifeos-elevated",
    "shadow-surface-primary",
    "px-ds-6 py-ds-6 md:px-ds-7 md:py-ds-7"
  ),
  /** Default shell — readable cards without heavy chrome. */
  secondary: cn(
    "relative overflow-hidden rounded-ds-card bg-lifeos-card",
    "shadow-surface-secondary",
    "px-ds-5 py-ds-5 md:px-ds-6 md:py-ds-6"
  ),
  /**
   * Nested content — softer plane inside a card; blends via fill + inner depth.
   */
  inset: cn(
    "relative rounded-ds-input bg-lifeos-muted/22",
    "shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]",
    "px-ds-5 py-ds-5 md:px-ds-6 md:py-ds-6"
  )
};

export type SurfaceProps<T extends ElementType = "section"> = {
  as?: T;
  variant: SurfaceVariant;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

export function Surface<T extends ElementType = "section">({
  as,
  variant,
  children,
  className,
  ...rest
}: SurfaceProps<T>) {
  const Component = (as ?? "section") as ElementType;

  if (variant === "hero") {
    return (
      <Component className={cn(VARIANT_CLASS.hero, className)} {...rest}>
        <div className={dashboard.heroFade} aria-hidden />
        <div className="relative z-10">{children}</div>
      </Component>
    );
  }

  return (
    <Component className={cn(VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </Component>
  );
}
