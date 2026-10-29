import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, PoolConfig } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_db_pool__: Pool | undefined;
}

function getPoolConfig(connectionString: string): PoolConfig {
  const isSsl = connectionString.includes("sslmode=require") || connectionString.includes("neon.tech");
  return {
    connectionString,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isSsl ? { rejectUnauthorized: true } : undefined,
  };
}

export function getDbPool(): Pool {
  if (global.__clinicpilot_db_pool__) {
    return global.__clinicpilot_db_pool__;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "FATAL: DATABASE_URL environment variable is missing. ClinicPilot requires a valid PostgreSQL connection string."
    );
  }

  const pool = new Pool(getPoolConfig(databaseUrl));
  if (process.env.NODE_ENV !== "production") {
    global.__clinicpilot_db_pool__ = pool;
  }
  return pool;
}

export const db = drizzle(getDbPool(), { schema });

/**
 * Migration client - connects with DATABASE_URL_MIGRATIONS
 */
export function getMigrationPool(): Pool {
  const migrationsUrl = process.env.DATABASE_URL_MIGRATIONS || process.env.DATABASE_URL;
  if (!migrationsUrl) {
    throw new Error(
      "FATAL: Neither DATABASE_URL_MIGRATIONS nor DATABASE_URL is configured."
    );
  }
  return new Pool(getPoolConfig(migrationsUrl));
}

/**
 * Mandatory Production Startup Check (Condition 1):
 * Verifies that the app connection:
 * 1. Is NOT superuser and has NOBYPASSRLS.
 * 2. Does NOT own any public tables (schemaname='public', tableowner=current_user returns 0).
 * 3. Behavioral check: With no context set, SELECT count(*) from tenant tables returns 0 rows.
 */
export async function verifyAppDatabaseSecurity(pool: Pool = getDbPool()): Promise<{
  currentUser: string;
  isSuperuser: boolean;
  hasBypassRls: boolean;
  ownedTableCount: number;
  behavioralZeroCheck: boolean;
}> {
  const client = await pool.connect();
  try {
    // 1. Current user and role attributes
    const roleRes = await client.query<{
      current_user: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
    }>(
      `SELECT current_user, r.rolsuper, r.rolbypassrls 
       FROM pg_roles r 
       WHERE r.rolname = current_user;`
    );

    if (roleRes.rows.length === 0) {
      throw new Error("FATAL: Could not verify database role attributes for current_user.");
    }

    const { current_user: currentUser, rolsuper: isSuperuser, rolbypassrls: hasBypassRls } = roleRes.rows[0];

    if (isSuperuser) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Database connection is running as SUPERUSER (${currentUser}). The application role must be a restricted user with NOSUPERUSER.`
      );
    }

    if (hasBypassRls) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Database connection user (${currentUser}) has BYPASSRLS privilege. Tenant isolation cannot be guaranteed.`
      );
    }

    // 2. Table ownership check
    const tablesRes = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user;`
    );

    if (tablesRes.rows.length > 0) {
      const owned = tablesRes.rows.map((r) => r.tablename).join(", ");
      throw new Error(
        `FATAL SECURITY VIOLATION: Application role (${currentUser}) owns tables in public schema (${owned}). Table owner bypasses RLS in Postgres. Tables must be owned by the migration role.`
      );
    }

    // 3. Behavioral check: With no context set, querying tenant tables must yield 0 rows
    const countRes = await client.query<{ count: string }>(
      `SELECT count(*)::text as count FROM appointments;`
    );
    const count = parseInt(countRes.rows[0]?.count || "0", 10);
    if (count !== 0) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Behavioral check failed. With no app.clinic_id context set, SELECT count(*) FROM appointments returned ${count} rows (expected 0). RLS is not properly enforcing isolation.`
      );
    }

    return {
      currentUser,
      isSuperuser: false,
      hasBypassRls: false,
      ownedTableCount: 0,
      behavioralZeroCheck: true,
    };
  } finally {
    client.release();
  }
}
