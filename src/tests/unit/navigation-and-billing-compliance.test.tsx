import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import MoreClient from "@/app/(dashboard)/more/more-client";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "usr-1", name: "Dr. Vikram", role: "owner", clinic_name: "SmileCraft Dental" },
    logout: vi.fn(),
  }),
}));

describe("Group D: Staff Navigation & Billing Label Compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. DesktopSidebar", () => {
    it("hides Doctor Chamber link when doctorChamber feature flag is off (default)", () => {
      render(
        <DesktopSidebar
          flags={{
            patientPortal: false,
            doctorChamber: false,
            digitalRx: false,
            publicDoctorSearch: false,
          }}
        />
      );

      // Doctor Chamber must be hidden
      expect(screen.queryByText("Doctor Chamber")).toBeNull();

      // Patient Portal must NOT be present
      expect(screen.queryByText(/Patient Portal/i)).toBeNull();

      // Core workspace items present
      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("Appointments")).toBeInTheDocument();
      expect(screen.getByText("Inbox")).toBeInTheDocument();

      // Billing is labeled strictly as 'Billing'
      expect(screen.getByText("Billing")).toBeInTheDocument();
      expect(screen.queryByText(/Razorpay Billing/i)).toBeNull();
    });

    it("displays Doctor Chamber link when doctorChamber feature flag is enabled", () => {
      render(
        <DesktopSidebar
          flags={{
            patientPortal: false,
            doctorChamber: true,
            digitalRx: false,
            publicDoctorSearch: false,
          }}
        />
      );

      expect(screen.getByText("Doctor Chamber")).toBeInTheDocument();
    });
  });

  describe("2. More Page Operations", () => {
    it("hides Doctor Chamber and uses plain 'Billing' label when doctorChamber flag is off", () => {
      render(
        <MoreClient
          flags={{
            patientPortal: false,
            doctorChamber: false,
            digitalRx: false,
            publicDoctorSearch: false,
          }}
        />
      );

      // Doctor Chamber hidden
      expect(screen.queryByText("Doctor Chamber")).toBeNull();

      // Patient Portal absent
      expect(screen.queryByText(/Patient Portal/i)).toBeNull();

      // Plain Billing label used
      expect(screen.getByText("Billing")).toBeInTheDocument();
      expect(screen.queryByText(/Razorpay/i)).toBeNull();
    });

    it("displays Doctor Chamber under Clinic Operations when doctorChamber flag is true", () => {
      render(
        <MoreClient
          flags={{
            patientPortal: false,
            doctorChamber: true,
            digitalRx: false,
            publicDoctorSearch: false,
          }}
        />
      );

      expect(screen.getByText("Doctor Chamber")).toBeInTheDocument();
    });
  });

  describe("3. Keyboard Shortcuts Dialog", () => {
    it("uses plain 'Billing' label and does not contain Patient Portal shortcut", () => {
      render(<KeyboardShortcutsDialog />);

      const triggerBtn = screen.getByRole("button", { name: /keyboard shortcuts/i });
      fireEvent.click(triggerBtn);

      // Plain Billing label
      expect(screen.getByText("Billing")).toBeInTheDocument();
      expect(screen.queryByText(/Razorpay/i)).toBeNull();

      // Patient Portal absent
      expect(screen.queryByText(/Patient Portal/i)).toBeNull();
    });
  });
});
