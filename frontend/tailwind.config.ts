import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./styles/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lifeos: {
          page: "var(--bg-primary)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          inset: "var(--bg-inset)",
          raised: "var(--bg-secondary)",
          hover: "var(--bg-hover)",
          muted: "var(--bg-muted)",
          fg: {
            DEFAULT: "var(--text-primary)",
            secondary: "var(--text-secondary)",
            muted: "var(--text-muted)"
          },
          border: {
            DEFAULT: "var(--border-strong)",
            subtle: "var(--border-subtle)"
          },
          accent: {
            DEFAULT: "var(--accent)",
            hover: "var(--accent-hover)",
            foreground: "var(--accent-foreground)",
            soft: "var(--accent-soft)",
            "soft-border": "var(--accent-soft-border)"
          },
          /** Legacy `lifeos-energy` — maps to warm neutral slate (see `themes.css`) */
          energy: {
            DEFAULT: "var(--semantic-energy)",
            hover: "var(--semantic-energy-hover)",
            foreground: "var(--semantic-energy-foreground)",
            muted: "var(--semantic-energy-muted)"
          },
          /** Доменные поверхности — storytelling */
          "domain-ai": "var(--surface-domain-ai)",
          "domain-ai-border": "var(--surface-domain-ai-border)",
          "domain-finance": "var(--surface-domain-finance)",
          "domain-finance-border": "var(--surface-domain-finance-border)",
          "domain-risk": "var(--surface-domain-risk)",
          "domain-risk-border": "var(--surface-domain-risk-border)",
          success: "var(--success)",
          "success-muted": "var(--success-muted)",
          warning: "var(--warning)",
          "warning-muted": "var(--warning-muted)",
          danger: "var(--danger)",
          "danger-muted": "var(--danger-muted)",
          nav: {
            text: "var(--nav-text)",
            overlay: "var(--nav-overlay)"
          },
          status: {
            risk: "var(--status-risk)",
            "risk-bg": "var(--status-risk-bg)",
            "risk-border": "var(--status-risk-border)",
            healthy: "var(--status-healthy)",
            "healthy-bg": "var(--status-healthy-bg)",
            "healthy-border": "var(--status-healthy-border)",
            focus: "var(--status-focus)",
            "focus-bg": "var(--status-focus-bg)",
            "focus-border": "var(--status-focus-border)",
            neutral: "var(--status-neutral)",
            "neutral-bg": "var(--status-neutral-bg)",
            "neutral-border": "var(--status-neutral-border)"
          }
        }
      },
      spacing: {
        "ds-1": "var(--lifeos-space-1)",
        "ds-2": "var(--lifeos-space-2)",
        "ds-3": "var(--lifeos-space-3)",
        "ds-4": "var(--lifeos-space-4)",
        "ds-5": "var(--lifeos-space-5)",
        "ds-6": "var(--lifeos-space-6)",
        "ds-7": "var(--lifeos-space-7)",
        "ds-8": "var(--lifeos-space-8)"
      },
      borderRadius: {
        "ds-card": "var(--lifeos-radius-card)",
        "ds-button": "var(--lifeos-radius-button)",
        "ds-pill": "var(--lifeos-radius-pill)",
        "ds-input": "var(--lifeos-radius-input)"
      },
      boxShadow: {
        "ds-xs": "var(--lifeos-shadow-xs)",
        "ds-sm": "var(--lifeos-shadow-sm)",
        "ds-md": "var(--lifeos-shadow-md)",
        "ds-lg": "var(--lifeos-shadow-lg)",
        "surface-hero": "var(--lifeos-shadow-surface-hero)",
        "surface-primary": "var(--lifeos-shadow-surface-primary)",
        "surface-secondary": "var(--lifeos-shadow-surface-secondary)"
      },
      fontSize: {
        /** Hero / display — 48px, tight line height */
        "lifeos-display": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "lifeos-hero": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        /** Section headings — ~28px */
        "lifeos-section": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        /** Card / panel titles — 20px */
        "lifeos-card-title": ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.015em" }],
        /** Primary reading — 16px */
        "lifeos-body": ["1rem", { lineHeight: "1.55" }],
        /** Secondary body — 14px */
        "lifeos-body-secondary": ["0.875rem", { lineHeight: "1.55" }],
        /** Captions & compact UI — 12px */
        "lifeos-caption": ["0.75rem", { lineHeight: "1.45", letterSpacing: "0.02em" }],
        /** Micro all-caps only when unavoidable */
        "lifeos-label": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.06em" }]
      },
      ringColor: {
        focus: "var(--focus-ring)"
      },
      ringOffsetColor: {
        DEFAULT: "var(--bg-primary)",
        page: "var(--bg-primary)"
      },
      transitionDuration: {
        "lifeos-fast": "var(--lifeos-motion-fast)",
        "lifeos-normal": "var(--lifeos-motion-normal)",
        "lifeos-slow": "var(--lifeos-motion-slow)",
        "lifeos-theme": "var(--lifeos-motion-theme)"
      },
      transitionTimingFunction: {
        lifeos: "var(--lifeos-motion-ease)"
      },
      keyframes: {
        "lifeos-soft-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "lifeos-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "lifeos-soft-in": "lifeos-soft-in 0.55s var(--lifeos-motion-ease) forwards",
        "lifeos-shimmer": "lifeos-shimmer 1.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
