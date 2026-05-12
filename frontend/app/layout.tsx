import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NavBar } from "@/components/NavBar";
import { AppToaster } from "@/components/ui/toaster";
import { ui } from "@/lib/ui";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Life OS MVP",
  description: "Unified productivity and life management system"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0B0D10] text-[#E5E5E5]`}>
        <div className={ui.pageClass}>
          <NavBar />
          <div
            className={`${ui.containerClass} pt-24 max-md:pb-[calc(3.75rem+env(safe-area-inset-bottom))] min-w-0`}
          >
            {children}
          </div>
          <MobileBottomNav />
          <AppToaster />
        </div>
      </body>
    </html>
  );
}
