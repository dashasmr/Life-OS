import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ds } from "@/styles/design-system";

type WithAs<E extends ElementType> = {
  as?: E;
  className?: string;
  children?: ReactNode;
};

export function PageTitle({
  as,
  className,
  children,
  ...rest
}: WithAs<"h1"> & ComponentPropsWithoutRef<"h1">) {
  const Tag = (as ?? "h1") as ElementType;
  return (
    <Tag className={cn(ds.typography.pageTitle, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({
  as,
  className,
  children,
  ...rest
}: WithAs<"h2"> & ComponentPropsWithoutRef<"h2">) {
  const Tag = (as ?? "h2") as ElementType;
  return (
    <Tag className={cn(ds.typography.sectionTitle, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardTitle({
  as,
  className,
  children,
  ...rest
}: WithAs<"h3"> & ComponentPropsWithoutRef<"h3">) {
  const Tag = (as ?? "h3") as ElementType;
  return (
    <Tag className={cn(ds.typography.cardTitle, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function BodyText({
  as,
  className,
  children,
  ...rest
}: WithAs<"p"> & ComponentPropsWithoutRef<"p">) {
  const Tag = (as ?? "p") as ElementType;
  return (
    <Tag className={cn(ds.typography.body, className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Readable secondary tone — hero leads, section descriptions */
export function MutedText({
  as,
  className,
  children,
  ...rest
}: WithAs<"p"> & ComponentPropsWithoutRef<"p">) {
  const Tag = (as ?? "p") as ElementType;
  return (
    <Tag className={cn(ds.typography.sectionLead, className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Tight labels for forms and dense UI */
export function LabelText({
  as,
  className,
  children,
  ...rest
}: WithAs<"span"> & ComponentPropsWithoutRef<"span">) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag className={cn(ds.typography.uiLabel, className)} {...rest}>
      {children}
    </Tag>
  );
}

type MetricValueProps = {
  as?: "p" | "span" | "dd";
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"dd">, "className" | "children">;

export function MetricValue({ as = "p", className, children, ...rest }: MetricValueProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn(ds.typography.metricValue, className)} {...rest}>
      {children}
    </Tag>
  );
}

type MetricLabelProps = {
  as?: "p" | "span" | "dt";
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"dt">, "className" | "children">;

export function MetricLabel({ as = "p", className, children, ...rest }: MetricLabelProps) {
  const Tag = as as ElementType;
  return (
    <Tag className={cn(ds.typography.metricLabel, className)} {...rest}>
      {children}
    </Tag>
  );
}
