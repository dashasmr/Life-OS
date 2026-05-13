import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PAGE_SHELL_CLASS } from "@/components/layout/constants";

export type PageContainerProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/**
 * Single page width + horizontal padding. Default max-width 1440px, inline padding 16–32px.
 */
export function PageContainer({ children, className, ...rest }: PageContainerProps) {
  return (
    <div className={cn(PAGE_SHELL_CLASS, className)} {...rest}>
      {children}
    </div>
  );
}
