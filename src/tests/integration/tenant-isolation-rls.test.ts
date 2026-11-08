import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client, Pool } from "pg";
import {
  withClinicContext,
  withPatientContext,
  withSuperAdminContext,
} from "@/lib/db/tenant";
import { appointmentsRepo } from "@/lib/db/repositories/appointments-repo";
import { patientsRepo } from "@/lib/db/repositories/patients-repo";
import { clinicRepo } from "@/lib/db/repositories/clinic-repo";

const migrationsUrl = process.env.DATABASE_URL_MIGRATIONS;
const appUrl = process.env.DATABASE_URL;

const isDbAvailable = Boolean(migrationsUrl && appUrl);

if (process.env.CI && !isDbAvailable) {
  throw new Error("DATABASE_URL and DATABASE_URL_MIGRATIONS must be set in CI for integration tests");
}

describe.runIf(isDbAvailable)("M2: Multi-Tenant Row-Level Security & Context Isolation", () => {
  let adminClient: Client;
  let appPool: Pool;

  // Test entities
  let clinicAId: string;
  let clinicBId: string;
  let doctorAId: string;
  let patientAId: string;
  let appointmentAId: string;

  let patientAccountAId: string;
  let patientAccountBId: string;

  beforeAll(async () => {
    adminClient = new Client({ connectionString: migrationsUrl });
    await adminClient.connect();

    appPool = new Pool({ connectionString: appUrl });

    // Seed Clinic A
    const resA = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city)
       VALUES ('Clinic Alpha', 'clinic-alpha-iso', 'ISO1', 'Bengaluru')
       RETURNING id;`
    );
    clinicAId = resA.rows[0].id;

    // Seed Clinic B
    const resB = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city)
       VALUES ('Clinic Beta', 'clinic-beta-iso', 'ISO2', 'Hyderabad')
       RETURNING id;`
    );
    clinicBId = resB.rows[0].id;

    // Doctor in Clinic A
    const docRes = await adminClient.query(
      `INSERT INTO doctors (clinic_id, name, specialty)
       VALUES ($1, 'Dr. Alpha Specialist', 'Endodontics')
       RETURNING id;`,
      [clinicAId]
    );
    doctorAId = docRes.rows[0].id;

    // Patient in Clinic A
    const patRes = await adminClient.query(
      `INSERT INTO patients (clinic_id, name, phone)
       VALUES ($1, 'Alpha Patient', '+919876599901')
       RETURNING id;`,
      [clinicAId]
    );
    patientAId = patRes.rows[0].id;

    // Appointment in Clinic A
    const aptRes = await adminClient.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, '2026-12-01 10:00:00+05:30', '2026-12-01 10:30:00+05:30', 'booked')
       RETURNING id;`,
      [clinicAId, patientAId, doctorAId]
    );
    appointmentAId = aptRes.rows[0].id;

    // Patient Portal Account A linked to Patient A
    const accARes = await adminClient.query(
      `INSERT INTO patient_accounts (phone, name, email)
       VALUES ('+919876599901', 'Alpha Patient Portal', 'iso.alpha.patient@example.com')
       RETURNING id;`
    );
    patientAccountAId = accARes.rows[0].id;

    await adminClient.query(
      `INSERT INTO patient_account_links (account_id, clinic_id, patient_id, relationship)
       VALUES ($1, $2, $3, 'self');`,
      [patientAccountAId, clinicAId, patientAId]
    );

    // Patient Portal Account B (unlinked to Clinic A)
    const accBRes = await adminClient.query(
      `INSERT INTO patient_accounts (phone, name, email)
       VALUES ('+919876599902', 'Beta Patient Portal', 'iso.beta.patient@example.com')
       RETURNING id;`
    );
    patientAccountBId = accBRes.rows[0].id;
  });

  afterAll(async () => {
    await appPool?.end();
    await adminClient?.end();
  });

  it("1. Zero Context Check: app role querying tenant tables with no context returns 0 rows", async () => {
    const client = await appPool.connect();
    try {
      const res = await client.query("SELECT * FROM appointments;");
      expect(res.rows.length).toBe(0);

      const patRes = await client.query("SELECT * FROM patients;");
      expect(patRes.rows.length).toBe(0);

      const docRes = await client.query("SELECT * FROM doctors;");
      expect(docRes.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it("2. Tenant Isolation SELECT: Clinic A sees its appointments; Clinic B sees 0 rows", async () => {
    // Clinic A context
    const listA = await withClinicContext(clinicAId, async (client) => {
      return await appointmentsRepo.listAppointments(client, clinicAId);
    });
    expect(listA.length).toBeGreaterThanOrEqual(1);
    expect(listA.some((a) => a.id === appointmentAId)).toBe(true);

    // Clinic B context
    const listB = await withClinicContext(clinicBId, async (client) => {
      return await appointmentsRepo.listAppointments(client, clinicBId);
    });
    expect(listB.length).toBe(0);
  });

  it("3. ID-Guessing Resistance: Clinic B cannot SELECT Clinic A row by guessing appointment ID", async () => {
    const guessed = await withClinicContext(clinicBId, async (client) => {
      const res = await client.query(
        "SELECT * FROM appointments WHERE id = $1;",
        [appointmentAId]
      );
      return res.rows;
    });
    expect(guessed.length).toBe(0);
  });

  it("4. Tenant Isolation INSERT Violation: Clinic B cannot insert row with Clinic A's clinic_id", async () => {
    let insertErr: any = null;
    try {
      await withClinicContext(clinicBId, async (client) => {
        // Attempting to forge Clinic A's clinic_id while operating in Clinic B context
        await client.query(
          `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
           VALUES ($1, $2, $3, '2026-12-02 11:00:00+05:30', '2026-12-02 11:30:00+05:30', 'booked');`,
          [clinicAId, patientAId, doctorAId]
        );
      });
    } catch (err: any) {
      insertErr = err;
    }

    expect(insertErr).toBeDefined();
    // 42501 indicates PostgreSQL row-level security policy violation
    expect(insertErr.code).toBe("42501");
  });

  it("5. Tenant Isolation UPDATE Resistance: Clinic B cannot modify Clinic A rows or reassign clinic_id", async () => {
    const updatedRows = await withClinicContext(clinicBId, async (client) => {
      const res = await client.query(
        "UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING id;",
        [appointmentAId]
      );
      return res.rows;
    });
    expect(updatedRows.length).toBe(0);

    // Verify appointment in Clinic A remains 'booked'
    const checkRes = await adminClient.query(
      "SELECT status FROM appointments WHERE id = $1;",
      [appointmentAId]
    );
    expect(checkRes.rows[0].status).toBe("booked");
  });

  it("6. Tenant Isolation DELETE Resistance: Clinic B cannot delete Clinic A rows", async () => {
    const deletedCount = await withClinicContext(clinicBId, async (client) => {
      const res = await client.query(
        "DELETE FROM appointments WHERE id = $1;",
        [appointmentAId]
      );
      return res.rowCount;
    });
    expect(deletedCount).toBe(0);

    // Verify row still exists in database
    const verifyRes = await adminClient.query(
      "SELECT id FROM appointments WHERE id = $1;",
      [appointmentAId]
    );
    expect(verifyRes.rows.length).toBe(1);
  });

  it("7. Connection Pool Reuse Safety: context does not leak across reused connections", async () => {
    // Run Request 1 on Clinic A
    await withClinicContext(clinicAId, async (client) => {
      const res = await client.query("SELECT * FROM appointments;");
      expect(res.rows.length).toBeGreaterThanOrEqual(1);
    });

    // Run Request 2 immediately on the pool without setting context
    const client = await appPool.connect();
    try {
      const res = await client.query("SELECT * FROM appointments;");
      expect(res.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it("8. Super-Admin Guard: ordinary staff session cannot execute withSuperAdminContext", async () => {
    const ordinarySession = {
      userId: "usr-staff-1",
      role: "receptionist",
      email: "reception@clinic.in",
    };

    let forbiddenError: any = null;
    try {
      await withSuperAdminContext(
        ordinarySession,
        "cross_tenant_audit",
        { reason: "unauthorized_attempt" },
        async (client) => {
          return await clinicRepo.listAllClinics(client);
        }
      );
    } catch (err: any) {
      forbiddenError = err;
    }

    expect(forbiddenError).toBeDefined();
    expect(forbiddenError.message).toContain("UNAUTHORIZED: Only verified super_admin");
  });

  it("9. Super-Admin Audit & Cross-Tenant Access: audited execution succeeds and writes audit log", async () => {
    const superAdminSession = {
      userId: "usr-super-admin-0",
      role: "super_admin",
      email: "admin@platform.internal",
    };

    const clinics = await withSuperAdminContext(
      superAdminSession,
      "inspect_all_clinics",
      { reason: "system_verification" },
      async (client) => {
        return await clinicRepo.listAllClinics(client);
      }
    );

    expect(clinics.length).toBeGreaterThanOrEqual(2);
    expect(clinics.some((c) => c.id === clinicAId)).toBe(true);
    expect(clinics.some((c) => c.id === clinicBId)).toBe(true);

    // Verify audit entry exists in audit_log
    const auditRes = await adminClient.query(
      `SELECT * FROM audit_log 
       WHERE action = 'super_admin:inspect_all_clinics'
       ORDER BY created_at DESC LIMIT 1;`
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].actor_id).toBe("usr-super-admin-0");
  });

  it("10. Patient Context Isolation: Patient A sees linked appointment via view, Patient B sees zero", async () => {
    // Patient A context
    const appointmentsA = await withPatientContext(patientAccountAId, async (client) => {
      const res = await client.query(
        "SELECT * FROM patient_appointments_view;"
      );
      return res.rows;
    });
    expect(appointmentsA.length).toBeGreaterThanOrEqual(1);
    expect(appointmentsA[0].id).toBe(appointmentAId);

    // Patient B context (no links to Clinic A)
    const appointmentsB = await withPatientContext(patientAccountBId, async (client) => {
      const res = await client.query(
        "SELECT * FROM patient_appointments_view;"
      );
      return res.rows;
    });
    expect(appointmentsB.length).toBe(0);
  });
});
