import "./styles.css";
import type { ReactNode } from "react";
import AiChat from "./components/AiChat";
import { TooltipProvider } from "@/components/ui/tooltip";
import QueryProvider from "@/components/providers/QueryProvider";
import CanvasEffects from "@/components/CanvasEffects";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import AppSidebar from "@/components/AppSidebar";

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
              })();
            `,
          }}
        />
        <QueryProvider>
          <TooltipProvider>
            <ThemeProvider>
              {/* Background Image Layer */}
              <div 
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300 pointer-events-none"
                style={{ backgroundImage: "var(--bg-image)" }}
                aria-hidden="true"
              />
              {/* Ambient Background Particles */}
              <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute w-full h-full">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="antigravity-particle"
                      style={{
                        left: `${(i * 7) % 100}%`,
                        animationDelay: `${i * -2.2}s`,
                        animationDuration: `${15 + (i % 3) * 5}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex h-screen w-screen overflow-hidden relative">
                <AppSidebar />
                <div className="ml-64 flex-1 h-full overflow-hidden relative flex">
                  {children}
                </div>
              </div>
              <CanvasEffects />
              <AiChat />
            </ThemeProvider>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
