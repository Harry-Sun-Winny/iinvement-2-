import "./styles.css";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import AppShell from "@/components/AppShell";
import { I18nProvider } from "@/components/providers/I18nProvider";

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
    <html
      lang="vi"
      suppressHydrationWarning
      className="dark font-sans"
    >
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('app-theme') || 'oled-black';
                document.body.classList.add('theme-' + theme);
                // Suppress annoying Next.js Webpack HMR WebSocket connection Event error overlays
                window.addEventListener('unhandledrejection', function(event) {
                  if (event && (event.reason === undefined || event.reason === null || event.reason instanceof Event || String(event.reason) === '[object Event]')) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('error', function(event) {
                  if (event && (event.error instanceof Event || String(event.error) === '[object Event]')) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
              })();
            `,
          }}
        />
        <QueryProvider>
          <TooltipProvider>
            <I18nProvider>
              <ThemeProvider>
                <AppShell>
                  {children}
                </AppShell>
              </ThemeProvider>
          </I18nProvider>
        </TooltipProvider>
      </QueryProvider>
    </body>
  </html>
);
}
