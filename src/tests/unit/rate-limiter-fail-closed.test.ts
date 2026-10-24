import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  shouldFailClosed,
  checkLoginRateLimit,
  checkOtpSendRateLimit,
  checkOtpAttemptLimit,
} from "@/lib/rate-limiter";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as otpSendPost } from "@/app/api/auth/otp/send/route";
import { POST as otpVerifyPost } from "@/app/api/auth/otp/verify/route";

describe("Production Rate Limiter Fail-Closed Policy", () => {
  const originalEnv = { ...process.env };
  const setNodeEnv = (val: string) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = val;
  };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("shouldFailClosed returns true when NODE_ENV=production, DEMO_MODE=false, and no Redis/KV vars", () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";
    expect(shouldFailClosed()).toBe(true);
  });

  it("shouldFailClosed returns false when DEMO_MODE=true even in production", () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "true";
    expect(shouldFailClosed()).toBe(false);
  });

  it("shouldFailClosed returns false when Redis/KV credentials are provided", () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";
    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token123";
    expect(shouldFailClosed()).toBe(false);
  });

  it("checkLoginRateLimit fails closed with error when in unconfigured production", async () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";

    const result = await checkLoginRateLimit("admin@clinic.in:127.0.0.1");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Distributed rate limit store required in production");
  });

  it("checkOtpSendRateLimit fails closed with error when in unconfigured production", async () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";

    const result = await checkOtpSendRateLimit("9876543210");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Distributed rate limit store required in production");
  });

  it("checkOtpAttemptLimit fails closed with error when in unconfigured production", async () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";

    const result = await checkOtpAttemptLimit("9876543210");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("Distributed rate limit store required in production");
  });

  it("POST /api/auth/login returns 503 when fail-closed is active", async () => {
    setNodeEnv("production");
    process.env.DEMO_MODE = "false";
    process.env.SESSION_SECRET = "test-secret-at-least-32-chars-long-123456";

    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@clinic.in", password: "Password123" }),
    });

    const res = await loginPost(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Distributed rate limit store required in production");
  });
});
