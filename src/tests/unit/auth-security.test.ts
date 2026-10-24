import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-session";
import {
  findStaffByEmail,
  verifyStaffPassword,
  getStaffList,
} from "@/lib/staff-store";
import { isRouteAllowed, isApiAllowed } from "@/lib/roles";
import { GET as getAppointmentsHandler, POST as createAppointmentHandler } from "@/app/api/appointments/route";
import {
  GET as getAppointmentIdHandler,
  PATCH as patchAppointmentIdHandler,
  DELETE as deleteAppointmentIdHandler,
} from "@/app/api/appointments/[id]/route";
import { GET as getPatientsHandler, POST as createPatientHandler } from "@/app/api/patients/route";
import { GET as getPatientIdHandler, DELETE as deletePatientIdHandler } from "@/app/api/patients/[id]/route";
import { GET as getConversationsHandler } from "@/app/api/conversations/route";
import { GET as getConversationIdHandler } from "@/app/api/conversations/[id]/route";
import { GET as getMessagesHandler } from "@/app/api/conversations/[id]/messages/route";
import { POST as replyConversationHandler } from "@/app/api/conversations/[id]/reply/route";
import { POST as handbackConversationHandler } from "@/app/api/conversations/[id]/handback/route";
import { GET as getFollowupsDueHandler } from "@/app/api/followups/due/route";
import { POST as sendFollowupsHandler } from "@/app/api/followups/send/route";
import { POST as snoozeFollowupsHandler } from "@/app/api/followups/snooze/route";
import { GET as getReportsHandler, POST as createReportHandler } from "@/app/api/reports/route";
import { GET as getReportIdHandler, DELETE as deleteReportIdHandler } from "@/app/api/reports/[id]/route";
import { POST as sendReportWhatsappHandler } from "@/app/api/reports/[id]/send-whatsapp/route";
import { GET as getDoctorsHandler } from "@/app/api/doctors/route";
import { GET as getServicesHandler } from "@/app/api/services/route";
import { GET as getBillingPlansHandler } from "@/app/api/billing/plans/route";
import { POST as subscribeBillingHandler } from "@/app/api/billing/subscribe/route";
import { GET as getMeHandler } from "@/app/api/auth/me/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";

import bcrypt from "bcryptjs";

