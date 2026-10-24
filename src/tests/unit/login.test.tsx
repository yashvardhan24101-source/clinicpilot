import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LoginPage from "@/app/(auth)/login/page";
import * as authSession from "@/lib/auth-session";
import * as headers from "next/headers";
import * as navigation from "next/navigation";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

const mockPush = vi.fn();
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockLogin = vi.fn().mockResolvedValue({ id: "usr-reception-1", role: "receptionist", name: "Priya" });
const mockLoginWithGoogle = vi.fn().mockResolvedValue({ id: "usr-g-1", role: "receptionist", name: "Yashvardhan" });
const mockLoginWithOtp = vi.fn().mockResolvedValue({ id: "usr-otp-1", role: "receptionist", name: "Aarav Mehta" });

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithOtp: mockLoginWithOtp,
    isLoading: false,
    user: null,
  }),
}));

describe("Login Page - Clinic Staff Priority & Regulatory Compliance", () => {
  const originalEnv = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    window.history.pushState({}, "", "/login");
    // Default cookies to empty store (logged out)
    const emptyCookieStore = {
      get: vi.fn().mockReturnValue(undefined),
    };
    vi.spyOn(headers, "cookies").mockResolvedValue(emptyCookieStore as any);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = originalEnv;
  });

  it("renders production mode by default: staff login active, audience tabs & demo shortcuts hidden, medical disclaimer footer present", async () => {
    const pageJsx = await LoginPage();
    render(pageJsx);

    // In production v1 (flags off), audience tabs are hidden, staff login form is directly visible
    expect(screen.queryByText("I am a Patient")).not.toBeInTheDocument();
    expect(screen.getByText(/Clinic Staff & Doctor Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinic email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

    // Plain, verified claims
    expect(screen.getByText("Secure connection")).toBeInTheDocument();
    expect(screen.queryByText(/256-bit Encrypted/i)).not.toBeInTheDocument();

    // Regulatory medical disclaimer footer & legal links
    expect(
      screen.getByText("ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toBeInTheDocument();

    // In production mode, unverified Google and demo shortcuts are hidden
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Reception")).not.toBeInTheDocument();
  });

  it("proves ?demo=1 query parameter CANNOT bypass production mode (Rule A.2.6)", async () => {
    // Attempting query override in production mode
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    window.history.pushState({}, "", "/login?demo=1");
    const pageJsx = await LoginPage();
    render(pageJsx);

    // Must remain hidden
    expect(screen.queryByText("Reception")).not.toBeInTheDocument();
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1-Tap Demo Patient/i)).not.toBeInTheDocument();
  });

  it("allows staff to enter credentials and submit login form", async () => {
    const pageJsx = await LoginPage();
    render(pageJsx);

    fireEvent.change(screen.getByLabelText(/clinic email/i), {
      target: { value: "reception@smilecraft.in" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "demo123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in to dashboard/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "reception@smilecraft.in",
        password: "demo123",
      });
    });
  });

  it("switches to Patient Portal login when patientPortal feature flag is enabled", async () => {
    const originalPortalFlag = process.env.FEATURE_PATIENT_PORTAL;
    process.env.FEATURE_PATIENT_PORTAL = "true";

    const pageJsx = await LoginPage();
    render(pageJsx);

    const patientTab = screen.getByText("I am a Patient");
    expect(patientTab).toBeInTheDocument();
    fireEvent.click(patientTab);

    expect(screen.getByText("Patient Portal Login")).toBeInTheDocument();
    expect(screen.getByLabelText(/indian mobile number/i)).toBeInTheDocument();
    expect(screen.getByText(/Carrier SMS in India requires TRAI DLT registration/i)).toBeInTheDocument();

    process.env.FEATURE_PATIENT_PORTAL = originalPortalFlag;
  });

  it("redirects authenticated users with a valid session directly to /today (server-side page check)", async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ value: "valid-session-jwt-token" }),
    };
    vi.spyOn(headers, "cookies").mockResolvedValue(mockCookieStore as any);

    vi.spyOn(authSession, "verifySessionToken").mockResolvedValue({
      user_id: "usr-reception",
      name: "Priya",
      email: "reception@smilecraft.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await LoginPage();

    expect(mockRedirect).toHaveBeenCalledWith("/today");
  });

  it("redirects authenticated users with a valid session on /login to /today via middleware", async () => {
    vi.spyOn(authSession, "verifySessionToken").mockResolvedValue({
      user_id: "usr-reception",
      name: "Priya",
      email: "reception@smilecraft.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: "clinicpilot_session=valid-session-jwt-token",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/today");
  });

  it("redirects authenticated users with ?next=/inbox on /login to /inbox via middleware", async () => {
    vi.spyOn(authSession, "verifySessionToken").mockResolvedValue({
      user_id: "usr-reception",
      name: "Priya",
      email: "reception@smilecraft.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const request = new NextRequest("http://localhost:3000/login?next=/inbox", {
      headers: {
        cookie: "clinicpilot_session=valid-session-jwt-token",
      },
    });

    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/inbox");
  });
});
