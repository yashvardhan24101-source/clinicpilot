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

export const getAppPool = getDbPool;

let _drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_drizzleInstance) {
    _drizzleInstance = drizzle(getDbPool(), { schema });
  }
  return _drizzleInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

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
export async function verifyAppDatabaseSecurity(pool?: Pool): Promise<{
  currentUser: string;
  isSuperuser: boolean;
  hasBypassRls: boolean;
  ownedTableCount: number;
  behavioralZeroCheck: boolean;
}> {
  const clientPool = pool || getDbPool();
  const client = await clientPool.connect();

  try {
    // 1. Check current role attributes
    const roleRes = await client.query(`
      SELECT 
        current_user AS role_name,
        rolsuper,
        rolbypassrls
      FROM pg_roles 
      WHERE rolname = current_user;
    `);

    const roleInfo = roleRes.rows[0];
    if (!roleInfo) {
      throw new Error("Unable to inspect current database role attributes.");
    }

    if (roleInfo.rolsuper) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Database connection is running as superuser (${roleInfo.role_name}). App connection must be non-superuser.`
      );
    }

    if (roleInfo.rolbypassrls) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Database role ${roleInfo.role_name} has BYPASSRLS enabled. RLS multi-tenant boundary is compromised.`
      );
    }

    // 2. Check table ownership in public schema
    const ownerRes = await client.query(`
      SELECT count(*)::int AS count 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tableowner = current_user;
    `);

    const ownedTableCount = ownerRes.rows[0]?.count || 0;
    if (ownedTableCount > 0) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Database role ${roleInfo.role_name} owns ${ownedTableCount} public tables. Table owners bypass RLS.`
      );
    }

    // 3. Behavioral zero-check: without app.clinic_id set, tenant table query must return 0 rows
    const behavioralRes = await client.query(`SELECT count(*)::int AS c FROM appointments;`);
    const appointmentCount = behavioralRes.rows[0]?.c || 0;
    if (appointmentCount !== 0) {
      throw new Error(
        `FATAL SECURITY VIOLATION: Behavioral zero check failed. Unauthenticated SELECT returned ${appointmentCount} rows.`
      );
    }

    return {
      currentUser: roleInfo.role_name,
      isSuperuser: roleInfo.rolsuper,
      hasBypassRls: roleInfo.rolbypassrls,
      ownedTableCount,
      behavioralZeroCheck: true,
    };
  } finally {
    client.release();
  }
}
