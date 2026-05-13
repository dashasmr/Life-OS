"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ds } from "@/styles/design-system";

export type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
};

/**
 * Label + control + hint/error — keep the same rhythm across Goals, Finance, Tasks, Cleaning.
 */
export function FormField({ id, label, hint, error, children, className, optional }: FormFieldProps) {
  return (
    <div className={cn("grid gap-ds-2", className)}>
      <label htmlFor={id} className={ds.typography.uiLabel}>
        {label}
        {optional ? <span className="font-normal text-lifeos-fg-secondary"> · optional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-lifeos-caption leading-snug text-lifeos-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={cn(ds.typography.bodyMuted, "mt-0")}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
