import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { viewport } from "@/app/layout";

describe("Group F: Service Worker Caching & Viewport Configuration", () => {
  const swPath = path.resolve(__dirname, "../../app/sw.ts");

  it("verifies sw.ts enforces NetworkOnly on all /api/* routes", () => {
    const content = fs.readFileSync(swPath, "utf-8");

    // Must match all /api/ routes
    expect(content).toContain('url.pathname.startsWith("/api/")');
    // Must use NetworkOnly
    expect(content).toContain("new NetworkOnly()");

    // Must NOT have any StaleWhileRevalidate or CacheFirst for /api/
    expect(content).not.toMatch(/url\.pathname\s*===\s*["']\/api\/appointments["']/);
    expect(content).not.toMatch(/url\.pathname\s*===\s*["']\/api\/patients["']/);
    expect(content).not.toMatch(/url\.pathname\s*===\s*["']\/api\/doctors["']/);
    expect(content).not.toMatch(/url\.pathname\s*===\s*["']\/api\/services["']/);
  });

  it("verifies sw.ts caches static assets and /offline document only", () => {
    const content = fs.readFileSync(swPath, "utf-8");

    // Static assets cache
    expect(content).toContain("clinic-static-assets");
    expect(content).toContain("CacheFirst");

    // Offline fallback document
    expect(content).toContain('url: "/offline"');
  });

  it("verifies sw.ts listens for PURGE_ALL_CACHES message", () => {
    const content = fs.readFileSync(swPath, "utf-8");
    expect(content).toContain('event.data.type === "PURGE_ALL_CACHES"');
    expect(content).toContain("caches.delete");
  });

  it("verifies viewport configuration does NOT contain maximum-scale or user-scalable=no", () => {
    expect(viewport).toBeDefined();
    expect(viewport.width).toBe("device-width");
    expect(viewport.initialScale).toBe(1);

    // Strict PWA mobile accessibility check:
    // maximumScale must not be 1 and userScalable must not be false
    expect((viewport as any).maximumScale).toBeUndefined();
    expect((viewport as any).userScalable).toBeUndefined();
  });
});
