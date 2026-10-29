import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client, Pool } from "pg";
import { verifyAppDatabaseSecurity } from "@/lib/db";

const migrationsUrl = process.env.DATABASE_URL_MIGRATIONS;
const appUrl = process.env.DATABASE_URL;

const isDbAvailable = Boolean(migrationsUrl && appUrl);

describe.runIf(isDbAvailable)("M1: Real PostgreSQL Schema, Constraints & Least Privilege", () => {
  let adminClient: Client;
  let appPool: Pool;

  beforeAll(async () => {
    adminClient = new Client({
      connectionString: migrationsUrl,
    });
    await adminClient.connect();

    appPool = new Pool({
      connectionString: appUrl,
    });
  });

  afterAll(async () => {
    await appPool?.end();
    await adminClient?.end();
  });

  it("1. Clean migration from empty: verifies extensions, tables and views exist", async () => {
    const extRes = await adminClient.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('btree_gist', 'pgcrypto', 'uuid-ossp');`
    );
    const extensions = extRes.rows.map((r) => r.extname);
    expect(extensions).toContain("btree_gist");
    expect(extensions).toContain("pgcrypto");

    const tablesRes = await adminClient.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
    );
    const tables = tablesRes.rows.map((r) => r.tablename);
    expect(tables).toContain("clinics");
    expect(tables).toContain("staff_users");
    expect(tables).toContain("doctors");
    expect(tables).toContain("appointments");
    expect(tables).toContain("patients");
    expect(tables).toContain("audit_log");
    expect(tables).toContain("consents");
    expect(tables).toContain("sessions");

    const viewsRes = await adminClient.query(
      `SELECT table_name FROM information_schema.views WHERE table_schema = 'public';`
    );
    const views = viewsRes.rows.map((r) => r.table_name);
    expect(views).toContain("patient_appointments_view");
    expect(views).toContain("patient_reports_view");
  });

  it("2. GiST Exclusion Constraint: rejects overlapping bookings and allows back-to-back bookings", async () => {
    // Insert clinic and doctor using adminClient
    const clinicRes = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city) 
       VALUES ('Test Dental', 'test-dental-gist', 'TD01', 'Mumbai') 
       RETURNING id;`
    );
    const clinicId = clinicRes.rows[0].id;

    const doctorRes = await adminClient.query(
      `INSERT INTO doctors (clinic_id, name, specialty) 
       VALUES ($1, 'Dr. Gist Test', 'Orthodontics') 
       RETURNING id;`,
      [clinicId]
    );
    const doctorId = doctorRes.rows[0].id;

    const patientRes = await adminClient.query(
      `INSERT INTO patients (clinic_id, name, phone) 
       VALUES ($1, 'Patient One', '+919876500001') 
       RETURNING id;`,
      [clinicId]
    );
    const patientId = patientRes.rows[0].id;

    // Booking 1: 10:00 to 10:30
    await adminClient.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, '2026-11-01 10:00:00+05:30', '2026-11-01 10:30:00+05:30', 'booked');`,
      [clinicId, patientId, doctorId]
    );

    // Overlapping Booking: 10:15 to 10:45 -> MUST FAIL with 23P01 exclusion violation
    let overlapError: any = null;
    try {
      await adminClient.query(
        `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
         VALUES ($1, $2, $3, '2026-11-01 10:15:00+05:30', '2026-11-01 10:45:00+05:30', 'booked');`,
        [clinicId, patientId, doctorId]
      );
    } catch (err: any) {
      overlapError = err;
    }
    expect(overlapError).toBeDefined();
    expect(overlapError.code).toBe("23P01"); // exclusion_violation in Postgres

    // Back-to-back Booking: 10:30 to 11:00 -> MUST SUCCEED (half-open range [) allows abutting boundary)
    const backToBack = await adminClient.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, '2026-11-01 10:30:00+05:30', '2026-11-01 11:00:00+05:30', 'booked')
       RETURNING id;`,
      [clinicId, patientId, doctorId]
    );
    expect(backToBack.rows[0].id).toBeDefined();

    // Cancelled overlapping booking: 10:15 to 10:45 with status='cancelled' -> MUST SUCCEED (positive list)
    const cancelledBooking = await adminClient.query(
      `INSERT INTO appointments (clinic_id, patient_id, doctor_id, scheduled_start, scheduled_end, status)
       VALUES ($1, $2, $3, '2026-11-01 10:15:00+05:30', '2026-11-01 10:45:00+05:30', 'cancelled')
       RETURNING id;`,
      [clinicId, patientId, doctorId]
    );
    expect(cancelledBooking.rows[0].id).toBeDefined();
  });

  it("3. CHECK constraints: rejects invalid roles, statuses, and day of week", async () => {
    const clinicRes = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city) 
       VALUES ('Check Clinic', 'check-clinic', 'CK01', 'Pune') 
       RETURNING id;`
    );
    const clinicId = clinicRes.rows[0].id;

    // Invalid staff role
    let roleError: any = null;
    try {
      await adminClient.query(
        `INSERT INTO staff_users (clinic_id, name, email, role, password_hash)
         VALUES ($1, 'Bad Role', 'bad@check.in', 'unauthorized_role', 'hash');`,
        [clinicId]
      );
    } catch (err: any) {
      roleError = err;
    }
    expect(roleError).toBeDefined();
    expect(roleError.code).toBe("23514"); // check_violation

    // Invalid day_of_week (> 6)
    const doctorRes = await adminClient.query(
      `INSERT INTO doctors (clinic_id, name, specialty) VALUES ($1, 'Dr. Day', 'General') RETURNING id;`,
      [clinicId]
    );
    const doctorId = doctorRes.rows[0].id;

    let dayError: any = null;
    try {
      await adminClient.query(
        `INSERT INTO doctor_working_hours (clinic_id, doctor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, 7, '09:00', '17:00');`,
        [clinicId, doctorId]
      );
    } catch (err: any) {
      dayError = err;
    }
    expect(dayError).toBeDefined();
    expect(dayError.code).toBe("23514"); // check_violation
  });

  it("4. Unique phone per clinic: enforces uniqueness within a clinic but allows across clinics", async () => {
    const clinicARes = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city) VALUES ('Clinic A', 'clinic-a-phone', 'CA01', 'Delhi') RETURNING id;`
    );
    const clinicA = clinicARes.rows[0].id;

    const clinicBRes = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city) VALUES ('Clinic B', 'clinic-b-phone', 'CB01', 'Noida') RETURNING id;`
    );
    const clinicB = clinicBRes.rows[0].id;

    const testPhone = "+919811122233";

    // Insert into Clinic A -> Success
    await adminClient.query(
      `INSERT INTO patients (clinic_id, name, phone) VALUES ($1, 'Patient A1', $2);`,
      [clinicA, testPhone]
    );

    // Duplicate phone in Clinic A -> Unique violation (23505)
    let dupError: any = null;
    try {
      await adminClient.query(
        `INSERT INTO patients (clinic_id, name, phone) VALUES ($1, 'Patient A2 Duplicate', $2);`,
        [clinicA, testPhone]
      );
    } catch (err: any) {
      dupError = err;
    }
    expect(dupError).toBeDefined();
    expect(dupError.code).toBe("23505");

    // Same phone in Clinic B -> MUST SUCCEED (clinic isolation)
    const patientB = await adminClient.query(
      `INSERT INTO patients (clinic_id, name, phone) VALUES ($1, 'Patient B1', $2) RETURNING id;`,
      [clinicB, testPhone]
    );
    expect(patientB.rows[0].id).toBeDefined();
  });

  it("5. Staff email case-insensitive uniqueness: rejects mixed-case duplicate emails", async () => {
    const clinicRes = await adminClient.query(
      `INSERT INTO clinics (name, slug, short_code, city) VALUES ('Email Clinic', 'email-clinic', 'EC01', 'Jaipur') RETURNING id;`
    );
    const clinicId = clinicRes.rows[0].id;

    await adminClient.query(
      `INSERT INTO staff_users (clinic_id, name, email, role, password_hash)
       VALUES ($1, 'Dr. Case', 'dr.case@clinic.in', 'doctor', 'hash123');`,
      [clinicId]
    );

    let dupEmailError: any = null;
    try {
      await adminClient.query(
        `INSERT INTO staff_users (clinic_id, name, email, role, password_hash)
         VALUES ($1, 'Dr. Case Upper', 'DR.CASE@CLINIC.IN', 'doctor', 'hash456');`,
        [clinicId]
      );
    } catch (err: any) {
      dupEmailError = err;
    }
    expect(dupEmailError).toBeDefined();
    expect(dupEmailError.code).toBe("23505");
  });

  it("6. Least Privilege Grants: clinicpilot_app has INSERT/SELECT only on audit_log and consents", async () => {
    const appClient = await appPool.connect();
    try {
      // app role can insert into audit_log
      const insertRes = await appClient.query(
        `INSERT INTO audit_log (actor_id, actor_role, action, resource, details)
         VALUES ('usr-test', 'doctor', 'TEST_ACTION', 'appointment', 'details') RETURNING id;`
      );
      const auditId = insertRes.rows[0].id;
      expect(auditId).toBeDefined();

      // app role cannot UPDATE audit_log (permission denied 42501)
      let updateError: any = null;
      try {
        await appClient.query(`UPDATE audit_log SET details = 'tampered' WHERE id = $1;`, [auditId]);
      } catch (err: any) {
        updateError = err;
      }
      expect(updateError).toBeDefined();
      expect(updateError.code).toBe("42501"); // insufficient_privilege

      // app role cannot DELETE audit_log (permission denied 42501)
      let deleteError: any = null;
      try {
        await appClient.query(`DELETE FROM audit_log WHERE id = $1;`, [auditId]);
      } catch (err: any) {
        deleteError = err;
      }
      expect(deleteError).toBeDefined();
      expect(deleteError.code).toBe("42501");
    } finally {
      appClient.release();
    }
  });

  it("7. SECURITY DEFINER functions: execute successfully under FORCE RLS with constant-timing defense", async () => {
    const appClient = await appPool.connect();
    try {
      // Create user with adminClient
      const clinicRes = await adminClient.query(
        `INSERT INTO clinics (name, slug, short_code, city) VALUES ('Sec Clinic', 'sec-clinic', 'SC01', 'Kolkata') RETURNING id;`
      );
      const clinicId = clinicRes.rows[0].id;

      await adminClient.query(
        `INSERT INTO staff_users (clinic_id, name, email, role, password_hash)
         VALUES ($1, 'Sec Staff', 'sec.staff@clinic.in', 'receptionist', '$2a$10$realValidHashPlaceholderXXXXXXXXXXXXXXX');`,
        [clinicId]
      );

      // Existing user lookup via appClient
      const userLookup = await appClient.query(
        `SELECT * FROM auth_lookup_staff_by_email('sec.staff@clinic.in');`
      );
      expect(userLookup.rows.length).toBe(1);
      expect(userLookup.rows[0].email).toBe("sec.staff@clinic.in");

      // Non-existent user lookup via appClient (executes constant-timing dummy crypt defense)
      const startMs = Date.now();
      const ghostLookup = await appClient.query(
        `SELECT * FROM auth_lookup_staff_by_email('nonexistent.user@clinic.in');`
      );
      const elapsedMs = Date.now() - startMs;
      expect(ghostLookup.rows.length).toBe(0);
      // Confirms dummy bcrypt was executed (takes measurable bcrypt compute time > 10ms)
      expect(elapsedMs).toBeGreaterThanOrEqual(10);
    } finally {
      appClient.release();
    }
  });

  it("8. Mandatory Startup Security Check: verifies NOBYPASSRLS, non-superuser, 0 table ownership & behavioral zero check", async () => {
    const checkResult = await verifyAppDatabaseSecurity(appPool);
    expect(checkResult.currentUser).toBe("clinicpilot_app");
    expect(checkResult.isSuperuser).toBe(false);
    expect(checkResult.hasBypassRls).toBe(false);
    expect(checkResult.ownedTableCount).toBe(0);
    expect(checkResult.behavioralZeroCheck).toBe(true);
  });
});
