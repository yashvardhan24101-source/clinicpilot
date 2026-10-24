import { describe, it, expect, beforeEach } from "vitest";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { GET as getAppointmentsHandler, POST as createAppointmentHandler } from "@/app/api/appointments/route";
import { GET as getAppointmentIdHandler } from "@/app/api/appointments/[id]/route";
import { GET as getPatientsHandler, POST as createPatientHandler } from "@/app/api/patients/route";
import { GET as getPatientIdHandler } from "@/app/api/patients/[id]/route";
import { GET as getConversationsHandler } from "@/app/api/conversations/route";
import { GET as getReportsHandler } from "@/app/api/reports/route";
import { DELETE as deleteReportIdHandler } from "@/app/api/reports/[id]/route";
import { GET as getBillingPlansHandler } from "@/app/api/billing/plans/route";
import { GET as getQueueHandler } from "@/app/api/queue/route";
import { GET as getAdminMetricsHandler } from "@/app/api/admin/metrics/route";
import { GET as getDoctorsHandler } from "@/app/api/doctors/route";
import { GET as getServicesHandler } from "@/app/api/services/route";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

describe("Item 1: Defense-in-Depth Direct Route Handler Guards (Independent of Middleware)", () => {
  let ownerTokenClinicA: string;
  let receptionistTokenClinicA: string;
  let doctorTokenClinicA: string;
  let ownerTokenClinicB: string;

  beforeEach(async () => {
    process.env.SESSION_SECRET = "test-secret-at-least-32-chars-long-jwt-guard";

    ownerTokenClinicA = await signSessionToken({
      user_id: "usr-owner-1",
      name: "Dr. Owner A",
      email: "owner@clinic-a.in",
      role: "owner",
      clinic_id: "cln-1",
      clinic_name: "Clinic A",
    });

    receptionistTokenClinicA = await signSessionToken({
      user_id: "usr-rec-1",
      name: "Receptionist A",
      email: "reception@clinic-a.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "Clinic A",
    });

    doctorTokenClinicA = await signSessionToken({
      user_id: "usr-doc-1",
      name: "Dr. Doctor A",
      email: "doctor@clinic-a.in",
      role: "doctor",
      clinic_id: "cln-1",
      clinic_name: "Clinic A",
    });

    ownerTokenClinicB = await signSessionToken({
      user_id: "usr-owner-2",
      name: "Dr. Owner B",
      email: "owner@clinic-b.in",
      role: "owner",
      clinic_id: "cln-2",
      clinic_name: "Clinic B",
    });
  });

  describe("1. Unauthenticated Direct Route Handler Calls Return 401 Without Session Cookie", () => {
    it("GET /api/appointments returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/appointments");
      const res = await getAppointmentsHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("POST /api/appointments returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/appointments", {
        method: "POST",
        body: JSON.stringify({ patient_name: "Intruder" }),
      });
      const res = await createAppointmentHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/patients returns 401 when called with spoofed x-clinic-id headers and no cookie", async () => {
      const req = new Request("http://localhost:3000/api/patients", {
        headers: { "x-clinic-id": "cln-1", "x-user-role": "owner" },
      });
      const res = await getPatientsHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/reports returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/reports");
      const res = await getReportsHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/billing/plans returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/billing/plans");
      const res = await getBillingPlansHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/queue returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/queue");
      const res = await getQueueHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/doctors returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/doctors");
      const res = await getDoctorsHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/services returns 401 when called with no cookie", async () => {
      const req = new Request("http://localhost:3000/api/services");
      const res = await getServicesHandler(req);
      expect(res.status).toBe(401);
    });
  });

  describe("2. Role-Based Access Control Rejections Return 403 Forbidden", () => {
    it("POST /api/patients returns 403 when called by a doctor (doctors have read-only access)", async () => {
      const req = new Request("http://localhost:3000/api/patients", {
        method: "POST",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${doctorTokenClinicA}` },
        body: JSON.stringify({ name: "New Patient" }),
      });
      const res = await createPatientHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("DELETE /api/reports/[id] returns 403 when called by a receptionist (only owner can delete reports)", async () => {
      const req = new Request("http://localhost:3000/api/reports/rep-1", {
        method: "DELETE",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${receptionistTokenClinicA}` },
      });
      const res = await deleteReportIdHandler(req, { params: Promise.resolve({ id: "rep-1" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("GET /api/billing/plans returns 403 when called by a receptionist", async () => {
      const req = new Request("http://localhost:3000/api/billing/plans", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${receptionistTokenClinicA}` },
      });
      const res = await getBillingPlansHandler(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/conversations returns 403 when called by a doctor", async () => {
      const req = new Request("http://localhost:3000/api/conversations", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${doctorTokenClinicA}` },
      });
      const res = await getConversationsHandler(req);
      expect(res.status).toBe(403);
    });

    it("GET /api/admin/metrics returns 403 when called by clinic owner (super_admin ONLY)", async () => {
      const req = new Request("http://localhost:3000/api/admin/metrics", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerTokenClinicA}` },
      });
      const res = await getAdminMetricsHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("/admin page returns 403 when accessed by clinic owner (super_admin ONLY)", async () => {
      const req = new NextRequest("http://localhost:3000/admin", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerTokenClinicA}` },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });
  });

  describe("3. Cross-Clinic Tampering Rejections Return 404 (ID Guessing Blocked)", () => {
    it("GET /api/appointments/[id] returns 404 when Clinic B tries to read Clinic A's appointment", async () => {
      const req = new Request("http://localhost:3000/api/appointments/apt-1", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerTokenClinicB}` },
      });
      const res = await getAppointmentIdHandler(req, {
        params: Promise.resolve({ id: "apt-1" }),
      });
      expect(res.status).toBe(404);
    });

    it("GET /api/patients/[id] returns 404 when Clinic B tries to read Clinic A's patient", async () => {
      const req = new Request("http://localhost:3000/api/patients/pat-1", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${ownerTokenClinicB}` },
      });
      const res = await getPatientIdHandler(req, {
        params: Promise.resolve({ id: "pat-1" }),
      });
      expect(res.status).toBe(404);
    });
  });
});
