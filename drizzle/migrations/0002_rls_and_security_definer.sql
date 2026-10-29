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

ALTER TABLE patient_account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_account_links FORCE ROW LEVEL SECURITY;

ALTER TABLE patient_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members FORCE ROW LEVEL SECURITY;

ALTER TABLE magic_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_link_tokens FORCE ROW LEVEL SECURITY;

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

CREATE POLICY audit_log_tenant_policy ON audit_log FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

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

CREATE POLICY patient_account_links_clinic_policy ON patient_account_links FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY patient_account_links_patient_policy ON patient_account_links FOR SELECT
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

CREATE POLICY patient_sessions_tenant_policy ON patient_sessions FOR ALL
  USING (account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

CREATE POLICY family_members_tenant_policy ON family_members FOR ALL
  USING (guardian_account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid);

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

-- 4. Super-Admin Cross-Tenant Override (Explicitly audited withSuperAdminContext only)
CREATE POLICY clinics_super_admin_policy ON clinics FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY staff_users_super_admin_policy ON staff_users FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY clinic_requests_super_admin_policy ON clinic_requests FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

-- Public insert policy for register-clinic request
CREATE POLICY clinic_requests_public_insert ON clinic_requests FOR INSERT
  WITH CHECK (true);

-- 5. Patient Views WITH (security_invoker = true)
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

-- 6. Least-Privilege Grants to clinicpilot_app Role
-- Immutable audit log: INSERT and SELECT ONLY (No UPDATE, No DELETE)
GRANT INSERT, SELECT ON audit_log TO clinicpilot_app;

-- Append-only consents: INSERT and SELECT ONLY
GRANT INSERT, SELECT ON consents TO clinicpilot_app;

-- Public clinic registration submissions: INSERT only
GRANT INSERT ON clinic_requests TO clinicpilot_app;

-- Tenant tables: Full CRUD granted (constrained by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON clinics TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_users TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctors TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctor_working_hours TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON doctor_time_off TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patients TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON followup_rules TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON followups TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_invites TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_accounts TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_identities TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_account_links TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_sessions TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON family_members TO clinicpilot_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON magic_link_tokens TO clinicpilot_app;

GRANT SELECT ON patient_appointments_view TO clinicpilot_app;
GRANT SELECT ON patient_reports_view TO clinicpilot_app;

-- 7. SECURITY DEFINER Functions for Pre-Login Lookups (Constant Timing & Minimal Column Exposure)

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
