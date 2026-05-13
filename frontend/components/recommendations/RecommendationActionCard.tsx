"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WhyLine } from "@/components/explainability/WhyLine";
import type { NextActionRecommendation } from "@/lib/recommendations/types";

export type RecommendationActionCardProps = {
  action: NextActionRecommendation;
  busy: boolean;
  onPrimary: () => Promise<void>;
  onDismiss: () => void;
  onImplicitIgnore: () => void;
  nextActionPriorityClass: (p: NextActionRecommendation["priority"]) => string;
  nextActionCategoryLabel: (t: NextActionRecommendation["type"]) => string;
  formatDateTimeFiNumeric: (iso: string) => string;
  mutedTextClass: string;
  /** Dashboard hero — larger type, stronger CTA, less chrome */
  layout?: "default" | "featured";
};

/**
 * Next-action row with primary CTA, dismiss, optional implicit "ignored" signal after idle timeout.
 */
export function RecommendationActionCard(props: RecommendationActionCardProps) {
  const interacted = useRef(false);
  const ignoreSent = useRef(false);
  const featured = props.layout === "featured";

  const markInteract = () => {
    interacted.current = true;
  };

  useEffect(() => {
    interacted.current = false;
    ignoreSent.current = false;
    const t = window.setTimeout(() => {
      if (interacted.current || ignoreSent.current) return;
      ignoreSent.current = true;
      props.onImplicitIgnore();
    }, 120_000);
    return () => window.clearTimeout(t);
    // Only reset timer when this recommendation row identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.action.id]);

  const category = props.nextActionCategoryLabel(props.action.type);
  const pri = props.action.priority;

  return (
    <article
      className={
        featured
          ? "flex flex-col gap-ds-6 rounded-ds-card bg-lifeos-muted/25 p-ds-7 shadow-inner md:flex-row md:items-start md:justify-between md:p-ds-8"
          : "flex flex-col gap-4 rounded-xl bg-lifeos-muted/25 p-4 shadow-inner sm:flex-row sm:items-start sm:justify-between md:p-5"
      }
    >
      <div className={`flex min-w-0 flex-1 ${featured ? "gap-ds-5" : "gap-4"}`}>
        <span className={featured ? "text-3xl leading-none" : "text-2xl leading-none"} aria-hidden>
          {props.action.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={
              featured
                ? "text-lg font-semibold leading-snug text-lifeos-fg md:text-xl"
                : "text-base font-medium leading-snug text-lifeos-fg"
            }
          >
            {props.action.message}
          </p>
          <WhyLine text={props.action.explanation ?? ""} />
          {featured ? (
            <div className="mt-ds-4 flex flex-wrap items-center gap-x-ds-3 gap-y-ds-2 text-lifeos-caption text-lifeos-fg-muted">
              <span>
                {category}
                <span className="text-lifeos-border"> · </span>
                <span className="capitalize">{pri}</span>
                {props.action.confidence != null ? (
                  <>
                    <span className="text-lifeos-border"> · </span>
                    <span title="Adaptive fit from your responses">{Math.round(props.action.confidence * 100)}% fit</span>
                  </>
                ) : null}
              </span>
              <span className={`tabular-nums ${props.mutedTextClass}`} suppressHydrationWarning title="When this was last updated">
                {props.formatDateTimeFiNumeric(props.action.generatedAt)}
              </span>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${props.nextActionPriorityClass(props.action.priority)}`}
              >
                {props.action.priority}
              </span>
              <span className="rounded-md bg-lifeos-muted/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lifeos-accent shadow-sm">
                {props.nextActionCategoryLabel(props.action.type)}
              </span>
              {props.action.confidence != null ? (
                <span
                  className="rounded-md bg-lifeos-success-muted/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lifeos-success shadow-sm"
                  title="Adaptive fit score from your past responses"
                >
                  fit {(props.action.confidence * 100).toFixed(0)}%
                </span>
              ) : null}
              <span className={`text-xs tabular-nums ${props.mutedTextClass}`} suppressHydrationWarning title="When this was last updated">
                {props.formatDateTimeFiNumeric(props.action.generatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className={`flex w-full flex-col ${featured ? "gap-ds-3" : "gap-2"} sm:w-auto sm:min-w-[11rem] sm:items-end`}>
        {props.action.primaryAction ? (
          <Button
            variant="primary"
            size={featured ? "lg" : "md"}
            className={cn(
              featured ? "w-full sm:w-auto sm:min-w-[12rem]" : "w-full shrink-0 sm:w-auto"
            )}
            disabled={props.busy}
            onMouseDown={markInteract}
            onClick={() => {
              markInteract();
              void props.onPrimary();
            }}
            type="button"
          >
            {props.busy ? "Working…" : props.action.primaryAction.buttonLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size={featured ? "md" : "sm"}
          className="w-full sm:w-auto"
          onMouseDown={markInteract}
          onClick={() => {
            markInteract();
            props.onDismiss();
          }}
        >
          Not now
        </Button>
      </div>
    </article>
  );
}
