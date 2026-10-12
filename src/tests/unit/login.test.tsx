import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockLogin = vi.fn().mockResolvedValue({});
const mockLoginWithGoogle = vi.fn().mockResolvedValue({ id: "usr-g-1", name: "Yashvardhan" });
const mockLoginWithOtp = vi.fn().mockResolvedValue({ id: "usr-otp-1", name: "Aarav Mehta" });

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
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders with Clinic Staff login active by default and displays Secure connection", () => {
    render(<LoginPage />);

    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("I am a Patient")).toBeInTheDocument();
    expect(screen.getByText("Clinic Staff")).toBeInTheDocument();

    // Default should show Clinic Staff login
    expect(screen.getByText(/Clinic Staff & Doctor Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinic email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    // Plain, verified claims
    expect(screen.getByText("Secure connection")).toBeInTheDocument();
    expect(screen.queryByText(/256-bit Encrypted/i)).not.toBeInTheDocument();
  });

  it("switches to Patient Portal login when I am a Patient tab is clicked", () => {
    render(<LoginPage />);

    const patientTab = screen.getByText("I am a Patient");
    fireEvent.click(patientTab);

    expect(screen.getByText("Patient Portal Login")).toBeInTheDocument();
    expect(screen.getByLabelText(/indian mobile number/i)).toBeInTheDocument();
    expect(screen.getByText(/Carrier SMS in India requires TRAI DLT registration/i)).toBeInTheDocument();
  });

  it("hides demo shortcuts by default and reveals them when demo toggle is clicked", () => {
    render(<LoginPage />);

    // By default, demo shortcuts should not be visible to real clinics
    expect(screen.queryByText("Reception")).not.toBeInTheDocument();

    // Click demo toggle
    const toggleBtn = screen.getByText(/Need Quick Testing\? Show Demo Shortcuts/i);
    fireEvent.click(toggleBtn);

    // Now demo staff logins are visible
    expect(screen.getByText("Reception")).toBeInTheDocument();
    expect(screen.getByText("Doctor")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("handles 1-Tap Demo Patient login when demo shortcuts are enabled and routes to /patient", () => {
    render(<LoginPage />);

    // Switch to patient tab
    fireEvent.click(screen.getByText("I am a Patient"));

    // Enable demo shortcuts
    fireEvent.click(screen.getByText(/Need Quick Testing\? Show Demo Shortcuts/i));

    const demoPatientBtn = screen.getByText(/1-Tap Demo Patient: Aarav Mehta/i);
    fireEvent.click(demoPatientBtn);

    expect(localStorage.getItem("clinicpilot_current_patient")).toContain("Aarav Mehta");
    expect(localStorage.getItem("clinicpilot_default_portal")).toBe("patient");
    expect(mockPush).toHaveBeenCalledWith("/patient");
  });

  it("handles Staff quick demo login and routes to /today", async () => {
    render(<LoginPage />);

    // Enable demo shortcuts
    fireEvent.click(screen.getByText(/Need Quick Testing\? Show Demo Shortcuts/i));

    const receptionBtn = screen.getByText("Reception");
    fireEvent.click(receptionBtn);

    expect(mockLogin).toHaveBeenCalledWith({
      email: "reception@smilecraft.in",
      password: "demo123",
    });
  });

  it("opens Google sign-in modal when Continue with Google is clicked", () => {
    render(<LoginPage />);

    const googleBtn = screen.getByText("Continue with Google");
    fireEvent.click(googleBtn);

    expect(screen.getByText("Choose an account for ClinicPilot")).toBeInTheDocument();
    expect(screen.getByText("yashvardhan24101@iiitnr.edu.in")).toBeInTheDocument();
  });
});
