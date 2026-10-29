-- 0000_setup_extensions_and_roles.sql
-- Setup essential PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create restricted runtime application role clinicpilot_app with NOBYPASSRLS
-- Password is dynamically retrieved from session variable app.db_password (passed at migration time, never committed)
DO $$
DECLARE
  v_pass text := current_setting('app.db_password', true);
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'clinicpilot_app') THEN
    IF v_pass IS NULL OR v_pass = '' THEN
      v_pass := 'ci_app_pass_placeholder';
    END IF;
    EXECUTE format(
      'CREATE ROLE clinicpilot_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
      v_pass
    );
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO clinicpilot_app;
