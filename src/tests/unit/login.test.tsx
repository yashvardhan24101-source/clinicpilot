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

describe("Login Page - Dual Role Authentication", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders role selector tabs for Patient and Clinic Staff", () => {
    render(<LoginPage />);

    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("I am a Patient")).toBeInTheDocument();
    expect(screen.getByText("Clinic Staff")).toBeInTheDocument();
    // Default should show Patient login
    expect(screen.getByText("Patient Portal Login")).toBeInTheDocument();
    expect(screen.getByLabelText(/indian mobile number/i)).toBeInTheDocument();
  });

  it("switches to Clinic Staff login when Clinic Staff tab is clicked", () => {
    render(<LoginPage />);

    const staffTab = screen.getByText("Clinic Staff");
    fireEvent.click(staffTab);

    expect(screen.getByText(/Clinic Staff & Doctor Login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinic email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText("Reception")).toBeInTheDocument();
    expect(screen.getByText("Doctor")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("handles 1-Tap Demo Patient login and routes to patient portal", () => {
    render(<LoginPage />);

    const demoPatientBtn = screen.getByText(/1-Tap Demo Patient: Aarav Mehta/i);
    fireEvent.click(demoPatientBtn);

    expect(localStorage.getItem("clinicpilot_current_patient")).toContain("Aarav Mehta");
    expect(localStorage.getItem("clinicpilot_default_portal")).toBe("patient");
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("handles Staff quick demo login and routes to /today", async () => {
    render(<LoginPage />);

    // Switch to staff tab
    fireEvent.click(screen.getByText("Clinic Staff"));

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
