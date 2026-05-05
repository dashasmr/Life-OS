import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ReactNode } from "react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "Life OS MVP",
  description: "Unified productivity and life management system"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
