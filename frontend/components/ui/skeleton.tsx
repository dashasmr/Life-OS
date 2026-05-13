import * as React from "react";

import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Subtle moving highlight (loading surfaces) */
  shimmer?: boolean;
};

/**
 * Loading placeholder — pulse by default; optional shimmer for list/page shells.
 */
export function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  if (shimmer) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-md bg-lifeos-muted/90", className)}
        {...props}
      >
        <div
          className="absolute inset-0 animate-lifeos-shimmer bg-gradient-to-r from-transparent via-lifeos-fg/[0.06] to-transparent motion-reduce:animate-none"
          aria-hidden
        />
      </div>
    );
  }

  return <div className={cn("animate-pulse rounded-md bg-lifeos-muted/90 motion-reduce:animate-none", className)} {...props} />;
}

/** Compact block for replacing “Loading…” copy in page shells */
export function PageSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-busy aria-live="polite">
      <Skeleton shimmer className="h-8 w-44 rounded-lg" />
      <Skeleton shimmer className="h-4 w-full max-w-lg rounded-md" />
      <Skeleton shimmer className="h-36 w-full rounded-ds-card" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton shimmer className="h-28 rounded-ds-card" />
        <Skeleton shimmer className="h-28 rounded-ds-card" />
      </div>
    </div>
  );
}