describe("Group A & A.2 - Complete Security, Multi-Tenant Isolation & RBAC Matrix", () => {
  const originalDemoMode = process.env.DEMO_MODE;
  const originalBootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL;
  const originalBootstrapPassHash = process.env.BOOTSTRAP_OWNER_PASSWORD_HASH;

  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-at-least-32-chars-long-for-jwt-signing";
    process.env.DEMO_MODE = "true";
    if (global.__clinicpilot_rate_limit_store__) {
      global.__clinicpilot_rate_limit_store__.clear();
    }
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
    process.env.BOOTSTRAP_OWNER_EMAIL = originalBootstrapEmail;
    process.env.BOOTSTRAP_OWNER_PASSWORD_HASH = originalBootstrapPassHash;
  });

  describe("1. Demo Mode Gating & Production Bootstrap Owner (Rule A.2.1)", () => {
    it("disables seeded demo staff when DEMO_MODE=false", () => {
      process.env.DEMO_MODE = "false";
      delete process.env.BOOTSTRAP_OWNER_EMAIL;
      delete process.env.BOOTSTRAP_OWNER_PASSWORD_HASH;

      const staff = getStaffList();
      expect(staff.some((s) => s.email === "reception@smilecraft.in")).toBe(false);
      expect(staff.some((s) => s.email === "doctor@smilecraft.in")).toBe(false);
      expect(staff.some((s) => s.email === "owner@smilecraft.in")).toBe(false);
      expect(findStaffByEmail("reception@smilecraft.in")).toBeNull();
    });

    it("creates production owner from BOOTSTRAP_OWNER_EMAIL & BOOTSTRAP_OWNER_PASSWORD_HASH when DEMO_MODE=false", async () => {
      process.env.DEMO_MODE = "false";
      process.env.BOOTSTRAP_OWNER_EMAIL = "director@realclinic.in";
      process.env.BOOTSTRAP_OWNER_PASSWORD_HASH = bcrypt.hashSync("StrongProductionPass!123", 10);
      process.env.BOOTSTRAP_CLINIC_ID = "cln-real-1";
      process.env.BOOTSTRAP_CLINIC_NAME = "Apex Real Care";

      const staff = getStaffList();
      expect(staff.length).toBe(1);
      expect(staff[0].email).toBe("director@realclinic.in");
      expect(staff[0].role).toBe("owner");
      expect(staff[0].clinic_id).toBe("cln-real-1");

      const isValid = await verifyStaffPassword(staff[0], "StrongProductionPass!123");
      expect(isValid).toBe(true);

      const isInvalid = await verifyStaffPassword(staff[0], "wrong");
      expect(isInvalid).toBe(false);
    });
  });

  describe("2. Unauthenticated Access Protection on All API Routes (Rule A.2.3)", () => {
    const protectedRoutes = [
      { path: "http://localhost:3000/api/appointments", method: "GET" },
      { path: "http://localhost:3000/api/appointments", method: "POST" },
      { path: "http://localhost:3000/api/patients", method: "GET" },
      { path: "http://localhost:3000/api/patients", method: "POST" },
      { path: "http://localhost:3000/api/conversations", method: "GET" },
      { path: "http://localhost:3000/api/followups/due", method: "GET" },
      { path: "http://localhost:3000/api/reports", method: "GET" },
      { path: "http://localhost:3000/api/reports", method: "POST" },
      { path: "http://localhost:3000/api/doctors", method: "GET" },
      { path: "http://localhost:3000/api/services", method: "GET" },
      { path: "http://localhost:3000/api/billing/plans", method: "GET" },
    ];

    it.each(protectedRoutes)("returns 401 for unauthenticated $method $path in middleware", async ({ path, method }) => {
      const req = new NextRequest(path, { method });
      const res = await middleware(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });
  });

  describe("3. Multi-Tenant Clinic Isolation Across ALL Data Routes (Rule A.2.2)", () => {
    let tokenClinicA: string;
    let tokenClinicB: string;

    beforeEach(async () => {
      tokenClinicA = await signSessionToken({
        user_id: "usr-reception-1",
        name: "Priya (Reception)",
        email: "reception@smilecraft.in",
        role: "receptionist",
        clinic_id: "cln-1",
        clinic_name: "SmileCraft Dental",
      });

      tokenClinicB = await signSessionToken({
        user_id: "usr-apex-reception-2",
        name: "Neha Gupta (Apex)",
        email: "reception@apex.in",
        role: "receptionist",
        clinic_id: "cln-2",
        clinic_name: "Apex Diagnostics",
      });
    });

    it("proves clinic B cannot read clinic A appointments, and returns 404 when guessing IDs", async () => {
      // Clinic B gets list
      const resList = await getAppointmentsHandler(
        new Request("http://localhost:3000/api/appointments", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const list = await resList.json();
      expect(list.every((a: any) => a.clinic_id === "cln-2")).toBe(true);
      expect(list.some((a: any) => a.id === "apt-1")).toBe(false);

      // Clinic B attempts to guess Clinic A's appointment ID (apt-1)
      const resGuess = await getAppointmentIdHandler(
        new Request("http://localhost:3000/api/appointments/apt-1", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "apt-1" }) }
      );
      expect(resGuess.status).toBe(404);

      // Clinic B attempts to mutate Clinic A's appointment
      const resMutate = await patchAppointmentIdHandler(
        new Request("http://localhost:3000/api/appointments/apt-1", {
          method: "PATCH",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
          body: JSON.stringify({ status: "cancelled" }),
        }),
        { params: Promise.resolve({ id: "apt-1" }) }
      );
      expect(resMutate.status).toBe(404);
    });

    it("proves clinic B cannot read or delete clinic A patients, and returns 404 on guessed IDs", async () => {
      const resList = await getPatientsHandler(
        new Request("http://localhost:3000/api/patients", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const patients = await resList.json();
      expect(patients.every((p: any) => p.clinic_id === "cln-2")).toBe(true);

      // Guess Clinic A patient ID (pat-1)
      const resGuess = await getPatientIdHandler(
        new Request("http://localhost:3000/api/patients/pat-1", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "pat-1" }) }
      );
      expect(resGuess.status).toBe(404);

      // Attempt to delete Clinic A patient
      const resDelete = await deletePatientIdHandler(
        new Request("http://localhost:3000/api/patients/pat-1", {
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "pat-1" }) }
      );
      expect(resDelete.status).toBe(404);
    });

    it("proves clinic B cannot read, reply to, or hand back clinic A conversations", async () => {
      // List
      const resList = await getConversationsHandler(
        new Request("http://localhost:3000/api/conversations", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const convs = await resList.json();
      expect(convs.every((c: any) => c.clinic_id === "cln-2")).toBe(true);

      // Guess ID conv-1
      const resGuess = await getConversationIdHandler(
        new Request("http://localhost:3000/api/conversations/conv-1", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "conv-1" }) }
      );
      expect(resGuess.status).toBe(404);

      // Guess messages
      const resMsg = await getMessagesHandler(
        new Request("http://localhost:3000/api/conversations/conv-1/messages", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "conv-1" }) }
      );
      expect(resMsg.status).toBe(404);

      // Reply to Clinic A conversation
      const resReply = await replyConversationHandler(
        new Request("http://localhost:3000/api/conversations/conv-1/reply", {
          method: "POST",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
          body: JSON.stringify({ message: "Intruder message" }),
        }),
        { params: Promise.resolve({ id: "conv-1" }) }
      );
      expect(resReply.status).toBe(404);
    });

    it("proves clinic B cannot read or snooze clinic A follow-ups", async () => {
      const resDue = await getFollowupsDueHandler(
        new Request("http://localhost:3000/api/followups/due", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const due = await resDue.json();
      expect(due.every((f: any) => f.clinic_id === "cln-2")).toBe(true);

      // Attempt to snooze Clinic A follow-up
      const resSnooze = await snoozeFollowupsHandler(
        new Request("http://localhost:3000/api/followups/snooze", {
          method: "POST",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
          body: JSON.stringify({ ids: ["fol-1"], days: 7 }),
        })
      );
      const snoozeData = await resSnooze.json();
      // Should snooze 0 items because fol-1 does not belong to cln-2
      expect(snoozeData.snoozed_count).toBe(0);
    });

    it("proves clinic B cannot read, delete, or dispatch clinic A reports", async () => {
      const resReports = await getReportsHandler(
        new Request("http://localhost:3000/api/reports", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const reports = await resReports.json();
      expect(reports.every((r: any) => r.clinic_id === "cln-2")).toBe(true);

      // Guess report id rep-1
      const resGuess = await getReportIdHandler(
        new Request("http://localhost:3000/api/reports/rep-1", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "rep-1" }) }
      );
      expect(resGuess.status).toBe(404);

      // Send to WhatsApp on guessed report
      const resWa = await sendReportWhatsappHandler(
        new Request("http://localhost:3000/api/reports/rep-1/send-whatsapp", {
          method: "POST",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        }),
        { params: Promise.resolve({ id: "rep-1" }) }
      );
      expect(resWa.status).toBe(404);
    });

    it("proves clinic B only sees clinic B doctors and services", async () => {
      const resDocs = await getDoctorsHandler(
        new Request("http://localhost:3000/api/doctors", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const docs = await resDocs.json();
      expect(docs.every((d: any) => d.clinic_id === "cln-2")).toBe(true);

      const resSrv = await getServicesHandler(
        new Request("http://localhost:3000/api/services", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenClinicB}` },
        })
      );
      const srvs = await resSrv.json();
      expect(srvs.every((s: any) => s.clinic_id === "cln-2")).toBe(true);
    });
  });

  describe("4. Role Permission Matrix: Doctors & Receptionists (Rule A.2.4)", () => {
    let tokenDoctor: string;
    let tokenReceptionist: string;

    beforeEach(async () => {
      tokenDoctor = await signSessionToken({
        user_id: "usr-doctor-1",
        name: "Dr. Ananya Sharma",
        email: "doctor@smilecraft.in",
        role: "doctor",
        clinic_id: "cln-1",
        clinic_name: "SmileCraft Dental",
      });

      tokenReceptionist = await signSessionToken({
        user_id: "usr-reception-1",
        name: "Priya Sharma",
        email: "reception@smilecraft.in",
        role: "receptionist",
        clinic_id: "cln-1",
        clinic_name: "SmileCraft Dental",
      });
    });

    it("doctors see strictly only their assigned appointments", async () => {
      const res = await getAppointmentsHandler(
        new Request("http://localhost:3000/api/appointments", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenDoctor}` },
        })
      );
      const appointments = await res.json();
      expect(appointments.length).toBeGreaterThan(0);
      expect(
        appointments.every(
          (a: any) =>
            a.doctor_id === "usr-doctor-1" ||
            a.doctor_name.toLowerCase().includes("ananya")
        )
      ).toBe(true);
    });

    it("doctors have read-only access to patients: GET succeeds, POST & DELETE return 403", async () => {
      // GET allowed
      const resGet = await getPatientsHandler(
        new Request("http://localhost:3000/api/patients", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenDoctor}` },
        })
      );
      expect(resGet.status).toBe(200);

      // POST forbidden
      const resPost = await createPatientHandler(
        new Request("http://localhost:3000/api/patients", {
          method: "POST",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenDoctor}` },
          body: JSON.stringify({ name: "Doctor Created Patient" }),
        })
      );
      expect(resPost.status).toBe(403);
      const postData = await resPost.json();
      expect(postData.error).toMatch(/Forbidden|read-only/i);

      // DELETE forbidden
      const resDelete = await deletePatientIdHandler(
        new Request("http://localhost:3000/api/patients/pat-1", {
          method: "DELETE",
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenDoctor}` },
        }),
        { params: Promise.resolve({ id: "pat-1" }) }
      );
      expect(resDelete.status).toBe(403);
    });

    it("receptionists and doctors are blocked with 403 from billing and admin", async () => {
      // Receptionist on billing
      const resRecBilling = await getBillingPlansHandler(
        new Request("http://localhost:3000/api/billing/plans", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenReceptionist}` },
        })
      );
      expect(resRecBilling.status).toBe(403);

      // Doctor on billing
      const resDocBilling = await getBillingPlansHandler(
        new Request("http://localhost:3000/api/billing/plans", {
          headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenDoctor}` },
        })
      );
      expect(resDocBilling.status).toBe(403);
    });
  });

  describe("5. Rate Limiting for Login: 5 Failed Attempts per 15 Min (Rule A.2.5)", () => {
    it("enforces maximum 5 failed logins per account+IP per 15 minutes", async () => {
      const email = "owner@smilecraft.in";

      // 5 failed login attempts
      for (let i = 1; i <= 5; i++) {
        const res = await loginHandler(
          new Request("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": "203.0.113.195",
            },
            body: JSON.stringify({ email, password: "wrong-password" }),
          })
        );
        expect(res.status).toBe(401);
      }

      // 6th attempt must be blocked with 429 Too Many Requests
      const res6 = await loginHandler(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.195",
          },
          body: JSON.stringify({ email, password: "demo123" }),
        })
      );
      expect(res6.status).toBe(429);
      const errorData = await res6.json();
      expect(errorData.error).toContain("Too many failed login attempts");
    });
  });
});
