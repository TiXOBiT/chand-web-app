import "./globals.css";
import type { Metadata } from "next";
import * as React from "react";

export const metadata: Metadata = {
  title: "Real-time Currency & Gold Tracker",
  description: "Live prices + smart downsampled charts (mobile-friendly API).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
