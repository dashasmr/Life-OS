/**
 * Life OS Design System — semantic class recipes.
 * Color/shadow tokens: `styles/themes.css` (light/dark + aliases like `--surface-primary`, `--shadow-soft`).
 * Structural tokens: `styles/tokens.css`. Tailwind maps them in `tailwind.config.ts`.
 * Prefer `ui` from `@/lib/ui` or composing `ds.*` — avoid raw hex in components.
 */

/** Spacing: use `p-ds-{1–8}`, `m-ds-*`, `gap-ds-*`, `space-y-ds-*` (4–64px). */
export const spacingScalePx = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64
} as const;

/**
 * Typography roles — use these instead of ad-hoc text-xl / text-sm.
 * Hierarchy: pageTitle → sectionTitle → cardTitle → body / sectionLead → labels / metrics.
 * Prefer `<PageTitle>`, `<SectionTitle>`, etc. from `@/components/ui/typography` for consistent rhythm.
 */
export const typography = {
  /** Main document title (h1) — cinematic, confident; scales at md */
  pageTitle:
    "text-lifeos-hero font-semibold tracking-[-0.038em] leading-[1.05] text-lifeos-fg antialiased md:font-bold md:tracking-[-0.042em]",
  /** ~28px — major section titles (h2) */
  sectionTitle: "font-semibold tracking-[-0.022em] leading-snug text-lifeos-section text-lifeos-fg",
  /** 20px — card and panel titles (h3) */
  cardTitle: "font-semibold tracking-[-0.015em] leading-snug text-lifeos-card-title text-lifeos-fg",
  /** 16px — primary reading */
  body: "text-lifeos-body font-normal leading-[1.62] text-lifeos-fg",
  /** 14px — secondary emphasis (still readable) */
  bodySecondary: "text-lifeos-body-secondary font-normal leading-[1.62] text-lifeos-fg-secondary",
  /** 14px — de-emphasized body (prefer sectionLead for long descriptions) */
  bodyMuted: "text-lifeos-body-secondary font-normal leading-relaxed text-lifeos-fg-muted",
  /** Editorial / hero / section descriptions — softer than bodyMuted, still premium contrast */
  sectionLead: "text-lifeos-body-secondary font-normal leading-[1.72] text-lifeos-fg-secondary antialiased",
  /** 12px — captions, helper lines */
  caption: "text-lifeos-caption font-medium leading-snug text-lifeos-fg-muted",
  /** Section eyebrow — sentence case, not uppercase */
  sectionEyebrow: "text-lifeos-caption font-medium tracking-wide text-lifeos-accent",
  /** Rare: micro all-caps (dense tags only) */
  labelMicro: "font-semibold uppercase tracking-[0.06em] text-lifeos-label text-lifeos-fg-secondary",
  /** Form labels — tight rhythm, readable size (not caption-sized) */
  uiLabel: "text-lifeos-body-secondary font-medium leading-tight tracking-wide text-lifeos-fg-muted",
  /** KPI / stat value — clear separation from labels */
  metricValue:
    "font-semibold tabular-nums tracking-tight text-lifeos-card-title text-lifeos-fg leading-none md:text-lifeos-section",
  /** KPI label above or beside a metric */
  metricLabel: "text-lifeos-body-secondary font-medium leading-snug text-lifeos-fg-muted",
  /** Comfortable measure for descriptions */
  proseMax: "max-w-[60ch]",
  proseWideMax: "max-w-[65ch]"
} as const;

/** Card system — depth from shadow + surface fill, not outlines */
export const card = {
  /** Default elevated surface */
  primary:
    "rounded-ds-card bg-lifeos-card p-ds-6 shadow-ds-md transition-[background-color,box-shadow] duration-lifeos-normal ease-lifeos",
  /** Large dashboard panels — page chrome (slightly tighter than before) */
  panel:
    "rounded-ds-card bg-lifeos-card p-ds-6 shadow-surface-primary transition-[background-color,box-shadow] duration-lifeos-normal ease-lifeos md:p-ds-7",
  /** Lower emphasis — calmer, less lift than primary panels */
  secondary:
    "rounded-ds-card bg-lifeos-muted/25 p-ds-6 shadow-ds-sm transition-[background-color,box-shadow] duration-lifeos-normal ease-lifeos",
  /** Nested / quieter blocks on dashboards — blends into parent */
  dashboardInset:
    "rounded-ds-card bg-lifeos-inset/45 p-ds-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] md:p-ds-7",
  /** Primary dashboard panels — brighter surface */
  dashboardMain:
    "rounded-ds-card bg-lifeos-elevated p-ds-7 shadow-surface-secondary md:p-ds-8",
  /** Hover affordance (lists, dashboards) — subtle lift + brighter surface */
  interactive:
    "rounded-ds-card bg-lifeos-card p-ds-6 shadow-ds-sm transition-[background-color,box-shadow,transform] duration-lifeos-normal ease-lifeos hover:-translate-y-px hover:bg-lifeos-elevated hover:shadow-ds-md active:translate-y-0 active:scale-[0.995]"
} as const;

