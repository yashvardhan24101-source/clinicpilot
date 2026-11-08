import { PoolClient } from "pg";
import { getAppPool } from "./index";

export interface SuperAdminSessionUser {
  userId: string;
  role: string;
  email?: string;
}

/**
 * Executes a callback within an isolated clinic tenant context inside a PostgreSQL transaction.
 * Context is set strictly using `SELECT set_config('app.clinic_id', $1, true)` with bound parameters.
 * `is_local = true` ensures the setting applies only to the current transaction.
 * Strictly asserts that patient context is NOT active in the same transaction.
 */
export async function withClinicContext<T>(
  clinicId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!clinicId) {
    throw new Error("clinicId is required to establish clinic tenant context");
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // Refuse if patient context is already active in this transaction
    const existingPatient = await client.query(
      "SELECT NULLIF(current_setting('app.patient_account_id', true), '') as patient_id;"
    );
    if (existingPatient.rows[0]?.patient_id) {
      throw new Error(
        "MUTUALLY_EXCLUSIVE_CONTEXT: Cannot set clinic context when patient context is already active in the same transaction."
      );
    }

    await client.query("SELECT set_config('app.clinic_id', $1, true);", [clinicId]);
    await client.query("SELECT set_config('app.is_super_admin', 'false', true);");
    await client.query("SELECT assert_mutually_exclusive_context();");

    const result = await fn(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    // Reset session variables before returning connection to pool (defense-in-depth against leakage)
    try {
      await client.query("SELECT set_config('app.clinic_id', '', false);");
      await client.query("SELECT set_config('app.patient_account_id', '', false);");
      await client.query("SELECT set_config('app.is_super_admin', 'false', false);");
    } catch {
      // Ignore cleanup error if client connection broke
    }
    client.release();
  }
}

/**
 * Executes a callback within an isolated patient portal account context inside a PostgreSQL transaction.
 * Context is set strictly using `SELECT set_config('app.patient_account_id', $1, true)` with bound parameters.
 * Strictly asserts that clinic context is NOT active in the same transaction.
 */
export async function withPatientContext<T>(
  accountId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!accountId) {
    throw new Error("accountId is required to establish patient tenant context");
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // Refuse if clinic context is already active in this transaction
    const existingClinic = await client.query(
      "SELECT NULLIF(current_setting('app.clinic_id', true), '') as clinic_id;"
    );
    if (existingClinic.rows[0]?.clinic_id) {
      throw new Error(
        "MUTUALLY_EXCLUSIVE_CONTEXT: Cannot set patient context when clinic context is already active in the same transaction."
      );
    }

    await client.query("SELECT set_config('app.patient_account_id', $1, true);", [accountId]);
    await client.query("SELECT set_config('app.is_super_admin', 'false', true);");
    await client.query("SELECT assert_mutually_exclusive_context();");

    const result = await fn(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    try {
      await client.query("SELECT set_config('app.clinic_id', '', false);");
      await client.query("SELECT set_config('app.patient_account_id', '', false);");
      await client.query("SELECT set_config('app.is_super_admin', 'false', false);");
    } catch {
      // Ignore cleanup error
    }
    client.release();
  }
}

/**
 * Executes a callback under audited super-admin platform context inside a PostgreSQL transaction.
 * Strictly asserts that the invoking session has role === 'super_admin'.
 * Automatically records an immutable audit log entry before enabling app.is_super_admin.
 */
export async function withSuperAdminContext<T>(
  session: SuperAdminSessionUser,
  action: string,
  details: Record<string, any>,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!session || session.role !== "super_admin") {
    throw new Error("UNAUTHORIZED: Only verified super_admin can enter super-admin context");
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // Super-admin access is strictly audited before granting cross-tenant privilege.
    // clinic_id is explicitly NULL for platform events.
    await client.query(
      `INSERT INTO audit_log (clinic_id, actor_id, actor_role, action, resource, details)
       VALUES (NULL, $1, 'super_admin', $2, 'platform', $3);`,
      [session.userId || "super_admin", `super_admin:${action}`, JSON.stringify(details)]
    );

    await client.query("SELECT set_config('app.is_super_admin', 'true', true);");

    const result = await fn(client);
    await client.query("COMMIT;");
    return result;
  } catch (error) {
    await client.query("ROLLBACK;");
    throw error;
  } finally {
    try {
      await client.query("SELECT set_config('app.is_super_admin', 'false', false);");
    } catch {
      // Ignore cleanup error
    }
    client.release();
  }
}
