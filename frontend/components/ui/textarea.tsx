import * as React from "react";
import { cn } from "@/lib/utils";
import { formControlClassName } from "@/lib/form-control";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  invalid?: boolean;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, disabled, "aria-invalid": ariaInvalid, rows = 4, ...props },
  ref
) {
  const isInvalid = Boolean(invalid) || ariaInvalid === true || ariaInvalid === "true";
  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      data-slot="textarea"
      aria-invalid={isInvalid || undefined}
      className={cn(
        formControlClassName(isInvalid ? "invalid" : "default"),
        "field-sizing-content min-h-[5.5rem] resize-y py-ds-3 leading-relaxed",
        className
      )}
      {...props}
    />
  );
});

export { Textarea };
