"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      visibleToasts={4}
      toastOptions={{
        duration: 4200,
        style: {
          background: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          color: "var(--text-primary)",
          transition:
            "transform var(--lifeos-motion-slow, 260ms) var(--lifeos-motion-ease, cubic-bezier(0.25, 0.1, 0.25, 1)), opacity var(--lifeos-motion-slow, 260ms) ease"
        },
        classNames: {
          toast:
            "lifeos-toast !rounded-ds-input !shadow-ds-md data-[visible=true]:animate-in data-[visible=true]:fade-in data-[visible=true]:slide-in-from-right-4 data-[visible=true]:duration-300 data-[visible=false]:animate-out data-[visible=false]:fade-out data-[visible=false]:slide-out-to-right-4 data-[visible=false]:duration-200"
        }
      }}
    />
  );
}
