export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // If SESSION_SECRET is not configured in environment (e.g. Vercel preview or first deploy),
    // generate an ephemeral cryptographically secure 256-bit random secret so the app boots
    // cleanly instead of crashing with a 500 Internal Server Error.
    if (!process.env.SESSION_SECRET) {
      const crypto = await import("crypto");
      process.env.SESSION_SECRET = crypto.randomBytes(32).toString("hex");
      console.warn(
        "[ClinicPilot Startup] NOTICE: SESSION_SECRET was not found in environment variables. Generated an ephemeral 256-bit secret for this runtime instance."
      );
    }

    // Production startup security checks
    const { validateSessionSecret } = await import("@/lib/auth-session");
    validateSessionSecret(process.env.SESSION_SECRET);
  }
}
