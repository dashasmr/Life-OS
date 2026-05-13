import * as React from "react";
import { cn } from "@/lib/utils";
import { formControlClassName } from "@/lib/form-control";

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  invalid?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", invalid, disabled, "aria-invalid": ariaInvalid, ...props },
  ref
) {
  const isInvalid = Boolean(invalid) || ariaInvalid === true || ariaInvalid === "true";
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      data-slot="input"
      aria-invalid={isInvalid || undefined}
      className={cn(
        formControlClassName(isInvalid ? "invalid" : "default"),
        "h-12 py-0 file:mr-ds-3 file:h-8 file:rounded-md file:border-0 file:bg-lifeos-elevated file:px-ds-3 file:text-sm file:font-medium file:text-lifeos-fg",
        className
      )}
      {...props}
    />
  );
});

export { Input };
