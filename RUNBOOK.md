# ClinicPilot Production Runbook & Database Operations

## 1. App Database Password Rotation Procedure

The runtime role `clinicpilot_app` uses SCRAM-SHA-256 authentication with `NOBYPASSRLS`. To rotate its password:

1. Generate a new high-entropy password (e.g. `openssl rand -hex 32`).
2. Update the environment variable `APP_DB_PASSWORD` in your secure environment / deployment platform (e.g., Vercel Project Settings for production, or local `.env` for maintenance).
3. Update `DATABASE_URL` with the new password:
   `postgresql://clinicpilot_app:<NEW_PASSWORD>@<host>/<database>?sslmode=require`
4. Run the migration script with admin credentials:
   ```bash
   DATABASE_URL_MIGRATIONS="postgresql://neondb_owner:<ADMIN_PASS>@<host>/<database>?sslmode=require" \
   APP_DB_PASSWORD="<NEW_PASSWORD>" \
   npm run db:migrate
   ```
5. `scripts/migrate.ts` automatically computes the `SCRAM-SHA-256` verifier and applies:
   `ALTER ROLE clinicpilot_app WITH PASSWORD '<SCRAM-SHA-256-verifier>';`
   The raw password is never sent in plaintext over SQL statements or printed in logs.
6. Verify deployment health via `/api/health`.

---

## 2. Manual Production Migration Procedure

To maintain strict security boundary separation, production database credentials (`DATABASE_URL_MIGRATIONS` and `DATABASE_URL`) are **never** stored in GitHub Actions secrets. Migrations are executed out-of-band by the project owner:

1. Obtain migration owner connection string from the Neon console (`neondb_owner` role, direct connection endpoint, not pooler).
2. Set the environment variables in a secure terminal:
   ```bash
   export DATABASE_URL_MIGRATIONS="postgresql://neondb_owner:<ADMIN_PASS>@<ep-direct>.neon.tech/neondb?sslmode=require"
   export APP_DB_PASSWORD="<STRONG_APP_ROLE_PASSWORD>"
   ```
3. Run the migrations:
   ```bash
   npm run db:migrate
   ```
4. Verify all migrations are recorded in the `__clinicpilot_migrations` table.
5. Deploy or redeploy the application on Vercel with the updated `DATABASE_URL`.

---

## 3. Disposable Neon Branch Smoke Test Procedure

Run this one-time smoke test to verify RLS enforcement and schema constraints directly on Neon PostgreSQL infrastructure:

1. In the Neon Console or via Neon CLI, create a disposable child branch:
   ```bash
   neon branches create --name smoke-test-m2
   ```
2. Retrieve the two connection strings for the branch:
   - **Admin / Migration URL** (Direct endpoint, `neondb_owner` role):
     `postgresql://neondb_owner:<admin_pass>@<ep-direct-smoke>.neon.tech/neondb?sslmode=require`
   - **Pooled App URL** (Pooler endpoint `-pooler`, `clinicpilot_app` role):
     `postgresql://clinicpilot_app:<test_app_pass>@<ep-pooler-smoke>.neon.tech/neondb?sslmode=require`
3. In a local terminal, export the environment variables (nothing committed):
   ```bash
   export DATABASE_URL_MIGRATIONS="postgresql://neondb_owner:<admin_pass>@<ep-direct-smoke>.neon.tech/neondb?sslmode=require"
   export DATABASE_URL="postgresql://clinicpilot_app:<test_app_pass>@<ep-pooler-smoke>.neon.tech/neondb?sslmode=require"
   export APP_DB_PASSWORD="<test_app_pass>"
   ```
4. Apply migrations to initialize the schema, extensions, and `clinicpilot_app` role:
   ```bash
   npm run db:migrate
   ```
5. Run the integration test suite against the live Neon instance:
   ```bash
   npm run test:integration
   ```
6. Confirm all integration tests pass (both `db-schema-and-constraints.test.ts` and `tenant-isolation-rls.test.ts`).
7. Tear down and delete the disposable Neon branch:
   ```bash
   neon branches delete smoke-test-m2
   ```
