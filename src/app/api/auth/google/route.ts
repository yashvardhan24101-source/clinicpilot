import { NextResponse } from "next/server";
import { findStaffByEmail } from "@/lib/staff-store";
import {
  signSessionToken,
  buildSessionCookieHeader,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth-session";

export async function POST(request: Request) {
  try {
    // Only permit simulated Google sign-in when DEMO_MODE is explicitly enabled on server
    const isDemoMode = process.env.DEMO_MODE === "true";
    if (!isDemoMode) {
      return NextResponse.json(
        {
          error:
            "Google sign-in is disabled in production pending OAuth provider verification. Please sign in using clinic staff credentials.",
        },
        { status: 403 }
      );
    }

    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Google email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const staffUser = findStaffByEmail(normalizedEmail);

    if (!staffUser) {
      return NextResponse.json(
        {
          error:
            "No clinic account found for this Google email. Please sign in with registered clinic credentials.",
        },
        { status: 404 }
      );
    }

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
      success: true,
      user: sessionPayload,
      token,
      expires_at: expiresAt,
    });

    response.headers.set("Set-Cookie", buildSessionCookieHeader(token));

    return response;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
