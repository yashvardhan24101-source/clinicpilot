import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Client } from "pg";

/**
 * Computes PostgreSQL-compatible SCRAM-SHA-256 password verifier.
 * Format: SCRAM-SHA-256$<iterations>:<salt-base64>$<StoredKey-base64>:<ServerKey-base64>
 * This allows role creation & password updates without sending the plaintext password in SQL.
 */
export function computeScramSha256(password: string, iterations = 4096): string {
  const salt = crypto.randomBytes(16);
  const saltedPassword = crypto.pbkdf2Sync(
    password.normalize("NFKC"),
    salt,
    iterations,
    32,
    "sha256"
  );
  const clientKey = crypto
    .createHmac("sha256", saltedPassword)
    .update("Client Key")
    .digest();
  const storedKey = crypto.createHash("sha256").update(clientKey).digest("base64");
  const serverKey = crypto
    .createHmac("sha256", saltedPassword)
    .update("Server Key")
    .digest("base64");
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey}:${serverKey}`;
}

async function runMigrations() {
  const migrationsUrl = process.env.DATABASE_URL_MIGRATIONS || process.env.DATABASE_URL;

  if (!migrationsUrl) {
    console.error("❌ FATAL: DATABASE_URL_MIGRATIONS or DATABASE_URL must be set to run migrations.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: migrationsUrl,
    ssl: migrationsUrl.includes("sslmode=require") || migrationsUrl.includes("neon.tech")
      ? { rejectUnauthorized: true }
      : undefined,
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL as migration owner.");

    // Compute SCRAM-SHA-256 verifier for the app role (plaintext password is never logged or sent across network)
    const rawAppPassword = process.env.APP_DB_PASSWORD || "ci_app_pass_placeholder";
    const scramVerifier = computeScramSha256(rawAppPassword);

    // Pass SCRAM verifier via bound parameter in session variable app.db_scram_verifier
    await client.query("SELECT set_config('app.db_scram_verifier', $1, false);", [scramVerifier]);

    // Create tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS __clinicpilot_migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = path.join(process.cwd(), "drizzle", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations directory found.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        "SELECT id FROM __clinicpilot_migrations WHERE name = $1;",
        [file]
      );

      if (alreadyApplied.rows.length > 0) {
        console.log(`- Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`> Applying migration: ${file}...`);
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

      await client.query("BEGIN;");
      try {
        await client.query(sqlContent);
        await client.query(
          "INSERT INTO __clinicpilot_migrations (name) VALUES ($1);",
          [file]
        );
        await client.query("COMMIT;");
        console.log(`✅ Successfully applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK;");
        console.error(`❌ Migration failed in ${file}:`, err);
        process.exit(1);
      }
    }

    // Role credential synchronization & password rotation path:
    // If APP_DB_PASSWORD was provided, synchronize role credentials with the newly computed SCRAM verifier.
    if (process.env.APP_DB_PASSWORD) {
      await client.query(`
        DO $$
        DECLARE
          v_verifier text := current_setting('app.db_scram_verifier', true);
        BEGIN
          IF v_verifier IS NOT NULL AND v_verifier <> '' THEN
            IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinicpilot_app') THEN
              EXECUTE format('ALTER ROLE clinicpilot_app WITH PASSWORD %L', v_verifier);
            END IF;
          END IF;
        END $$;
      `);
      console.log("✅ App role credentials synchronized via SCRAM-SHA-256 verifier.");
    }

    console.log("🎉 All database migrations and credential configurations completed.");
  } catch (err) {
    console.error("❌ Migration runner error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