/** Button system — pair with `components/ui/button.tsx` (sm/md/lg) */
export const button = {
  /** Primary CTA — soft indigo only */
  primary:
    "inline-flex min-h-11 w-fit items-center justify-center rounded-ds-button border border-transparent bg-lifeos-accent px-ds-6 text-sm font-medium text-lifeos-accent-foreground shadow-ds-sm transition-[background-color,border-color,color,transform,box-shadow] duration-lifeos-normal ease-lifeos hover:-translate-y-px hover:bg-lifeos-accent-hover active:translate-y-0 active:scale-[0.98]",
  secondary:
    "inline-flex min-h-11 w-fit items-center justify-center rounded-ds-button border border-transparent bg-lifeos-muted/35 px-ds-5 text-sm font-medium text-lifeos-fg-secondary shadow-none transition-[background-color,color,transform,box-shadow] duration-lifeos-normal ease-lifeos hover:-translate-y-px hover:bg-lifeos-hover hover:text-lifeos-fg active:translate-y-0 active:scale-[0.98]",
  ghost:
    "inline-flex min-h-11 w-fit items-center justify-center rounded-ds-button px-ds-4 text-sm font-medium text-lifeos-fg-muted transition-[background-color,color,transform] duration-lifeos-normal ease-lifeos hover:bg-lifeos-hover hover:text-lifeos-fg active:scale-[0.98]",
  /** Large CTA — same indigo lane */
  featured:
    "inline-flex min-h-12 w-fit items-center justify-center rounded-ds-button border border-transparent bg-lifeos-accent px-ds-8 text-base font-semibold text-lifeos-accent-foreground shadow-ds-md transition-[background-color,border-color,color,transform,box-shadow] duration-lifeos-normal ease-lifeos hover:-translate-y-px hover:bg-lifeos-accent-hover hover:shadow-ds-md active:translate-y-0 active:scale-[0.98]"
} as const;

/** Status chips / banners — pair fg + bg + border utilities */
export const status = {
  risk: {
    fg: "text-lifeos-status-risk",
    bg: "bg-lifeos-status-risk-bg",
    border: "border-lifeos-status-risk-border",
    shell: "border border-lifeos-status-risk-border bg-lifeos-status-risk-bg text-lifeos-fg"
  },
  healthy: {
    fg: "text-lifeos-status-healthy",
    bg: "bg-lifeos-status-healthy-bg",
    border: "border-lifeos-status-healthy-border",
    shell: "border border-lifeos-status-healthy-border bg-lifeos-status-healthy-bg text-lifeos-fg"
  },
  focus: {
    fg: "text-lifeos-status-focus",
    bg: "bg-lifeos-status-focus-bg",
    border: "border-lifeos-status-focus-border",
    shell: "border border-lifeos-status-focus-border bg-lifeos-status-focus-bg text-lifeos-fg"
  },
  neutral: {
    fg: "text-lifeos-status-neutral",
    bg: "bg-lifeos-status-neutral-bg",
    border: "border-lifeos-status-neutral-border",
    shell: "border border-lifeos-status-neutral-border bg-lifeos-status-neutral-bg text-lifeos-fg"
  }
} as const;

/** Semantic colors for inline alerts (not layout cards) */
export const semantic = {
  success: "text-lifeos-success",
  successBg: "border-lifeos-success-muted/50 bg-lifeos-success-muted/20 text-lifeos-success",
  warning: "text-lifeos-warning",
  warningBg: "border-lifeos-warning-muted/50 bg-lifeos-warning-muted/15 text-lifeos-warning",
  danger: "text-lifeos-danger",
  dangerBg: "border-lifeos-danger-muted/50 bg-lifeos-danger-muted/20 text-lifeos-danger",
  accent: "text-lifeos-accent",
  /** Warm neutral — rare chips; prefer accent for emphasis */
  energy: "text-lifeos-energy"
} as const;

