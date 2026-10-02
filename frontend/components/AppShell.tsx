"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AUTH_ROUTES = new Set(["/login", "/register", "/recover-data"]);
const AppSidebar = dynamic(() => import("@/components/AppSidebar"), { ssr: false });
const CanvasEffects = dynamic(() => import("@/components/CanvasEffects"), { ssr: false });
const AiChat = dynamic(() => import("@/app/components/AiChat"), { ssr: false });

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  return (
    <>
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300 pointer-events-none"
        style={{ backgroundImage: "var(--bg-image)" }}
        aria-hidden="true"
      />

      {isAuthRoute ? (
        <div className="relative flex min-h-[100dvh] w-screen overflow-hidden">
          {children}
        </div>
      ) : (
        <div className="flex min-h-[100dvh] w-screen overflow-hidden relative">
          <AppSidebar />
          <div className="ml-16 md:ml-64 flex-1 min-h-[100dvh] overflow-hidden relative flex">
            {children}
          </div>
        </div>
      )}

      {!isAuthRoute && (
        <>
          <CanvasEffects />
          <AiChat />
        </>
      )}
    </>
  );
}
