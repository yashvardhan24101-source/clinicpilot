import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as sendOtpHandler } from "@/app/api/auth/otp/send/route";
import { POST as verifyOtpHandler } from "@/app/api/auth/otp/verify/route";

describe("OTP Send & Verify API - Rate Limiting & DLT Compliance (Rules A.2.5 & A.2.7)", () => {
  const originalDemo = process.env.DEMO_MODE;
  const originalFast2sms = process.env.FAST2SMS_API_KEY;

  beforeEach(() => {
    delete process.env.FAST2SMS_API_KEY;
    delete process.env.TWO_FACTOR_API_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    process.env.DEMO_MODE = "true";

    if (global.__clinicpilot_otp_store__) {
      global.__clinicpilot_otp_store__.clear();
    }
    if (global.__clinicpilot_rate_limit_store__) {
      global.__clinicpilot_rate_limit_store__.clear();
    }
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalDemo;
    if (originalFast2sms) process.env.FAST2SMS_API_KEY = originalFast2sms;
  });

  it("returns 503 not available in production (DEMO_MODE=false) when no telecom provider is configured", async () => {
    process.env.DEMO_MODE = "false";

    const res = await sendOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "9876543210" }),
      })
    );

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("not available in production");
  });

  it("successfully generates OTP in demo mode and includes delivered OTP", async () => {
    const req = new Request("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210" }),
    });

    const res = await sendOtpHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.delivered_otp).toHaveLength(6);
  });

  it("enforces rate limit of maximum 5 OTP codes per phone per hour (Rule A.2.5)", async () => {
    const testPhone = "9988776655";

    // 5 requests allowed
    for (let i = 1; i <= 5; i++) {
      const res = await sendOtpHandler(
        new Request("http://localhost:3000/api/auth/otp/send", {
          method: "POST",
          body: JSON.stringify({ phone: testPhone }),
        })
      );
      expect(res.status).toBe(200);
    }

    // 6th request within window must be blocked with 429
    const res6 = await sendOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      })
    );
    expect(res6.status).toBe(429);

    const errorData = await res6.json();
    expect(errorData.error).toContain("maximum 5 OTP codes per hour");
  });

  it("enforces maximum 3 attempts per OTP verification code (Rule A.2.5)", async () => {
    const phone = "9876543210";

    // Request an OTP code
    await sendOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone }),
      })
    );

    // Attempt 1: wrong code
    const res1 = await verifyOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp: "000000" }),
      })
    );
    expect(res1.status).toBe(400);

    // Attempt 2: wrong code
    const res2 = await verifyOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp: "000000" }),
      })
    );
    expect(res2.status).toBe(400);

    // Attempt 3: wrong code
    const res3 = await verifyOtpHandler(
      new Request("http://localhost:3000/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp: "000000" }),
      })
    );
    expect(res3.status).toBe(429);
    const data3 = await res3.json();
    expect(data3.error).toContain("Too many failed attempts");
  });
});
