import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-ds-button font-medium whitespace-nowrap select-none outline-none",
    "transition-[background-color,border-color,color,transform,box-shadow] duration-lifeos-normal ease-lifeos",
    "disabled:pointer-events-none disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100",
    "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-lifeos-accent text-lifeos-accent-foreground shadow-ds-sm hover:-translate-y-px hover:bg-lifeos-accent-hover active:translate-y-0 active:scale-[0.98]",
        secondary:
          "border border-transparent bg-lifeos-muted/40 text-lifeos-fg-secondary shadow-none hover:-translate-y-px hover:bg-lifeos-hover hover:text-lifeos-fg active:translate-y-0 active:scale-[0.98]",
        ghost:
          "border border-transparent bg-transparent text-lifeos-fg-muted hover:bg-lifeos-hover hover:text-lifeos-fg active:scale-[0.98]",
        danger:
          "border border-lifeos-danger-muted/45 bg-lifeos-danger-muted/15 text-lifeos-danger hover:-translate-y-px hover:bg-lifeos-danger-muted/25 active:translate-y-0 active:scale-[0.98]",
        success:
          "border border-lifeos-success-muted/50 bg-lifeos-success-muted/18 text-lifeos-success hover:-translate-y-px hover:bg-lifeos-success-muted/28 active:translate-y-0 active:scale-[0.98]"
      },
      size: {
        sm: "min-h-9 gap-1.5 px-3 text-xs font-medium",
        md: "min-h-11 gap-2 px-5 text-sm font-medium",
        lg: "min-h-12 gap-2 px-8 text-base font-semibold shadow-ds-md hover:shadow-ds-lg active:shadow-ds-sm"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
