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
    await client.query("SELECT set_config('app.clinic_id', $1, true);", [clinicId]);
    await client.query("SELECT set_config('app.patient_account_id', '', true);");
    await client.query("SELECT set_config('app.is_super_admin', 'false', true);");

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
    await client.query("SELECT set_config('app.clinic_id', '', true);");
    await client.query("SELECT set_config('app.patient_account_id', $1, true);", [accountId]);
    await client.query("SELECT set_config('app.is_super_admin', 'false', true);");

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

    // Super-admin access is strictly audited before granting cross-tenant privilege
    await client.query(
      `INSERT INTO audit_log (user_id, action, target_table, details)
       VALUES ($1, $2, 'platform', $3);`,
      [session.userId || null, `super_admin:${action}`, JSON.stringify(details)]
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
