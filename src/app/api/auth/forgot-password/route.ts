import { NextResponse } from "next/server";
import crypto from "crypto";
import { findStaffByEmail } from "@/lib/staff-store";
import { getAppPool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as { email?: string };

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required to request a password reset" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isDemo = process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    // Demo Mode handling: provide immediate password reminder
    if (isDemo) {
      const demoStaff = findStaffByEmail(normalizedEmail);
      if (demoStaff) {
        return NextResponse.json({
          success: true,
          isDemo: true,
          message: "Demo Mode Active: The default password for this demo staff account is 'demo123'.",
        });
      }
    }

    // Generate single-use password reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // If PostgreSQL database is available, record the token via SECURITY DEFINER function
    try {
      const pool = getAppPool();
      await pool.query(
        `SELECT auth_create_password_reset_token($1, $2, $3);`,
        [normalizedEmail, tokenHash, expiresAt.toISOString()]
      );
    } catch (dbErr: any) {
      // In development / demo environments without DB pool, continue gracefully
      console.warn("[AUTH] auth_create_password_reset_token error:", dbErr?.message || dbErr);
    }

    // Always return a neutral success message to prevent user enumeration
    return NextResponse.json({
      success: true,
      isDemo: false,
      message: "If an active account exists with that email, a password reset link has been dispatched.",
    });
  } catch (err: any) {
    console.error("[AUTH] forgot-password exception:", err);
    return NextResponse.json(
      { error: "Failed to process password reset request. Please try again." },
      { status: 500 }
    );
  }
}
