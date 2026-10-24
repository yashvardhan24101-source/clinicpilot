import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Group F.2: Automated API Route Security & Guard Audit", () => {
  const apiDir = path.resolve(__dirname, "../../app/api");

  // Explicit public allowlist per requirement
  const PUBLIC_ALLOWLIST_PATTERNS = [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/otp/send",
    "/api/auth/otp/verify",
    "/api/auth/google",
    "/api/health",
    "/api/webhooks",
    "/api/doctors/search",
  ];

  function getRouteFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getRouteFiles(fullPath));
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("enumerates every API route and verifies it is either explicitly public or guarded by requireSession / requireRole", () => {
    const routeFiles = getRouteFiles(apiDir);
    expect(routeFiles.length).toBeGreaterThan(15);

    const auditedRoutes: Array<{
      route: string;
      file: string;
      isPublic: boolean;
      guarded: boolean;
    }> = [];

    for (const filePath of routeFiles) {
      // Convert file path to route format, e.g. /api/appointments/[id]
      const relative = path.relative(path.resolve(__dirname, "../../app"), filePath);
      const normalized = "/" + relative.replace(/\\/g, "/").replace(/\/route\.(ts|js)$/, "");

      const content = fs.readFileSync(filePath, "utf-8");

      const isPublic = PUBLIC_ALLOWLIST_PATTERNS.some(
        (allowed) => normalized === allowed || normalized.startsWith(`${allowed}/`)
      );

      // Verify defense-in-depth guard
      const callsGuard =
        content.includes("requireSession(") || content.includes("requireRole(");

      // Verify flag gating for public endpoints that require feature flags
      if (normalized === "/api/doctors/search") {
        expect(content).toContain("flags.publicDoctorSearch");
      }

      auditedRoutes.push({
        route: normalized,
        file: filePath,
        isPublic,
        guarded: callsGuard,
      });

      // Must fail if route is NOT in public allowlist AND not guarded
      if (!isPublic) {
        expect(
          callsGuard,
          `Route ${normalized} (${filePath}) is neither in the public allowlist nor guarded by requireSession/requireRole`
        ).toBe(true);
      }
    }

    // Verify all routes were audited
    expect(auditedRoutes.length).toBe(routeFiles.length);
  });

  it("confirms the exact flag name used for api/doctors/search is FEATURE_PUBLIC_DOCTOR_SEARCH from flags.ts", () => {
    const flagsPath = path.resolve(__dirname, "../../lib/flags.ts");
    const flagsContent = fs.readFileSync(flagsPath, "utf-8");

    // Must be one of the four documented flags
    expect(flagsContent).toContain('FEATURE_PUBLIC_DOCTOR_SEARCH === "true"');
    expect(flagsContent).toContain("publicDoctorSearch: boolean;");

    const searchRoutePath = path.resolve(__dirname, "../../app/api/doctors/search/route.ts");
    const searchRouteContent = fs.readFileSync(searchRoutePath, "utf-8");
    expect(searchRouteContent).toContain("getFeatureFlags()");
    expect(searchRouteContent).toContain("flags.publicDoctorSearch");
  });
});
