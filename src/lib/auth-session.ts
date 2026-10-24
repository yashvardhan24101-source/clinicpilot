import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { UserRole } from "@/types/auth";

export const SESSION_COOKIE_NAME = "clinicpilot_session";
export const SESSION_DURATION_HOURS = 8;
export const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60;

export interface SessionTokenPayload {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic_id: string;
  clinic_name: string;
  [key: string]: unknown;
}

export const KNOWN_INSECURE_SECRETS = [
  "dev-clinicpilot-secret-32-chars-long-local-jwt",
  "change-me-to-a-secure-random-32-character-secret-minimum",
  "default-insecure-secret-placeholder",
  "secret",
  "password",
  "12345678901234567890123456789012",
  "placeholder-secret-change-in-production",
];

export function validateSessionSecret(
  secret?: string | null,
  options?: { isProduction?: boolean; isDemo?: boolean }
): string {
  const isProd = options?.isProduction ?? process.env.NODE_ENV === "production";
  const isDemo = options?.isDemo ?? (process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true");

  if (!secret) {
    if (isProd && !isDemo) {
      throw new Error(
        "FATAL: SESSION_SECRET environment variable is missing. ClinicPilot cannot start in production without a secure session secret."
      );
    }
    return "dev-clinicpilot-secret-32-chars-long-local-jwt";
  }

  if (isProd && !isDemo) {
    const trimmed = secret.trim();
    if (
      KNOWN_INSECURE_SECRETS.includes(trimmed) ||
      trimmed.toLowerCase().includes("dev-clinicpilot-secret") ||
      trimmed.toLowerCase().includes("placeholder")
    ) {
      throw new Error(
        "FATAL: SESSION_SECRET is set to an insecure known test/placeholder value. Production requires a strong, random 32+ character secret."
      );
    }

    if (trimmed.length < 32) {
      throw new Error(
        `FATAL: SESSION_SECRET is too short (${trimmed.length} characters). Production SESSION_SECRET must be at least 32 characters long.`
      );
    }
  }

  return secret;
}

async function getJwtSecretKey(): Promise<CryptoKey> {
  const secretString = validateSessionSecret(process.env.SESSION_SECRET);
  const rawKey = new TextEncoder().encode(secretString);

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a session JWT using HS256 (Edge and Node compatible via Web Crypto and jose).
 */
export async function signSessionToken(payload: SessionTokenPayload): Promise<string> {
  const secretKey = await getJwtSecretKey();

  return await new SignJWT({
    user_id: payload.user_id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    clinic_id: payload.clinic_id,
    clinic_name: payload.clinic_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secretKey);
}

/**
 * Verify and decode a session JWT.
 * Returns the payload if valid and unexpired; returns null if invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  if (!token) return null;

  try {
    const secretKey = await getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (!payload.user_id || !payload.role || !payload.clinic_id) {
      return null;
    }

    return {
      user_id: payload.user_id as string,
      name: (payload.name as string) || "Staff User",
      email: (payload.email as string) || "",
      role: payload.role as UserRole,
      clinic_id: payload.clinic_id as string,
      clinic_name: (payload.clinic_name as string) || "Clinic",
    };
  } catch {
    // Expired, altered, or malformed token
    return null;
  }
}

/**
 * Helper to parse a cookie string and verify session token.
 */
export async function getSessionFromCookieHeader(
  cookieHeader: string | null | undefined
): Promise<SessionTokenPayload | null> {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) return null;

  const token = sessionCookie.substring(SESSION_COOKIE_NAME.length + 1);
  return verifySessionToken(token);
}

/**
 * Helper to extract and verify session directly from a standard Request or NextRequest.
 */
export async function getSessionFromRequest(
  request: Request
): Promise<SessionTokenPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  return getSessionFromCookieHeader(cookieHeader);
}

/**
 * Format standard Set-Cookie string for session token.
 */
export function buildSessionCookieHeader(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${
    isProd ? "; Secure" : ""
  }`;
}

/**
 * Format Set-Cookie string to expire the session cookie.
 */
export function buildExpireSessionCookieHeader(): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${
    isProd ? "; Secure" : ""
  }`;
}
