import { cn } from "@/lib/utils";
import { formControlClassName } from "@/lib/form-control";
import { ds } from "@/styles/design-system";

/**
 * App-wide UI recipes — composed from the Life OS design system (`styles/tokens.css` + `ds`).
 */
export const ui = {
  pageClass: `${ds.surfaces.page} overflow-x-hidden`,
  /** Horizontal bounds aligned with `PageContainer` (alias of `ds.surfaces.pageShell`). */
  containerClass: ds.surfaces.pageShell,
  contentClass: ds.surfaces.content,
  panelClass: ds.card.panel,
  formCard: `mt-ds-4 ${ds.card.secondary} p-ds-5`,
  formGrid: "grid gap-ds-3 md:grid-cols-2",
  formLabel: ds.typography.uiLabel,
  pageHint: `mt-ds-3 max-w-[62ch] ${ds.typography.sectionLead}`,
  microHint: `mt-ds-3 block w-full max-w-full rounded-ds-input bg-lifeos-muted/50 px-ds-4 py-ds-3 shadow-inner ${ds.typography.sectionLead}`,
  emptyState: `rounded-ds-card bg-lifeos-muted/35 p-ds-5 text-lifeos-body text-lifeos-fg-muted shadow-inner`,
  inputClass: cn(formControlClassName(), "h-12 py-0"),
  mutedText: "text-lifeos-fg-muted",
  pill: `inline-flex h-9 items-center rounded-ds-pill bg-lifeos-muted/40 px-ds-4 text-lifeos-body leading-none text-lifeos-fg shadow-sm transition-[background-color,color,transform] duration-lifeos-normal ease-lifeos hover:bg-lifeos-hover hover:text-lifeos-fg active:scale-[0.98]`,
  pillActive: `inline-flex h-9 items-center rounded-ds-pill bg-lifeos-accent-soft px-ds-4 text-lifeos-body leading-none font-medium text-lifeos-accent shadow-sm transition-[background-color,transform] duration-lifeos-normal ease-lifeos hover:bg-lifeos-accent-soft/80 active:scale-[0.98]`,
  primaryButton: ds.button.primary,
  primaryButtonFeatured: ds.button.featured,
  secondaryButton: ds.button.secondary,
  card: ds.card.interactive,
  cardTitle: ds.typography.cardTitle,
  codeBlock: `mt-ds-2 overflow-auto rounded-ds-input bg-lifeos-page p-ds-3 text-lifeos-caption text-lifeos-fg`
};
