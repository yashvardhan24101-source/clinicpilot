"use client";

import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { initMocks } from "@/mocks/browser";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    // Unregister Serwist service worker in development mode so it doesn't intercept or break dev CSS
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        let hadStaleSw = false;
        for (const reg of registrations) {
          const scriptUrl = reg.active?.scriptURL || "";
          if (scriptUrl.endsWith("/sw.js") || scriptUrl.includes("/sw.js?")) {
            reg.unregister();
            hadStaleSw = true;
          }
        }
        if (hadStaleSw && !sessionStorage.getItem("sw_reloaded_dev")) {
          sessionStorage.setItem("sw_reloaded_dev", "1");
          window.location.reload();
        }
      });
    }

    initMocks()
      .then(() => setMswReady(true))
      .catch((err) => {
        console.warn("MSW initialization warning:", err);
        setMswReady(true);
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
