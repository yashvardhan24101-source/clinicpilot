"use client";

import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { initMocks } from "@/mocks/browser";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdateToast } from "@/components/pwa/update-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    // Service Worker: Register in production only; unregister stale dev workers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        window.addEventListener("load", () => {
          navigator.serviceWorker
            .register("/sw.js", { scope: "/" })
            .catch((err) => {
              console.warn("ServiceWorker registration failed:", err);
            });
        });
      } else {
        // Development mode: unregister any stale service worker
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
      <AuthProvider>
        {children}
        <InstallPrompt />
        <UpdateToast />
      </AuthProvider>
    </QueryClientProvider>
  );
}
