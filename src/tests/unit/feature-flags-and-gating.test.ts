import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { getFeatureFlags } from "@/lib/flags";
import { middleware } from "@/middleware";
import PatientPage from "@/app/patient/page";
import DoctorChamberPage from "@/app/(dashboard)/doctor/page";
import { GET as getPrescriptionsHandler, POST as createPrescriptionHandler } from "@/app/api/prescriptions/route";
import { GET as getDoctorSearchHandler } from "@/app/api/doctors/search/route";
import * as navigation from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/today",
}));

describe("Group D: Feature Flags & 404 Route Gating", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FEATURE_PATIENT_PORTAL;
    delete process.env.ENABLE_PATIENT_PORTAL;
    delete process.env.FEATURE_DOCTOR_CHAMBER;
    delete process.env.ENABLE_DOCTOR_CHAMBER;
    delete process.env.FEATURE_DIGITAL_RX;
    delete process.env.ENABLE_DIGITAL_RX;
    delete process.env.FEATURE_PUBLIC_DOCTOR_SEARCH;
    delete process.env.ENABLE_PUBLIC_DOCTOR_SEARCH;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. flags.ts defaults and server evaluation", () => {
    it("defaults all four feature flags to false when environment variables are not set", () => {
      const flags = getFeatureFlags();
      expect(flags.patientPortal).toBe(false);
      expect(flags.doctorChamber).toBe(false);
      expect(flags.digitalRx).toBe(false);
      expect(flags.publicDoctorSearch).toBe(false);
    });

    it("enables individual flags when FEATURE_* environment variables are set to true", () => {
      process.env.FEATURE_PATIENT_PORTAL = "true";
      process.env.FEATURE_DOCTOR_CHAMBER = "true";
      process.env.FEATURE_DIGITAL_RX = "true";
      process.env.FEATURE_PUBLIC_DOCTOR_SEARCH = "true";

      const flags = getFeatureFlags();
      expect(flags.patientPortal).toBe(true);
      expect(flags.doctorChamber).toBe(true);
      expect(flags.digitalRx).toBe(true);
      expect(flags.publicDoctorSearch).toBe(true);
    });
  });

  describe("2. Edge Middleware 404 Gating", () => {
    it("returns 404 for /patient when patientPortal flag is false", async () => {
      const req = new NextRequest("http://localhost:3000/patient");
      const res = await middleware(req);
      expect(res.status).toBe(404);
    });

    it("returns 404 for /doctor when doctorChamber flag is false", async () => {
      const req = new NextRequest("http://localhost:3000/doctor");
      const res = await middleware(req);
      expect(res.status).toBe(404);
    });

    it("returns 404 for /api/prescriptions when digitalRx flag is false", async () => {
      const req = new NextRequest("http://localhost:3000/api/prescriptions");
      const res = await middleware(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Digital Prescriptions are disabled");
    });

    it("returns 404 for /api/doctors/search when publicDoctorSearch flag is false", async () => {
      const req = new NextRequest("http://localhost:3000/api/doctors/search?q=ananya");
      const res = await middleware(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Public Doctor Search is disabled");
    });
  });

  describe("3. Server Component notFound() Defensive Gating", () => {
    it("calls notFound() when PatientPage is rendered and patientPortal flag is false", () => {
      PatientPage();
      expect(navigation.notFound).toHaveBeenCalled();
    });

    it("calls notFound() when DoctorChamberPage is rendered and doctorChamber flag is false", async () => {
      await DoctorChamberPage();
      expect(navigation.notFound).toHaveBeenCalled();
    });
  });

  describe("4. API Handler 404 Defensive Gating", () => {
    it("returns 404 for GET /api/prescriptions when digitalRx is off", async () => {
      const res = await getPrescriptionsHandler(
        new Request("http://localhost:3000/api/prescriptions")
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Digital Prescriptions are disabled");
    });

    it("returns 404 for POST /api/prescriptions when digitalRx is off", async () => {
      const res = await createPrescriptionHandler(
        new Request("http://localhost:3000/api/prescriptions", {
          method: "POST",
          body: JSON.stringify({ diagnosis: "Tooth Decay" }),
        })
      );
      expect(res.status).toBe(404);
    });

    it("returns 404 for GET /api/doctors/search when publicDoctorSearch is off", async () => {
      const res = await getDoctorSearchHandler(
        new Request("http://localhost:3000/api/doctors/search?city=Mumbai")
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Public Doctor Search is disabled");
    });
  });
});
