import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/otp/send/route";

describe("OTP Send API - Rate Limiting & DLT Compliance", () => {
  beforeEach(() => {
    // Reset global OTP and rate limit stores between tests
    if (global.__clinicpilot_otp_store__) {
      global.__clinicpilot_otp_store__.clear();
    }
    if (global.__clinicpilot_rate_limit_store__) {
      global.__clinicpilot_rate_limit_store__.clear();
    }
  });

  it("successfully generates OTP for valid Indian mobile number and includes DLT notice", async () => {
    const req = new Request("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9876543210" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.delivered_otp).toHaveLength(6);
    expect(data.dlt_notice).toContain("TRAI DLT registration");
  });

  it("enforces rate limit of maximum 3 requests within 10 minutes", async () => {
    const testPhone = "9988776655";

    // Request 1
    const res1 = await POST(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      })
    );
    expect(res1.status).toBe(200);

    // Request 2
    const res2 = await POST(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      })
    );
    expect(res2.status).toBe(200);

    // Request 3
    const res3 = await POST(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      })
    );
    expect(res3.status).toBe(200);

    // Request 4 should be blocked with 429 Too Many Requests
    const res4 = await POST(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      })
    );
    expect(res4.status).toBe(429);

    const errorData = await res4.json();
    expect(errorData.error).toContain("Rate limit exceeded");
  });

  it("rejects invalid Indian mobile numbers", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone: "12345" }),
      })
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Invalid Indian mobile number");
  });
});
