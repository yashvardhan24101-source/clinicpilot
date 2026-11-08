-- 0000_setup_extensions_and_roles.sql
-- Setup essential PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create restricted runtime application role clinicpilot_app with NOBYPASSRLS
-- Password is dynamically retrieved from session variable app.db_scram_verifier (precomputed SCRAM-SHA-256 verifier, plaintext password is never sent or logged)
DO $$
DECLARE
  v_verifier text := current_setting('app.db_scram_verifier', true);
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinicpilot_app') THEN
    IF v_verifier IS NOT NULL AND v_verifier <> '' THEN
      EXECUTE format(
        'CREATE ROLE clinicpilot_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
        v_verifier
      );
    ELSE
      CREATE ROLE clinicpilot_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    END IF;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO clinicpilot_app;
