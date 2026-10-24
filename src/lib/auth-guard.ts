import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  SessionTokenPayload,
  getSessionFromRequest,
} from "@/lib/auth-session";
import { UserRole } from "@/types/auth";
import { redirect } from "next/navigation";

export type ApiAuthResult =
  | { session: SessionTokenPayload; errorResponse: null }
  | { session: null; errorResponse: NextResponse };

/**
 * Defense-in-depth session guard for Next.js API Route Handlers.
 * Extracts and cryptographically verifies session token directly from the Request
 * cookie header or Next.js cookies(), independent of any Edge middleware.
 */
export async function requireSession(request?: Request): Promise<ApiAuthResult> {
  let session: SessionTokenPayload | null = null;

  if (request) {
    session = await getSessionFromRequest(request);
  }

  if (!session) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (token) {
        session = await verifySessionToken(token);
      }
    } catch {
      // Outside Request / Server Component execution context (e.g. testing)
    }
  }

  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      ),
    };
  }

  return { session, errorResponse: null };
}

/**
 * Defense-in-depth role guard for Next.js API Route Handlers.
 * Verifies session exists, then validates that session.role is permitted.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  request?: Request
): Promise<ApiAuthResult> {
  const auth = await requireSession(request);
  if (auth.errorResponse) {
    return auth;
  }

  if (!allowedRoles.includes(auth.session.role)) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        { error: `Forbidden: Access restricted to roles: ${allowedRoles.join(", ")}` },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Defense-in-depth session guard for Server-Rendered Staff Pages.
 * Directly reads and verifies the session cookie, redirecting unauthenticated
 * or unauthorized visitors independent of Edge middleware.
 */
export async function requirePageSession(
  allowedRoles?: UserRole[]
): Promise<SessionTokenPayload> {
  let session: SessionTokenPayload | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      session = await verifySessionToken(token);
    }
  } catch {
    // In unit test or mocked environment
  }

  if (!session) {
    redirect("/login");
    return null as any;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect("/403");
    return null as any;
  }

  return session;
}
