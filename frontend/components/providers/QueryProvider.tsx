"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60_000,
        gcTime: 30 * 60_000,
        retry: 2,
        retryDelay: attempt => Math.min(1_000 * 2 ** attempt, 8_000),
        // Financial screens already expose explicit refresh controls. Avoid a
        // full request burst whenever users alt-tab back to the application.
        refetchOnWindowFocus: false,
      },
      mutations: { retry: 1 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
