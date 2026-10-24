import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RootHomePage from "@/app/page";
import * as authSession from "@/lib/auth-session";
import * as headers from "next/headers";
import * as navigation from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

describe("Group B: Issue 10 - Root '/' Staff Landing & Role Selection Bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Redirects logged-in users directly to /today", async () => {
    // Mock active session cookie
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ value: "valid-session-jwt-token" }),
    };
    vi.spyOn(headers, "cookies").mockResolvedValue(mockCookieStore as any);

    // Mock successful verification
    vi.spyOn(authSession, "verifySessionToken").mockResolvedValue({
      user_id: "usr-reception",
      name: "Priya",
      email: "reception@smilecraft.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await RootHomePage();

    expect(navigation.redirect).toHaveBeenCalledWith("/today");
  });

  it("2. Logged-out users see short staff landing with 'Sign in' button and WhatsApp note", async () => {
    // Mock empty cookies (logged out)
    const mockCookieStore = {
      get: vi.fn().mockReturnValue(undefined),
    };
    vi.spyOn(headers, "cookies").mockResolvedValue(mockCookieStore as any);

    const PageJsx = await RootHomePage();
    render(PageJsx);

    // 1. Sign in CTA must be present
    const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);

    // 2. Exact required line for patients
    expect(
      screen.getByText("Patient? Book through your clinic's WhatsApp.")
    ).toBeInTheDocument();

    // 3. Clear Signal Branding
    expect(screen.getByText("ClinicPilot")).toBeInTheDocument();
    expect(screen.getByText("Clinic front desk on autopilot.")).toBeInTheDocument();

    // 4. Verification: Absolutely NO role selection screen
    expect(screen.queryByText(/choose your role/i)).toBeNull();
    expect(screen.queryByText(/select your role/i)).toBeNull();
    expect(screen.queryByText(/i am a doctor/i)).toBeNull();
    expect(screen.queryByText(/i am a patient/i)).toBeNull();
  });
});
