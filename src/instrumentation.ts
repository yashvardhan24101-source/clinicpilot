export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Production startup security checks
    const { validateSessionSecret } = await import("@/lib/auth-session");
    validateSessionSecret(process.env.SESSION_SECRET);
  }
}
