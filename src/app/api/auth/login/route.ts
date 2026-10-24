import { NextResponse } from "next/server";
import { findStaffByEmail, verifyStaffPassword } from "@/lib/staff-store";
import {
  signSessionToken,
  buildSessionCookieHeader,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth-session";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from "@/lib/rate-limiter";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(request);
    const rateLimitId = `${normalizedEmail}:${clientIp}`;

    // Enforce 5 failed logins per account+IP per 15 min
    const rlCheck = await checkLoginRateLimit(rateLimitId);
    if (!rlCheck.allowed) {
      if (rlCheck.error) {
        return NextResponse.json(
          { error: rlCheck.error },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${Math.ceil(
            rlCheck.resetInSeconds / 60
          )} minutes.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rlCheck.resetInSeconds) },
        }
      );
    }

    const staffUser = findStaffByEmail(normalizedEmail);

    if (!staffUser) {
      await recordFailedLogin(rateLimitId);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyStaffPassword(staffUser, password);
    if (!isValidPassword) {
      await recordFailedLogin(rateLimitId);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Login successful: reset failed attempt counter
    await resetLoginRateLimit(rateLimitId);

    // Role and clinic are strictly derived from stored staff directory, never email strings
    const sessionPayload = {
      user_id: staffUser.id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
      clinic_id: staffUser.clinic_id,
      clinic_name: staffUser.clinic_name,
    };

    const token = await signSessionToken(sessionPayload);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    const response = NextResponse.json({
      user: sessionPayload,
      token,
      expires_at: expiresAt,
    });

    response.headers.set("Set-Cookie", buildSessionCookieHeader(token));

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
