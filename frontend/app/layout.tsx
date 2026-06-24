import "./styles.css";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import LazyAiChat from "./components/LazyAiChat";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Investment Portfolio",
  description:
    "Portfolio, watchlist, goals, news, and sourced risk analysis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className="dark font-sans bg-slate-950">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <QueryProvider>
          <TooltipProvider>
            {children}
            <LazyAiChat />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
