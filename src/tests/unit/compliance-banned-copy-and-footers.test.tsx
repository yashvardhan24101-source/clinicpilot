import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RootHomePage from "@/app/page";
import LoginPage from "@/app/(auth)/login/page";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import fs from "fs";
import path from "path";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: () => undefined, // logged out
  }),
}));

// Mock auth-context for LoginPage rendering
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithOtp: vi.fn(),
    isLoading: false,
    user: null,
  }),
}));

describe("Group E: Compliance, Banned Copy Removal & Legal Footers", () => {
  describe("1. Static Code Scanner for Prohibited/Dishonest Marketing Claims", () => {
    it("proves '256-bit encrypted' claim is completely removed from all app and component source files", () => {
      const srcDir = path.resolve(__dirname, "../../..");
      const filesToScan: string[] = [];

      function walk(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "tests") {
              walk(fullPath);
            }
          } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !entry.name.includes(".test.")) {
            filesToScan.push(fullPath);
          }
        }
      }

      walk(path.join(srcDir, "src/app"));
      walk(path.join(srcDir, "src/components"));

      expect(filesToScan.length).toBeGreaterThan(10);

      const violations: { file: string; match: string }[] = [];
      for (const file of filesToScan) {
        const content = fs.readFileSync(file, "utf-8");
        if (/256-bit/i.test(content)) {
          violations.push({ file: path.basename(file), match: "256-bit" });
        }
        if (/verified doctors/i.test(content) || /top verified doctors/i.test(content)) {
          violations.push({ file: path.basename(file), match: "verified doctors" });
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe("2. Root Landing Page Footer & Medical Disclaimer", () => {
    it("renders required medical disclaimer and links to /terms and /privacy on root landing page", async () => {
      const pageJsx = await RootHomePage();
      render(pageJsx);

      // Mandatory disclaimer wording
      expect(
        screen.getByText(
          "ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice."
        )
      ).toBeInTheDocument();

      // Legal links
      expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
        "href",
        "/privacy"
      );
      expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
        "href",
        "/terms"
      );
    });
  });

  describe("3. Login Page Footer & Medical Disclaimer", () => {
    it("renders required medical disclaimer and links to /terms and /privacy on login page", async () => {
      const pageJsx = await LoginPage();
      render(pageJsx);

      // Mandatory disclaimer wording
      expect(
        screen.getByText(
          "ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice."
        )
      ).toBeInTheDocument();

      // Legal links
      expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
        "href",
        "/privacy"
      );
      expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
        "href",
        "/terms"
      );
    });
  });

  describe("4. Terms & Privacy Policy Pages", () => {
    it("renders Terms of Service page with medical disclaimer and back link", () => {
      render(<TermsPage />);

      expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument();
      expect(
        screen.getAllByText(/ClinicPilot helps clinics with scheduling and reminders\. It does not provide medical advice\./i)
          .length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
        "href",
        "/"
      );
    });

    it("renders Privacy Policy page with medical disclaimer and tenant isolation notice", () => {
      render(<PrivacyPage />);

      expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
      expect(
        screen.getAllByText(/ClinicPilot helps clinics with scheduling and reminders\. It does not provide medical advice\./i)
          .length
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/tenant isolation & encryption/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
        "href",
        "/"
      );
    });
  });
});