/** Domain-tinted surfaces — mental map (AI / money / risk); tint only, no hard frame */
export const domain = {
  ai: "bg-lifeos-domain-ai ring-1 ring-lifeos-domain-ai-border/20",
  finance: "bg-lifeos-domain-finance ring-1 ring-lifeos-domain-finance-border/18",
  risk: "bg-lifeos-domain-risk ring-1 ring-lifeos-domain-risk-border/22"
} as const;

export const surfaces = {
  page: "min-h-screen bg-lifeos-page text-lifeos-fg antialiased transition-[background-color,color] duration-lifeos-theme ease-out",
  /** Horizontal bounds aligned with `PageContainer` / app shell (max 1440px, responsive inline padding). */
  pageShell: "mx-auto w-full min-w-0 max-w-[1440px] px-4 sm:px-6 md:px-8",
  /** Vertical rhythm between major page sections — operational density */
  content: "w-full min-w-0 space-y-ds-5 md:space-y-ds-6",
  /** @deprecated Prefer `pageShell` — same as page shell for legacy imports. */
  container: "mx-auto w-full min-w-0 max-w-[1440px] px-4 sm:px-6 md:px-8",
  /** Standard content panel on page background — insights, dashboard inserts, settings-style blocks */
  contentPanel: "rounded-ds-card bg-lifeos-card p-5 shadow-surface-secondary md:p-6",
  contentPanelCompact: "rounded-ds-card bg-lifeos-card p-4 shadow-surface-secondary md:p-5",
  /** AI-tinted hero strip (daily insight, similar) */
  insightHero:
    "rounded-ds-card bg-gradient-to-br from-lifeos-domain-ai/70 via-lifeos-card/55 to-lifeos-page p-5 shadow-surface-secondary md:p-7",
  /** Muted inline well (hints, footnotes) — no outline */
  toneWell: "rounded-ds-card bg-lifeos-muted/40 px-4 py-3 shadow-inner md:px-5 md:py-3.5",
  /** Left-accent callout — soft lift + inset accent bar (no full stroke) */
  accentCallout:
    "rounded-ds-card bg-lifeos-muted/30 py-4 pl-5 pr-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_3px_0_0_0_rgba(91,108,255,0.34)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2),inset_3px_0_0_0_rgba(91,108,255,0.38)]",
  /** Multi-metric strip — one surface, columns for KPIs (finance, command center, streaks) */
  metricBand:
    "rounded-ds-card bg-lifeos-card p-ds-4 shadow-surface-secondary md:p-ds-5"
} as const;

export const ds = {
  spacingScalePx,
  typography,
  card,
  button,
  status,
  semantic,
  surfaces,
  domain
} as const;

/** Interaction timing — mirrors `--lifeos-motion-*` in `styles/tokens.css` */
export const motion = {
  fast: "duration-lifeos-fast ease-lifeos",
  normal: "duration-lifeos-normal ease-lifeos",
  slow: "duration-lifeos-slow ease-lifeos",
  theme: "duration-lifeos-theme ease-out"
} as const;

/** Dashboard overview layout shells */
export const dashboard = {
  /** Alias — prefer `ds.typography.sectionEyebrow` */
  eyebrow: "text-lifeos-caption font-medium tracking-wide text-lifeos-accent",
  sectionHead: `mt-ds-3 ${typography.sectionTitle}`,
  sectionDesc: `mt-ds-5 max-w-[62ch] ${typography.sectionLead}`,
  /** Small label above hero title — sentence case */
  heroEyebrow: "mb-ds-3 text-lifeos-caption font-medium tracking-wide text-lifeos-accent",
  /** Title + lead — extra vertical rhythm between logical groups */
  heroStack: "max-w-[62ch] space-y-ds-5 text-left",
  /** Hero title — cinematic page title scale */
  heroTitle: typography.pageTitle,
  /** Lead under hero — readable secondary, not faint caption gray */
  heroLead: `${typography.sectionLead} max-w-[60ch]`,
  /** Used inside `Surface` hero variant for bottom fade layer */
  heroFade: "dashboard-hero-fade pointer-events-none absolute inset-0"
} as const;
