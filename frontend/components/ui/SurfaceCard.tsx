import type { ElementType } from "react";
import { Surface, type SurfaceProps } from "@/components/ui/Surface";

/** @deprecated Prefer `Surface` — kept for older imports (subset of variants). */
export type SurfaceCardVariant = "hero" | "primary" | "secondary";

export type SurfaceCardProps<T extends ElementType = "section"> = Omit<SurfaceProps<T>, "variant"> & {
  variant: SurfaceCardVariant;
};

export function SurfaceCard<T extends ElementType = "section">({ variant, ...rest }: SurfaceCardProps<T>) {
  return <Surface variant={variant} {...rest} />;
}
