import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ds } from "@/styles/design-system";
import { MutedText, SectionTitle } from "@/components/ui/typography";

export type SectionHeaderProps = {
  label?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ label, title, description, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-ds-5 md:flex-row md:items-start md:justify-between md:gap-ds-8",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-ds-5">
        <div className="space-y-ds-2">
          {label ? <p className={ds.typography.sectionEyebrow}>{label}</p> : null}
          <SectionTitle>{title}</SectionTitle>
        </div>
        {description ? (
          <MutedText className={cn(ds.typography.proseMax, "mt-0")}>{description}</MutedText>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-ds-3 md:self-center">{action}</div>
      ) : null}
    </div>
  );
}
