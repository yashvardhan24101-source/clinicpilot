import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppHeader } from "@/components/layout/app-header";
import * as AuthContext from "@/lib/auth-context";

describe("Group G.2 - Header & Profile Real User Attributes (Rule G.2.1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders real name, clinic, initials and aria-label for User 1 (Doctor at Apex Healthcare)", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "usr-doc-1",
        user_id: "usr-doc-1",
        name: "Dr. Rajesh Varma",
        email: "rajesh@apexhealth.in",
        role: "doctor",
        clinic_id: "cln-apex-1",
        clinic_name: "Apex Healthcare",
      },
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithOtp: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    });

    render(<AppHeader />);

    // Clinic name must match authenticated user's clinic, not demo clinic
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Apex Healthcare");
    expect(screen.queryByText("SmileCraft Dental Clinic")).not.toBeInTheDocument();

    // Profile link must use user initials and role in aria-label and title
    const profileLink = screen.getByRole("link", {
      name: "DR - Profile for Dr. Rajesh Varma (doctor)",
    });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("title", "Dr. Rajesh Varma (doctor)");

    // Avatar fallback initials must match DR
    expect(screen.getByText("DR")).toBeInTheDocument();
    expect(screen.queryByText("PS")).not.toBeInTheDocument();
    expect(screen.queryByText("CP")).not.toBeInTheDocument();
  });

  it("renders real name, clinic, initials and aria-label for User 2 (Receptionist at City Care Clinic)", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "usr-rec-2",
        user_id: "usr-rec-2",
        name: "Sunita Devi",
        email: "sunita@citycare.in",
        role: "receptionist",
        clinic_id: "cln-city-2",
        clinic_name: "City Care Clinic",
      },
      isLoading: false,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithOtp: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    });

    render(<AppHeader />);

    // Clinic name must match authenticated user's clinic
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("City Care Clinic");
    expect(screen.queryByText("SmileCraft Dental Clinic")).not.toBeInTheDocument();

    // Profile link must use user initials and role in aria-label and title
    const profileLink = screen.getByRole("link", {
      name: "SD - Profile for Sunita Devi (receptionist)",
    });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("title", "Sunita Devi (receptionist)");

    // Avatar fallback initials must match SD
    expect(screen.getByText("SD")).toBeInTheDocument();
    expect(screen.queryByText("DR")).not.toBeInTheDocument();
    expect(screen.queryByText("PS")).not.toBeInTheDocument();
    expect(screen.queryByText("CP")).not.toBeInTheDocument();
  });
});
