// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client, Pool } from "pg";
import {
  withClinicContext,
  withPatientContext,
  withSuperAdminContext,
} from "@/lib/db/tenant";
import { appointmentsRepo } from "@/lib/db/repositories/appointments-repo";
import { clinicRepo } from "@/lib/db/repositories/clinic-repo";

const migrationsUrl = process.env.DATABASE_URL_MIGRATIONS;
const appUrl = process.env.DATABASE_URL;

if (!migrationsUrl || !appUrl) {
  throw new Error("DATABASE_URL and DATABASE_URL_MIGRATIONS must be set for integration tests");
}

describe("M2: Multi-Tenant Row-Level Security & Context Isolation", () => {
  let adminClient: Client;
  let appPool: Pool;

  // Test entities
  let clinicAId: string;
  let clinicBId: string;
  let doctorAId: string;
  let patientAId: string;
  let appointmentAId: string;
  let reportAId: string;

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

    // Appointment in Clinic A (with confidential internal notes)
    const aptRes = await adminClient.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status, notes)
       VALUES ($1, $2, $3, '2026-12-01 10:00:00+05:30', '2026-12-01 10:30:00+05:30', 'booked', 'CONFIDENTIAL_STAFF_NOTE_REFERRED_ROOT_CANAL')
       RETURNING id;`,
      [clinicAId, patientAId, doctorAId]
    );
    appointmentAId = aptRes.rows[0].id;

    // Report in Clinic A (with confidential storage path)
    const repRes = await adminClient.query(
      `INSERT INTO reports (clinic_id, patient_id, title, category, file_name, file_size_bytes, storage_path)
       VALUES ($1, $2, 'Blood Test Comprehensive', 'blood_test', 'alpha_blood_test.pdf', 1048576, '/internal/s3/secure-vault/alpha_blood_test.pdf')
       RETURNING id;`,
      [clinicAId, patientAId]
    );
    reportAId = repRes.rows[0].id;

    // Patient Portal Account A linked to Patient A
    const accARes = await adminClient.query(
      `INSERT INTO patient_accounts (phone, name, email)
       VALUES ('+919876599901', 'Alpha Patient Portal', 'iso.alpha.patient@example.com')
       RETURNING id;`
    );
    patientAccountAId = accARes.rows[0].id;

    await adminClient.query(
      `INSERT INTO patient_account_links (account_id, clinic_id, patient_id, verified_via)
       VALUES ($1, $2, $3, 'staff_code');`,
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

  it("9. Super-Admin Audit & Cross-Tenant Access: audited execution succeeds and writes audit log with clinic_id IS NULL", async () => {
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

    // Verify audit entry exists in audit_log with clinic_id IS NULL
    const auditRes = await adminClient.query(
      `SELECT * FROM audit_log 
       WHERE action = 'super_admin:inspect_all_clinics'
       ORDER BY created_at DESC LIMIT 1;`
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].actor_id).toBe("usr-super-admin-0");
    expect(auditRes.rows[0].clinic_id).toBeNull();
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

  it("11. Context Mutual Exclusivity: transaction setting both app.clinic_id and app.patient_account_id is strictly rejected", async () => {
    const client = await appPool.connect();
    let mutualExError: any = null;
    try {
      await client.query("BEGIN;");
      await client.query("SELECT set_config('app.clinic_id', $1, true);", [clinicAId]);
      await client.query("SELECT set_config('app.patient_account_id', $1, true);", [patientAccountAId]);
      // Assertion function detects dual context and raises exception
      await client.query("SELECT assert_mutually_exclusive_context();");
      await client.query("COMMIT;");
    } catch (err: any) {
      mutualExError = err;
      await client.query("ROLLBACK;");
    } finally {
      client.release();
    }

    expect(mutualExError).toBeDefined();
    expect(mutualExError.message).toContain("MUTUALLY_EXCLUSIVE_CONTEXT");
  });

  it("12. audit_log RLS: NULL clinic_id rows are visible to super_admin and hidden from clinic tenants", async () => {
    // Clinic A query: cannot see super-admin audit log (clinic_id IS NULL)
    const clinicLogs = await withClinicContext(clinicAId, async (client) => {
      const res = await client.query("SELECT * FROM audit_log WHERE clinic_id IS NULL;");
      return res.rows;
    });
    expect(clinicLogs.length).toBe(0);

    // Super-admin query: can see audit logs with clinic_id IS NULL
    const superAdminSession = {
      userId: "usr-super-admin-0",
      role: "super_admin",
      email: "admin@platform.internal",
    };
    const superLogs = await withSuperAdminContext(superAdminSession, "verify_audit_view", {}, async (client) => {
      const res = await client.query("SELECT * FROM audit_log WHERE clinic_id IS NULL;");
      return res.rows;
    });
    expect(superLogs.length).toBeGreaterThanOrEqual(1);
    expect(superLogs.some((l) => l.action.includes("super_admin"))).toBe(true);
  });

  it("13. patient_account_links: direct INSERT is forbidden; linking is permitted only via auth_link_patient_account_with_code", async () => {
    // 1. Direct INSERT attempt by clinic context is blocked
    let directInsertError: any = null;
    try {
      await withClinicContext(clinicAId, async (client) => {
        await client.query(
          `INSERT INTO patient_account_links (account_id, clinic_id, patient_id, verified_via)
           VALUES ($1, $2, $3, 'direct_booking');`,
          [patientAccountBId, clinicAId, patientAId]
        );
      });
    } catch (err: any) {
      directInsertError = err;
    }
    expect(directInsertError).toBeDefined();
    expect(directInsertError.code).toBe("42501"); // insufficient privilege or RLS check violation

    // 2. Legitimate linking via SECURITY DEFINER function with verified code succeeds
    // Seed verification code with adminClient
    const codeHash = "hash_otp_code_123456";
    await adminClient.query(
      `INSERT INTO patient_link_codes (clinic_id, patient_id, code_hash, expires_at)
       VALUES ($1, $2, $3, now() + interval '10 minutes');`,
      [clinicAId, patientAId, codeHash]
    );

    const client = await appPool.connect();
    try {
      const linkRes = await client.query(
        `SELECT auth_link_patient_account_with_code($1, $2, $3, $4, 'phone_otp') AS success;`,
        [patientAccountBId, clinicAId, patientAId, codeHash]
      );
      expect(linkRes.rows[0].success).toBe(true);

      // Verify code cannot be reused (consumed)
      const reuseRes = await client.query(
        `SELECT auth_link_patient_account_with_code($1, $2, $3, $4, 'phone_otp') AS success;`,
        [patientAccountBId, clinicAId, patientAId, codeHash]
      );
      expect(reuseRes.rows[0].success).toBe(false);
    } finally {
      client.release();
    }
  });

  it("14. Pre-login SECURITY DEFINER Functions: create tokens & signup without enumeration leaks", async () => {
    const client = await appPool.connect();
    try {
      // 1. Password reset token: returns true for existing and non-existing email without leaking
      const resetTrue = await client.query(
        `SELECT auth_create_password_reset_token('nonexistent@domain.com', 'dummy_hash_1', now() + interval '1 hour') AS ok;`
      );
      expect(resetTrue.rows[0].ok).toBe(true);

      // 2. Magic link token creation
      const magicTrue = await client.query(
        `SELECT auth_create_magic_link_token('patient@example.com', 'dummy_magic_hash', now() + interval '15 minutes') AS ok;`
      );
      expect(magicTrue.rows[0].ok).toBe(true);

      // 3. Patient first signup via Google
      const googleSub = "google_sub_unique_123";
      const signupRes = await client.query(
        `SELECT * FROM auth_register_patient_first_signup('google', $1, 'New Google Patient', 'new.google.patient@example.com', '+919876500099');`,
        [googleSub]
      );
      expect(signupRes.rows.length).toBe(1);
      expect(signupRes.rows[0].is_new).toBe(true);

      // Subsequent call with same sub returns existing account
      const secondCall = await client.query(
        `SELECT * FROM auth_register_patient_first_signup('google', $1, 'New Google Patient', 'new.google.patient@example.com', '+919876500099');`,
        [googleSub]
      );
      expect(secondCall.rows[0].is_new).toBe(false);
      expect(secondCall.rows[0].account_id).toBe(signupRes.rows[0].account_id);
    } finally {
      client.release();
    }
  });

  it("15. Patient Column Boundary: patient views strictly hide internal notes and storage paths", async () => {
    await withPatientContext(patientAccountAId, async (client) => {
      // 1. patient_appointments_view does not contain 'notes'
      const apt = await client.query(
        "SELECT * FROM patient_appointments_view WHERE id = $1;",
        [appointmentAId]
      );
      expect(apt.rows.length).toBe(1);
      expect(apt.rows[0].notes).toBeUndefined();
      expect(apt.rows[0].source).toBeUndefined();

      // 2. patient_reports_view does not contain 'storage_path' or lock metadata
      const rep = await client.query(
        "SELECT * FROM patient_reports_view WHERE id = $1;",
        [reportAId]
      );
      expect(rep.rows.length).toBe(1);
      expect(rep.rows[0].storage_path).toBeUndefined();
      expect(rep.rows[0].patient_dob).toBeUndefined();
      expect(rep.rows[0].dob_lock_until).toBeUndefined();
      expect(rep.rows[0].dob_failed_attempts).toBeUndefined();
    });
  });

  it("16. System Clinic Isolation: platform system clinic is completely invisible to normal clinic routes", async () => {
    // In Clinic A context, only Clinic A is visible
    const clinicRows = await withClinicContext(clinicAId, async (client) => {
      const res = await client.query("SELECT * FROM clinics;");
      return res.rows;
    });
    expect(clinicRows.length).toBe(1);
    expect(clinicRows[0].id).toBe(clinicAId);
    expect(clinicRows.some((c) => c.slug === "system-platform")).toBe(false);

    // Super-admin context can view system clinic
    const superAdminSession = {
      userId: "usr-super-admin-0",
      role: "super_admin",
      email: "admin@platform.internal",
    };
    const adminClinics = await withSuperAdminContext(superAdminSession, "list_all", {}, async (client) => {
      const res = await client.query("SELECT * FROM clinics;");
      return res.rows;
    });
    expect(adminClinics.some((c) => c.slug === "system-platform")).toBe(true);
  });

  it("17. Super-Admin Metrics: returns aggregate counts without direct access to clinical tables", async () => {
    const superAdminSession = {
      userId: "usr-super-admin-0",
      role: "super_admin",
      email: "admin@platform.internal",
    };

    // Calling metrics function in super-admin context succeeds
    const metrics = await withSuperAdminContext(superAdminSession, "view_metrics", {}, async (client) => {
      const res = await client.query("SELECT * FROM super_admin_get_platform_metrics();");
      return res.rows[0];
    });

    expect(metrics).toBeDefined();
    expect(Number(metrics.total_clinics)).toBeGreaterThanOrEqual(2);
    expect(Number(metrics.total_active_doctors)).toBeGreaterThanOrEqual(1);
    expect(Number(metrics.total_appointments)).toBeGreaterThanOrEqual(1);

    // Calling metrics function from regular app connection without super-admin context fails
    const client = await appPool.connect();
    let unauthorizedError: any = null;
    try {
      await client.query("SELECT * FROM super_admin_get_platform_metrics();");
    } catch (err: any) {
      unauthorizedError = err;
    } finally {
      client.release();
    }
    expect(unauthorizedError).toBeDefined();
    expect(unauthorizedError.message).toContain("UNAUTHORIZED: Super-admin context required");
  });

  it("18. Tightened Grants: app role cannot DELETE appointments/reports/messages/patients or UPDATE staff role", async () => {
    const client = await appPool.connect();
    try {
      // 1. DELETE on appointments is rejected (42501)
      let delAptErr: any = null;
      try {
        await client.query("DELETE FROM appointments WHERE id = $1;", [appointmentAId]);
      } catch (err: any) {
        delAptErr = err;
      }
      expect(delAptErr).toBeDefined();
      expect(delAptErr.code).toBe("42501");

      // 2. DELETE on reports is rejected (42501)
      let delRepErr: any = null;
      try {
        await client.query("DELETE FROM reports WHERE id = $1;", [reportAId]);
      } catch (err: any) {
        delRepErr = err;
      }
      expect(delRepErr).toBeDefined();
      expect(delRepErr.code).toBe("42501");

      // 3. DELETE on patients is rejected (42501)
      let delPatErr: any = null;
      try {
        await client.query("DELETE FROM patients WHERE id = $1;", [patientAId]);
      } catch (err: any) {
        delPatErr = err;
      }
      expect(delPatErr).toBeDefined();
      expect(delPatErr.code).toBe("42501");

      // 4. Column-level UPDATE privilege on staff_users: updating role directly is rejected (42501)
      let roleUpdErr: any = null;
      try {
        await client.query("UPDATE staff_users SET role = 'super_admin';");
      } catch (err: any) {
        roleUpdErr = err;
      }
      expect(roleUpdErr).toBeDefined();
      expect(roleUpdErr.code).toBe("42501");
    } finally {
      client.release();
    }
  });
});
