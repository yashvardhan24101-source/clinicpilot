import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("Group F: Middleware Static & PWA Asset Bypass", () => {
  const publicPwaPaths = [
    "/sw.js",
    "/manifest.webmanifest",
    "/offline",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/_next/static/chunks/main-app.js",
    "/_next/static/css/app.css",
  ];

  it.each(publicPwaPaths)(
    "allows unauthenticated access to %s without redirecting to /login",
    async (path) => {
      const req = new NextRequest(new URL(path, "http://localhost:3000"));

      // Request without any session cookie
      const res = await middleware(req);

      // Verify the request is not redirected to /login and not rejected with 401
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
      const location = res.headers.get("location");
      expect(location).toBeNull();
    }
  );

  it("still strictly guards staff routes like /today when unauthenticated", async () => {
    const req = new NextRequest(new URL("/today", "http://localhost:3000"));
    const res = await middleware(req);

    // Protected route must redirect unauthenticated request to /login
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
  });
});
