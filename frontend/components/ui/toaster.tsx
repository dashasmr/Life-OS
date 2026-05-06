"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: "#11151A",
          border: "1px solid #2A2F36",
          color: "#E5E5E5"
        }
      }}
    />
  );
}

