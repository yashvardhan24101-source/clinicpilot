import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth-session";
import { isRouteAllowed, isApiAllowed } from "@/lib/roles";
import { getFeatureFlags } from "@/lib/flags";

const PROTECTED_PREFIXES = [
  "/today",
  "/calendar",
  "/appointments",
  "/inbox",
  "/patients",
  "/followups",
  "/reports",
  "/billing",
  "/more",
  "/doctor",
  "/admin",
];

// Open API endpoints that do not require an active staff session
// Rule A.2.3: Require a valid session on every /api/* route except login, logout, me, health, and webhooks
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/otp",
  "/api/health",
  "/api/webhooks",
];

function sanitizeNextUrl(next: string | null): string {
  if (!next) return "/today";
  // Strict relative path check to prevent open-redirect attacks
  if (next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return "/today";
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // PWA & Static Assets Bypass: Never require session for service worker, manifest, offline page, icons, or static chunks
  const PUBLIC_STATIC_PATHS = [
    "/sw.js",
    "/manifest.webmanifest",
    "/offline",
    "/favicon.ico",
  ];
  if (
    PUBLIC_STATIC_PATHS.includes(pathname) ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/static/")
  ) {
    return NextResponse.next();
  }

  // 0a. If user already has an active session and visits /login, redirect server-side to /today (or ?next=)
  if (pathname === "/login") {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (session) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const destination = sanitizeNextUrl(nextParam);
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // 0. Feature Flag Enforcement: Return 404 for disabled feature routes
  const flags = getFeatureFlags();
  if (pathname === "/patient" || pathname.startsWith("/patient/")) {
    if (!flags.patientPortal) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }
  if (pathname === "/doctor" || pathname.startsWith("/doctor/")) {
    if (!flags.doctorChamber) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }
  if (pathname === "/api/prescriptions" || pathname.startsWith("/api/prescriptions/")) {
    if (!flags.digitalRx) {
      return NextResponse.json(
        { error: "Feature Not Found: Digital Prescriptions are disabled" },
        { status: 404 }
      );
    }
  }
  if (pathname === "/api/doctors/search" || pathname.startsWith("/api/doctors/search/")) {
    if (!flags.publicDoctorSearch) {
      return NextResponse.json(
        { error: "Feature Not Found: Public Doctor Search is disabled" },
        { status: 404 }
      );
    }
  }

  // 1. CSRF Protection for mutating API requests (POST, PATCH, DELETE, PUT)
  if (pathname.startsWith("/api/")) {
    const method = request.method;
    if (["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");

      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return NextResponse.json(
              { error: "CSRF verification failed: Origin mismatch" },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "CSRF verification failed: Invalid origin" },
            { status: 403 }
          );
        }
      }
    }
  }

  // 2. Check if route is a protected staff route or protected API
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isProtectedApi =
    pathname.startsWith("/api/") &&
    !PUBLIC_API_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

  if (!isProtectedPath && !isProtectedApi) {
    return NextResponse.next();
  }

  // 3. Extract and verify session token from HttpOnly cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // 4. Handle unauthenticated requests
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      );
    }

    const nextPath = sanitizeNextUrl(pathname + search);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextPath);

    return NextResponse.redirect(loginUrl);
  }

  // 5. Role-Based Access Control (RBAC) Enforcement for Pages
  if (isProtectedPath) {
    const hasPermission = isRouteAllowed(session.role, pathname);
    if (!hasPermission) {
      const forbiddenUrl = new URL("/403", request.url);
      forbiddenUrl.searchParams.set("path", pathname);
      forbiddenUrl.searchParams.set("role", session.role);
      return NextResponse.rewrite(forbiddenUrl, { status: 403 });
    }
  }

  // 6. Role-Based Access Control (RBAC) Matrix Enforcement for API Routes
  if (isProtectedApi) {
    const apiPerm = isApiAllowed(session.role, pathname, request.method);
    if (!apiPerm.allowed) {
      return NextResponse.json(
        { error: apiPerm.reason || "Forbidden: Access denied for your role" },
        { status: 403 }
      );
    }
  }

  // Attach session info to request headers for downstream server components & handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user_id);
  requestHeaders.set("x-user-name", session.name);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-clinic-id", session.clinic_id);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/login",
    "/patient/:path*",
    "/today/:path*",
    "/calendar/:path*",
    "/appointments/:path*",
    "/inbox/:path*",
    "/patients/:path*",
    "/followups/:path*",
    "/reports/:path*",
    "/billing/:path*",
    "/more/:path*",
    "/doctor/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
