-- 0002_rls_and_security_definer.sql

-- 1. Enable & FORCE Row-Level Security on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics FORCE ROW LEVEL SECURITY;

ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users FORCE ROW LEVEL SECURITY;

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors FORCE ROW LEVEL SECURITY;

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;

ALTER TABLE doctor_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_working_hours FORCE ROW LEVEL SECURITY;

ALTER TABLE doctor_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_time_off FORCE ROW LEVEL SECURITY;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents FORCE ROW LEVEL SECURITY;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

ALTER TABLE followup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups FORCE ROW LEVEL SECURITY;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invites FORCE ROW LEVEL SECURITY;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE clinic_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_identities FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_link_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_account_links FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members FORCE ROW LEVEL SECURITY;

ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_account_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_account_consents FORCE ROW LEVEL SECURITY;

-- 2. Staff Clinic Tenant Policies (app.clinic_id)
CREATE POLICY clinics_tenant_policy ON clinics FOR ALL
  USING (id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY staff_users_tenant_policy ON staff_users FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY doctors_tenant_policy ON doctors FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY services_tenant_policy ON services FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY doctor_working_hours_tenant_policy ON doctor_working_hours FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY doctor_time_off_tenant_policy ON doctor_time_off FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY patients_tenant_policy ON patients FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY consents_tenant_policy ON consents FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY appointments_tenant_policy ON appointments FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY conversations_tenant_policy ON conversations FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY messages_tenant_policy ON messages FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY followup_rules_tenant_policy ON followup_rules FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY followups_tenant_policy ON followups FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY reports_tenant_policy ON reports FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

-- audit_log: INSERT policy allowing clinic_id IS NULL (pre-login & super-admin events)
CREATE POLICY audit_log_insert_policy ON audit_log FOR INSERT
  WITH CHECK (
    clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
    OR clinic_id IS NULL
  );

-- audit_log: tenant SELECT policy (clinics see their own rows; NULL clinic_id rows are restricted)
CREATE POLICY audit_log_tenant_select ON audit_log FOR SELECT
  USING (clinic_id IS NOT NULL AND clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

-- audit_log: super_admin SELECT policy (super-admin sees all rows, including NULL clinic_id rows)
CREATE POLICY audit_log_super_admin_select ON audit_log FOR SELECT
  USING (current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY sessions_tenant_policy ON sessions FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY staff_invites_tenant_policy ON staff_invites FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY password_reset_tokens_tenant_policy ON password_reset_tokens FOR ALL
  USING (user_id IN (SELECT id FROM staff_users WHERE clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid));

-- 3. Patient Tenant Policies (app.patient_account_id)
CREATE POLICY patient_accounts_tenant_policy ON patient_accounts FOR ALL
  USING (id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

CREATE POLICY patient_identities_tenant_policy ON patient_identities FOR ALL
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

-- patient_account_links: Remove direct INSERT and UPDATE for clinic context
-- Links are created exclusively via SECURITY DEFINER function auth_link_patient_account_with_code
CREATE POLICY patient_account_links_clinic_select ON patient_account_links FOR SELECT
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY patient_account_links_clinic_delete ON patient_account_links FOR DELETE
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY patient_account_links_patient_select ON patient_account_links FOR SELECT
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

CREATE POLICY patient_sessions_tenant_policy ON patient_sessions FOR ALL
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

CREATE POLICY family_members_tenant_policy ON family_members FOR ALL
  USING (guardian_account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

-- Account-scoped consents policy
CREATE POLICY patient_account_consents_policy ON patient_account_consents FOR ALL
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid)
  WITH CHECK (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

-- Patient access to appointments & reports through verified account links
CREATE POLICY appointments_patient_select ON appointments FOR SELECT
  USING (
    patient_id IN (
      SELECT patient_id FROM patient_account_links 
      WHERE account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid
    )
  );

CREATE POLICY reports_patient_select ON reports FOR SELECT
  USING (
    patient_id IN (
      SELECT patient_id FROM patient_account_links 
      WHERE account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid
    )
  );

-- 4. Super-Admin Policies (Strictly audited withSuperAdminContext only)
-- NO super-admin policies on clinical tables (appointments, reports, messages, patients, conversations, consents, followups)
CREATE POLICY clinics_super_admin_policy ON clinics FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY staff_users_super_admin_policy ON staff_users FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY clinic_requests_super_admin_policy ON clinic_requests FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

-- Public insert policy for register-clinic request
CREATE POLICY clinic_requests_public_insert ON clinic_requests FOR INSERT
  WITH CHECK (true);

-- Explicit policies for magic_link_tokens: direct access blocked for ordinary tenants
CREATE POLICY magic_link_tokens_super_admin ON magic_link_tokens FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

-- 5. Context Mutual Exclusivity Assertion Function
CREATE OR REPLACE FUNCTION assert_mutually_exclusive_context()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF NULLIF(current_setting('app.clinic_id', true), '') IS NOT NULL
     AND NULLIF(current_setting('app.patient_account_id', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'MUTUALLY_EXCLUSIVE_CONTEXT: Both app.clinic_id and app.patient_account_id cannot be active simultaneously'
      USING ERRCODE = '22000';
  END IF;
  RETURN true;
END;
$$;

-- 6. Patient Views WITH (security_invoker = true)
CREATE OR REPLACE VIEW patient_appointments_view
WITH (security_invoker = true) AS
SELECT 
  a.id,
  a.clinic_id,
  c.name AS clinic_name,
  a.patient_id,
  a.doctor_id,
  d.name AS doctor_name,
  d.specialty AS doctor_specialty,
  a.service_id,
  s.name AS service_name,
  a.scheduled_start,
  a.scheduled_end,
  a.status,
  a.token_number,
  a.created_at
FROM appointments a
JOIN clinics c ON a.clinic_id = c.id
JOIN doctors d ON a.doctor_id = d.id
LEFT JOIN services s ON a.service_id = s.id;

CREATE OR REPLACE VIEW patient_reports_view
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.clinic_id,
  c.name AS clinic_name,
  r.patient_id,
  r.title,
  r.category,
  r.file_name,
  r.file_size_bytes,
  r.uploaded_at
FROM reports r
JOIN clinics c ON r.clinic_id = c.id;

-- 7. Least-Privilege Grants to clinicpilot_app Role
-- Immutable audit log: INSERT and SELECT ONLY (No UPDATE, No DELETE)
GRANT INSERT, SELECT ON audit_log TO clinicpilot_app;

-- Append-only consents: INSERT and SELECT ONLY (No UPDATE, No DELETE)
GRANT INSERT, SELECT ON consents TO clinicpilot_app;
GRANT INSERT, SELECT ON patient_account_consents TO clinicpilot_app;

-- Public clinic registration submissions: INSERT and SELECT only
GRANT INSERT, SELECT ON clinic_requests TO clinicpilot_app;

-- patient_account_links: SELECT and DELETE only (NO direct INSERT, NO UPDATE)
GRANT SELECT, DELETE ON patient_account_links TO clinicpilot_app;

-- Clinical records: NO DELETE permitted (soft-delete / retention policies apply)
GRANT SELECT, INSERT, UPDATE ON appointments TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE ON reports TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE ON patients TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE ON conversations TO clinicpilot_app;
GRANT SELECT, INSERT ON messages TO clinicpilot_app; -- Chat messages are immutable (No UPDATE, No DELETE)

-- Staff users: column-level UPDATE on non-sensitive columns only (role, password_hash, clinic_id cannot be modified via ordinary UPDATE)
GRANT SELECT, INSERT, DELETE ON staff_users TO clinicpilot_app;
GRANT UPDATE (name, email, is_active) ON staff_users TO clinicpilot_app;

-- Operational tenant entities:
GRANT SELECT, INSERT, UPDATE ON clinics TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctors TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctor_working_hours TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctor_time_off TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON followup_rules TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON followups TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_invites TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO clinicpilot_app;

-- Patient portal entities:
GRANT SELECT, INSERT, UPDATE ON patient_accounts TO clinicpilot_app;
GRANT SELECT, INSERT ON patient_identities TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_sessions TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO clinicpilot_app;
GRANT SELECT, DELETE ON magic_link_tokens TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_link_codes TO clinicpilot_app;

GRANT SELECT ON patient_appointments_view TO clinicpilot_app;
GRANT SELECT ON patient_reports_view TO clinicpilot_app;

-- 8. SECURITY DEFINER Functions for Pre-Login Operations & Metrics

-- Staff login lookup: returns minimal authentication payload.
-- If user does not exist, runs a dummy bcrypt crypt to ensure constant execution timing and defeat user enumeration timing attacks.
CREATE OR REPLACE FUNCTION auth_lookup_staff_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  clinic_id uuid,
  name text,
  email text,
  role text,
  password_hash text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user staff_users%ROWTYPE;
  v_dummy_hash text;
BEGIN
  SELECT * INTO v_user
  FROM staff_users
  WHERE lower(staff_users.email) = lower(p_email)
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_user.id, v_user.clinic_id, v_user.name, v_user.email, v_user.role, v_user.password_hash, v_user.is_active;
  ELSE
    -- Constant timing dummy bcrypt calculation to prevent account enumeration
    v_dummy_hash := crypt('dummy_password_timing_defense', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_lookup_staff_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup_staff_by_email(text) TO clinicpilot_app;

-- Pre-login password reset token creation:
-- Same response whether or not the email exists; constant timing dummy crypt on miss
CREATE OR REPLACE FUNCTION auth_create_password_reset_token(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_dummy_hash text;
BEGIN
  SELECT id INTO v_user_id
  FROM staff_users
  WHERE lower(email) = lower(p_email) AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (v_user_id, p_token_hash, p_expires_at);
  ELSE
    -- Constant timing dummy calculation to prevent account enumeration
    v_dummy_hash := crypt('dummy_password_timing_defense', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION auth_create_password_reset_token(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_create_password_reset_token(text, text, timestamptz) TO clinicpilot_app;

-- Pre-login magic link token creation:
CREATE OR REPLACE FUNCTION auth_create_magic_link_token(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO magic_link_tokens (email, token_hash, expires_at)
  VALUES (lower(trim(p_email)), p_token_hash, p_expires_at);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION auth_create_magic_link_token(text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_create_magic_link_token(text, text, timestamptz) TO clinicpilot_app;

-- Staff Session verification
CREATE OR REPLACE FUNCTION auth_verify_staff_session(p_jti uuid)
RETURNS TABLE (
  user_id uuid,
  clinic_id uuid,
  role text,
  expires_at timestamptz,
  is_revoked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.clinic_id,
    u.role,
    s.expires_at,
    (s.revoked_at IS NOT NULL) AS is_revoked
  FROM sessions s
  JOIN staff_users u ON s.user_id = u.id
  WHERE s.jti = p_jti;
END;
$$;

REVOKE ALL ON FUNCTION auth_verify_staff_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_verify_staff_session(uuid) TO clinicpilot_app;

-- Consume single-use password reset token
CREATE OR REPLACE FUNCTION auth_consume_password_reset_token(p_token_hash text)
RETURNS TABLE (
  user_id uuid,
  clinic_id uuid,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec password_reset_tokens%ROWTYPE;
  v_clinic_id uuid;
BEGIN
  SELECT * INTO v_rec
  FROM password_reset_tokens
  WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF FOUND THEN
    UPDATE password_reset_tokens SET used_at = now() WHERE id = v_rec.id;
    SELECT clinic_id INTO v_clinic_id FROM staff_users WHERE id = v_rec.user_id;
    RETURN QUERY SELECT v_rec.user_id, v_clinic_id, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_consume_password_reset_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_consume_password_reset_token(text) TO clinicpilot_app;

-- Consume single-use staff invitation token
CREATE OR REPLACE FUNCTION auth_consume_staff_invite_token(p_token_hash text)
RETURNS TABLE (
  invite_id uuid,
  clinic_id uuid,
  email text,
  role text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec staff_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_rec
  FROM staff_invites
  WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF FOUND THEN
    UPDATE staff_invites SET used_at = now() WHERE id = v_rec.id;
    RETURN QUERY SELECT v_rec.id, v_rec.clinic_id, v_rec.email, v_rec.role, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_consume_staff_invite_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_consume_staff_invite_token(text) TO clinicpilot_app;

-- Patient first sign-up (Google / Magic link): returns account_id, is_new
CREATE OR REPLACE FUNCTION auth_register_patient_first_signup(
  p_provider text,
  p_provider_subject text,
  p_name text,
  p_email text,
  p_phone text
)
RETURNS TABLE (
  account_id uuid,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_acc_id uuid;
  v_clean_email text := NULLIF(lower(trim(p_email)), '');
  v_clean_phone text := NULLIF(trim(p_phone), '');
BEGIN
  -- 1. Check if identity already exists
  SELECT i.account_id INTO v_acc_id
  FROM patient_identities i
  WHERE i.provider = p_provider AND i.provider_subject = p_provider_subject;

  IF FOUND THEN
    RETURN QUERY SELECT v_acc_id, false;
    RETURN;
  END IF;

  -- 2. Check if account with email already exists
  IF v_clean_email IS NOT NULL THEN
    SELECT a.id INTO v_acc_id
    FROM patient_accounts a
    WHERE lower(a.email) = v_clean_email;
  END IF;

  IF v_acc_id IS NULL THEN
    -- Create new account
    INSERT INTO patient_accounts (name, email, phone)
    VALUES (p_name, v_clean_email, v_clean_phone)
    RETURNING id INTO v_acc_id;

    -- Link identity
    INSERT INTO patient_identities (account_id, provider, provider_subject)
    VALUES (v_acc_id, p_provider, p_provider_subject);

    RETURN QUERY SELECT v_acc_id, true;
  ELSE
    -- Link provider to existing account
    INSERT INTO patient_identities (account_id, provider, provider_subject)
    VALUES (v_acc_id, p_provider, p_provider_subject)
    ON CONFLICT (provider, provider_subject) DO NOTHING;

    RETURN QUERY SELECT v_acc_id, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_register_patient_first_signup(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_register_patient_first_signup(text, text, text, text, text) TO clinicpilot_app;

-- Lookup patient by Google sub
CREATE OR REPLACE FUNCTION auth_lookup_patient_google(p_sub text)
RETURNS TABLE (
  account_id uuid,
  name text,
  email text,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.name, a.email, a.is_active
  FROM patient_identities i
  JOIN patient_accounts a ON i.account_id = a.id
  WHERE i.provider = 'google' AND i.provider_subject = p_sub;
END;
$$;

REVOKE ALL ON FUNCTION auth_lookup_patient_google(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup_patient_google(text) TO clinicpilot_app;

-- Verify & consume patient magic link token
CREATE OR REPLACE FUNCTION auth_verify_patient_magic_link(p_token_hash text)
RETURNS TABLE (
  account_id uuid,
  email text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec magic_link_tokens%ROWTYPE;
  v_acc_id uuid;
BEGIN
  SELECT * INTO v_rec
  FROM magic_link_tokens
  WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF FOUND THEN
    UPDATE magic_link_tokens SET used_at = now() WHERE id = v_rec.id;
    SELECT id INTO v_acc_id FROM patient_accounts WHERE lower(patient_accounts.email) = lower(v_rec.email);
    RETURN QUERY SELECT v_acc_id, v_rec.email, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::text, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_verify_patient_magic_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_verify_patient_magic_link(text) TO clinicpilot_app;

-- Authorize and link patient account using verified one-time code
CREATE OR REPLACE FUNCTION auth_link_patient_account_with_code(
  p_account_id uuid,
  p_clinic_id uuid,
  p_patient_id uuid,
  p_code_hash text,
  p_verified_via text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  SELECT id INTO v_code_id
  FROM patient_link_codes
  WHERE clinic_id = p_clinic_id
    AND patient_id = p_patient_id
    AND code_hash = p_code_hash
    AND used_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE patient_link_codes SET used_at = now() WHERE id = v_code_id;

  INSERT INTO patient_account_links (account_id, clinic_id, patient_id, verified_via)
  VALUES (p_account_id, p_clinic_id, p_patient_id, p_verified_via)
  ON CONFLICT (account_id, clinic_id, patient_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION auth_link_patient_account_with_code(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_link_patient_account_with_code(uuid, uuid, uuid, text, text) TO clinicpilot_app;

-- Super-admin platform metrics: returns aggregated counts ONLY (no direct access to clinical tables)
CREATE OR REPLACE FUNCTION super_admin_get_platform_metrics()
RETURNS TABLE (
  total_clinics bigint,
  total_active_doctors bigint,
  total_appointments bigint,
  total_patients bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.is_super_admin', true) <> 'true' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Super-admin context required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM clinics WHERE slug <> 'system-platform') AS total_clinics,
    (SELECT count(*) FROM doctors WHERE active = true) AS total_active_doctors,
    (SELECT count(*) FROM appointments) AS total_appointments,
    (SELECT count(*) FROM patients) AS total_patients;
END;
$$;

REVOKE ALL ON FUNCTION super_admin_get_platform_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION super_admin_get_platform_metrics() TO clinicpilot_app;
