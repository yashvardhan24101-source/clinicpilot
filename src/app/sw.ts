import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkOnly,
  StaleWhileRevalidate,
  CacheFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. STRICT: Never cache reports, uploads, or auth credentials
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/reports") ||
        url.pathname.startsWith("/api/auth"),
      handler: new NetworkOnly(),
    },

    // 2. Schedule & Appointments: Stale-While-Revalidate for offline read-only Today view
    {
      matcher: ({ url }) =>
        url.pathname === "/api/appointments" ||
        url.pathname === "/api/doctors" ||
        url.pathname === "/api/services",
      handler: new StaleWhileRevalidate({
        cacheName: "clinic-schedule-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 30, // 30 minutes
          }),
        ],
      }),
    },

    // 3. Patients Directory: Stale-While-Revalidate
    {
      matcher: ({ url }) => url.pathname === "/api/patients",
      handler: new StaleWhileRevalidate({
        cacheName: "clinic-patients-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60, // 1 hour
          }),
        ],
      }),
    },

    // 4. Static icons and images: Cache-First
    {
      matcher: ({ request, url }) =>
        request.destination === "image" || url.pathname.startsWith("/icons/"),
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

    // 5. Default Next.js cache strategy
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
