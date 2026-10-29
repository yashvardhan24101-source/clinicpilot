import fs from "fs";
import path from "path";
import { Client } from "pg";

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

    // Pass APP_DB_PASSWORD as session configuration variable (never printed to logs)
    const appPassword = process.env.APP_DB_PASSWORD || "ci_app_pass_placeholder";
    await client.query("SELECT set_config('app.db_password', $1, false);", [appPassword]);

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

    console.log("🎉 All database migrations applied successfully.");
  } catch (err) {
    console.error("❌ Migration runner error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
