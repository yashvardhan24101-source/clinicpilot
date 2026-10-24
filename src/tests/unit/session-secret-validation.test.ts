import { describe, it, expect } from "vitest";
import { validateSessionSecret, KNOWN_INSECURE_SECRETS } from "@/lib/auth-session";

describe("Production Startup Check: SESSION_SECRET Validation", () => {
  it("rejects missing SESSION_SECRET in production (DEMO_MODE=false)", () => {
    expect(() =>
      validateSessionSecret(undefined, { isProduction: true, isDemo: false })
    ).toThrow(/missing/i);

    expect(() =>
      validateSessionSecret("", { isProduction: true, isDemo: false })
    ).toThrow(/missing/i);
  });

  it("rejects SESSION_SECRET shorter than 32 characters in production", () => {
    const shortSecret = "short-secret-under-32-chars";
    expect(() =>
      validateSessionSecret(shortSecret, { isProduction: true, isDemo: false })
    ).toThrow(/too short/i);
  });

  it("rejects known test/placeholder secrets in production", () => {
    for (const placeholder of KNOWN_INSECURE_SECRETS) {
      expect(() =>
        validateSessionSecret(placeholder, { isProduction: true, isDemo: false })
      ).toThrow(/insecure known test\/placeholder value/i);
    }
  });

  it("rejects the CI test secret in production (DEMO_MODE=false)", () => {
    const ciSecret = "dev-clinicpilot-secret-32-chars-long-local-jwt";
    expect(() =>
      validateSessionSecret(ciSecret, { isProduction: true, isDemo: false })
    ).toThrow(/insecure known test\/placeholder value/i);
  });

  it("accepts a strong, random 32+ character secret in production", () => {
    const validSecret = "9a7f8b4e2c1d0e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f";
    const result = validateSessionSecret(validSecret, { isProduction: true, isDemo: false });
    expect(result).toBe(validSecret);
  });

  it("permits placeholder default in development/test/demo environments", () => {
    const result = validateSessionSecret(undefined, { isProduction: false, isDemo: true });
    expect(result).toBe("dev-clinicpilot-secret-32-chars-long-local-jwt");
  });
});
