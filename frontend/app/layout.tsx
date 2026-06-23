import "./styles.css";
import type { ReactNode } from "react";
import LazyAiChat from "./components/LazyAiChat";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "@/components/providers/QueryProvider";

export const metadata = {
  title: "Investment Portfolio",
  description:
    "Portfolio, watchlist, goals, news, and sourced risk analysis",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className="dark font-sans">
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
