import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkOnly,
  CacheFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    addEventListener: (type: string, listener: (event: any) => void) => void;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. STRICT: ALL /api/* routes are NetworkOnly. No API responses in CacheStorage.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },

    // 2. Static icons, images, and fonts: CacheFirst
    {
      matcher: ({ request, url }) =>
        request.destination === "image" ||
        request.destination === "font" ||
        url.pathname.startsWith("/icons/") ||
        url.pathname.startsWith("/images/"),
      handler: new CacheFirst({
        cacheName: "clinic-static-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          }),
        ],
      }),
    },

    // 3. Fallback to default cache (NetworkOnly fallback for unmatched)
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Listen for PURGE_ALL_CACHES message (triggered on logout, 401, or user change)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PURGE_ALL_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key))).then(() => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ purged: true });
          }
        })
      )
    );
  }
});
