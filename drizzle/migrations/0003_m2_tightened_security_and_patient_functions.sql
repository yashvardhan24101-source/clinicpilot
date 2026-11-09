-- 0003_m2_tightened_security_and_patient_functions.sql
-- Milestone 2: Tenant Isolation, RLS Hardening, Column-Level Grants, and Security Definer Updates

-- ============================================================================
-- 1. Schema Enhancements: Columns, Constraints & Lockouts
-- ============================================================================
-- Patient Link Codes Enhancements
ALTER TABLE patient_link_codes ADD COLUMN IF NOT EXISTS attempts_count integer NOT NULL DEFAULT 0;
ALTER TABLE patient_link_codes ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 5;
ALTER TABLE patient_link_codes ADD COLUMN IF NOT EXISTS account_lockout_until timestamptz;

-- Patient Accounts Enhancements
ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS link_lockout_until timestamptz;
ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS failed_link_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
ALTER TABLE patient_accounts ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Clinics Enhancements
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Staff Invites Enhancements (Allow super_admin / platform invites without pre-existing staff user)
ALTER TABLE staff_invites ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE staff_invites ADD COLUMN IF NOT EXISTS name text;

-- ============================================================================
-- 2. Policies for patient_link_codes, staff_invites & audit_log
-- ============================================================================
-- Staff in the clinic can view and manage link codes for patients in their clinic
DROP POLICY IF EXISTS patient_link_codes_tenant_policy ON patient_link_codes;
CREATE POLICY patient_link_codes_tenant_policy ON patient_link_codes FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

-- Super-admin policy removed from patient_link_codes per least-privilege requirement
DROP POLICY IF EXISTS patient_link_codes_super_admin_policy ON patient_link_codes;

-- staff_invites: Reads visible to clinic staff; writes require app.staff_role = 'owner'; super_admin has full platform access
DROP POLICY IF EXISTS staff_invites_tenant_policy ON staff_invites;
DROP POLICY IF EXISTS staff_invites_select_policy ON staff_invites;
DROP POLICY IF EXISTS staff_invites_insert_policy ON staff_invites;
DROP POLICY IF EXISTS staff_invites_update_policy ON staff_invites;
DROP POLICY IF EXISTS staff_invites_delete_policy ON staff_invites;
DROP POLICY IF EXISTS staff_invites_super_admin_policy ON staff_invites;

CREATE POLICY staff_invites_select_policy ON staff_invites FOR SELECT
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

CREATE POLICY staff_invites_insert_policy ON staff_invites FOR INSERT
  WITH CHECK (
    (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid AND current_setting('app.staff_role', true) = 'owner')
    OR current_setting('app.is_super_admin', true) = 'true'
  );

CREATE POLICY staff_invites_update_policy ON staff_invites FOR UPDATE
  USING (
    (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid AND current_setting('app.staff_role', true) = 'owner')
    OR current_setting('app.is_super_admin', true) = 'true'
  )
  WITH CHECK (
    (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid AND current_setting('app.staff_role', true) = 'owner')
    OR current_setting('app.is_super_admin', true) = 'true'
  );

CREATE POLICY staff_invites_delete_policy ON staff_invites FOR DELETE
  USING (
    (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid AND current_setting('app.staff_role', true) = 'owner')
    OR current_setting('app.is_super_admin', true) = 'true'
  );

CREATE POLICY staff_invites_super_admin_policy ON staff_invites FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

-- audit_log: Direct INSERT requires non-null matching clinic_id. NULL-clinic inserts must use audit_log_system_event.
DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy ON audit_log FOR INSERT
  WITH CHECK (
    clinic_id IS NOT NULL AND clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
  );

-- audit_log: Clinic SELECT is strictly limited to clinic owner (app.staff_role = 'owner')
DROP POLICY IF EXISTS audit_log_tenant_select ON audit_log;
DROP POLICY IF EXISTS audit_log_clinic_select_policy ON audit_log;
CREATE POLICY audit_log_clinic_select_policy ON audit_log FOR SELECT
  USING (
    clinic_id IS NOT NULL
    AND clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
    AND current_setting('app.staff_role', true) = 'owner'
  );

-- audit_log: Super-admin SELECT policy
DROP POLICY IF EXISTS audit_log_super_admin_select ON audit_log;
CREATE POLICY audit_log_super_admin_select ON audit_log FOR SELECT
  USING (
    current_setting('app.is_super_admin', true) = 'true'
  );

-- Patient SELECT policies on clinics, doctors, and services (for linked patient accounts)
DROP POLICY IF EXISTS clinics_patient_select ON clinics;
CREATE POLICY clinics_patient_select ON clinics FOR SELECT
  USING (
    id IN (
      SELECT clinic_id FROM patient_account_links
      WHERE account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS doctors_patient_select ON doctors;
CREATE POLICY doctors_patient_select ON doctors FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM patient_account_links
      WHERE account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid
    )
  );

DROP POLICY IF EXISTS services_patient_select ON services;
CREATE POLICY services_patient_select ON services FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM patient_account_links
      WHERE account_id = NULLIF(current_setting('app.patient_account_id', true), '')::uuid
    )
  );

-- ============================================================================
-- 3. Least-Privilege Grants & Revocations
-- ============================================================================
-- Tokens: NO DIRECT ACCESS for clinicpilot_app. Tokens are handled exclusively via SECURITY DEFINER functions.
REVOKE ALL ON password_reset_tokens FROM clinicpilot_app;
REVOKE ALL ON magic_link_tokens FROM clinicpilot_app;

-- staff_users: Remove direct INSERT and DELETE grants. Creation is only via invite-accept SECURITY DEFINER function.
REVOKE INSERT, DELETE ON staff_users FROM clinicpilot_app;

-- Column-Level SELECT Grants on staff_users: Exclude password_hash
REVOKE SELECT ON staff_users FROM clinicpilot_app;
GRANT SELECT (id, clinic_id, name, email, role, is_active, created_at) ON staff_users TO clinicpilot_app;

-- Column-Level UPDATE on staff_users: role/email/is_active governed by owner check trigger; name by self/owner.
GRANT UPDATE (name, email, is_active, role) ON staff_users TO clinicpilot_app;

-- Column-Level UPDATE Grants on clinics: Exclude privileged columns (plan, is_active, slug, id, created_at)
REVOKE UPDATE ON clinics FROM clinicpilot_app;
GRANT UPDATE (name, city, timezone, updated_at) ON clinics TO clinicpilot_app;

-- patient_accounts: Column-level UPDATE only on profile columns (name, language). Lockout & verification columns require SECURITY DEFINER functions.
REVOKE UPDATE ON patient_accounts FROM clinicpilot_app;
GRANT UPDATE (name, language) ON patient_accounts TO clinicpilot_app;

-- patient_link_codes: Staff get INSERT, SELECT, DELETE only. Expiry & attempts modified exclusively via SECURITY DEFINER function.
REVOKE UPDATE ON patient_link_codes FROM clinicpilot_app;
GRANT SELECT, INSERT, DELETE ON patient_link_codes TO clinicpilot_app;

-- ============================================================================
-- 4. Triggers: Owner Protection, Role Governance & Session Immutability
-- ============================================================================

-- A. Staff User Update & Role Governance Trigger
CREATE OR REPLACE FUNCTION check_staff_user_update_permission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_owners_count bigint;
BEGIN
  -- 1. Protect last active owner from deactivation, demotion, or removal
  IF OLD.role = 'owner' AND OLD.is_active = true THEN
    IF (NEW.is_active = false) OR (NEW.role IS DISTINCT FROM 'owner') THEN
      SELECT count(*) INTO v_active_owners_count
      FROM staff_users
      WHERE clinic_id = OLD.clinic_id
        AND role = 'owner'
        AND is_active = true
        AND id <> OLD.id;

      IF v_active_owners_count = 0 THEN
        RAISE EXCEPTION 'FORBIDDEN: Cannot deactivate or demote the last active clinic owner'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- 2. Modifying email, is_active, or role requires owner context or super_admin
  IF (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.is_active IS DISTINCT FROM OLD.is_active)
     OR (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF NULLIF(current_setting('app.staff_role', true), '') IS DISTINCT FROM 'owner'
       AND COALESCE(current_setting('app.is_super_admin', true), '') <> 'true' THEN
      RAISE EXCEPTION 'FORBIDDEN: Only clinic owners can modify staff role, email, or active status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. Non-owner staff may only update their own display name
  IF NULLIF(current_setting('app.staff_role', true), '') IS DISTINCT FROM 'owner'
     AND COALESCE(current_setting('app.is_super_admin', true), '') <> 'true' THEN
    IF NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
       AND current_setting('app.user_id', true)::uuid <> OLD.id THEN
      RAISE EXCEPTION 'FORBIDDEN: Non-owner staff may only update their own display name'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_role_change ON staff_users;
DROP TRIGGER IF EXISTS trg_enforce_staff_user_update ON staff_users;
CREATE TRIGGER trg_enforce_staff_user_update
  BEFORE UPDATE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION check_staff_user_update_permission();

-- B. Prevent Deleting Last Active Owner Trigger
CREATE OR REPLACE FUNCTION check_staff_user_delete_permission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_owners_count bigint;
BEGIN
  IF OLD.role = 'owner' AND OLD.is_active = true THEN
    SELECT count(*) INTO v_active_owners_count
    FROM staff_users
    WHERE clinic_id = OLD.clinic_id
      AND role = 'owner'
      AND is_active = true
      AND id <> OLD.id;

    IF v_active_owners_count = 0 THEN
      RAISE EXCEPTION 'FORBIDDEN: Cannot delete the last active clinic owner'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_delete ON staff_users;
CREATE TRIGGER trg_prevent_last_owner_delete
  BEFORE DELETE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION check_staff_user_delete_permission();

-- C. Session Immutability Trigger (sessions and patient_sessions)
CREATE OR REPLACE FUNCTION enforce_session_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- revoked_at can be set (from NULL to a timestamp), but once set, can never be cleared (to NULL) or modified
  IF OLD.revoked_at IS NOT NULL THEN
    IF NEW.revoked_at IS NULL OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
      RAISE EXCEPTION 'FORBIDDEN: Session cannot be un-revoked once revoked'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- expires_at can never be extended
  IF NEW.expires_at > OLD.expires_at THEN
    RAISE EXCEPTION 'FORBIDDEN: Session expiry cannot be extended'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_session_immutability ON sessions;
CREATE TRIGGER trg_enforce_staff_session_immutability
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_immutability();

DROP TRIGGER IF EXISTS trg_enforce_patient_session_immutability ON patient_sessions;
CREATE TRIGGER trg_enforce_patient_session_immutability
  BEFORE UPDATE ON patient_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_immutability();

-- ============================================================================
-- 5. SECURITY DEFINER Functions with Context Validation (app.patient_account_id / app.clinic_id)
-- ============================================================================

-- Function 1: Patient-context audit entry
DROP FUNCTION IF EXISTS audit_patient_linked_event(uuid, uuid, text, text, text, text);
CREATE OR REPLACE FUNCTION audit_patient_linked_event(
  p_clinic_id uuid,
  p_account_id uuid,
  p_action text,
  p_resource text,
  p_resource_id text,
  p_details text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_context uuid;
  v_audit_id uuid;
BEGIN
  -- Assert context: Active transaction must be under patient context matching p_account_id
  v_current_context := NULLIF(current_setting('app.patient_account_id', true), '')::uuid;
  IF v_current_context IS NULL OR v_current_context <> p_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Context app.patient_account_id does not match p_account_id %', p_account_id
      USING ERRCODE = '42501';
  END IF;

  -- Assert verified link in patient_account_links
  IF NOT EXISTS (
    SELECT 1 FROM patient_account_links
    WHERE account_id = p_account_id AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Patient account % is not linked to clinic %', p_account_id, p_clinic_id
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO audit_log (
    clinic_id,
    actor_id,
    actor_role,
    action,
    resource,
    resource_id,
    details
  ) VALUES (
    p_clinic_id,
    p_account_id::text,
    'patient',
    p_action,
    p_resource,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION audit_patient_linked_event(uuid, uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_patient_linked_event(uuid, uuid, text, text, text, text) TO clinicpilot_app;

-- Function 2: Link patient account with 8-character code, HMAC pepper, 10-min expiry, max 5 attempts & lockout
DROP FUNCTION IF EXISTS auth_link_patient_account_with_code(uuid, uuid, uuid, text, text);
CREATE OR REPLACE FUNCTION auth_link_patient_account_with_code(
  p_account_id uuid,
  p_clinic_id uuid,
  p_patient_id uuid,
  p_code_hash text,
  p_verified_via text
)
RETURNS TABLE (
  success boolean,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_context uuid;
  v_account patient_accounts%ROWTYPE;
  v_code patient_link_codes%ROWTYPE;
BEGIN
  -- Context verification: Must match active session context (Requirement 5)
  v_current_context := NULLIF(current_setting('app.patient_account_id', true), '')::uuid;
  IF v_current_context IS NULL OR v_current_context <> p_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Context app.patient_account_id does not match p_account_id %', p_account_id
      USING ERRCODE = '42501';
  END IF;

  -- 1. Check account lockout
  SELECT * INTO v_account FROM patient_accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ACCOUNT_NOT_FOUND';
    RETURN;
  END IF;

  IF v_account.link_lockout_until IS NOT NULL AND v_account.link_lockout_until > now() THEN
    RETURN QUERY SELECT false, 'ACCOUNT_LOCKED';
    RETURN;
  END IF;

  -- 2. Lookup active code for this clinic & patient
  SELECT * INTO v_code
  FROM patient_link_codes
  WHERE clinic_id = p_clinic_id
    AND patient_id = p_patient_id
    AND used_at IS NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'CODE_NOT_FOUND';
    RETURN;
  END IF;

  -- 3. Check code expiry (10-minute expiry enforced)
  IF v_code.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'CODE_EXPIRED';
    RETURN;
  END IF;

  -- 4. Check attempts per code (max 5 attempts)
  IF v_code.attempts_count >= v_code.max_attempts THEN
    RETURN QUERY SELECT false, 'MAX_ATTEMPTS_EXCEEDED';
    RETURN;
  END IF;

  -- 5. Compare HMAC code hash
  IF v_code.code_hash <> p_code_hash THEN
    -- Increment attempts on code
    UPDATE patient_link_codes
    SET attempts_count = attempts_count + 1
    WHERE id = v_code.id;

    -- Increment failed attempts on account, lock out for 30 minutes if >= 5
    UPDATE patient_accounts
    SET failed_link_attempts = failed_link_attempts + 1,
        link_lockout_until = CASE
          WHEN failed_link_attempts + 1 >= 5 THEN now() + interval '30 minutes'
          ELSE NULL
        END
    WHERE id = p_account_id;

    RETURN QUERY SELECT false, 'INVALID_CODE';
    RETURN;
  END IF;

  -- Success! Mark code as used
  UPDATE patient_link_codes SET used_at = now() WHERE id = v_code.id;

  -- Reset account failed attempts
  UPDATE patient_accounts
  SET failed_link_attempts = 0,
      link_lockout_until = NULL
  WHERE id = p_account_id;

  -- Link patient account
  INSERT INTO patient_account_links (account_id, clinic_id, patient_id, verified_via)
  VALUES (p_account_id, p_clinic_id, p_patient_id, p_verified_via)
  ON CONFLICT (account_id, clinic_id, patient_id) DO NOTHING;

  RETURN QUERY SELECT true, 'SUCCESS';
END;
$$;

REVOKE ALL ON FUNCTION auth_link_patient_account_with_code(uuid, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_link_patient_account_with_code(uuid, uuid, uuid, text, text) TO clinicpilot_app;

-- Function 3: Register/Login Patient on First Sign-up with Strict Linking Rules
--
-- ============================================================================
-- PATIENT IDENTITY LINKING RULES SPECIFICATION:
-- 1. Identity Match: If provider + provider_subject already exists, return existing account_id.
-- 2. Verified Email Match: If and ONLY IF p_email_verified IS TRUE and p_email IS NOT NULL,
--    match against patient_accounts where lower(email) = lower(p_email).
--    Link this provider identity to the matched account.
-- 3. Never Link by Phone: Even if p_phone matches an existing account, phone is NEVER used
--    for identity linking because phone numbers can be recycled or entered without OTP.
-- 4. Never Link by Unverified Email: If p_email_verified is FALSE or NULL, a separate new
--    patient_accounts row is ALWAYS created to prevent account takeover.
-- 5. Phone Unverified Storage: p_phone is stored with phone_verified_at = NULL.
-- ============================================================================
DROP FUNCTION IF EXISTS auth_register_patient_first_signup(text, text, text, text, text);
DROP FUNCTION IF EXISTS auth_register_patient_first_signup(text, text, text, text, text, boolean);
CREATE OR REPLACE FUNCTION auth_register_patient_first_signup(
  p_provider text,
  p_provider_subject text,
  p_email text,
  p_phone text,
  p_name text,
  p_email_verified boolean DEFAULT true
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
  -- Rule 1: Check existing identity
  SELECT i.account_id INTO v_acc_id
  FROM patient_identities i
  WHERE i.provider = p_provider AND i.provider_subject = p_provider_subject;

  IF FOUND THEN
    RETURN QUERY SELECT v_acc_id, false;
    RETURN;
  END IF;

  -- Rule 2: Link ONLY on identical verified email
  IF p_email_verified IS TRUE AND v_clean_email IS NOT NULL THEN
    SELECT a.id INTO v_acc_id
    FROM patient_accounts a
    WHERE lower(a.email) = v_clean_email;
  END IF;

  -- Rule 3 & 4: If not matched via verified email, create a new separate account
  IF v_acc_id IS NULL THEN
    INSERT INTO patient_accounts (
      name,
      email,
      phone,
      email_verified_at,
      phone_verified_at
    )
    VALUES (
      p_name,
      CASE WHEN p_email_verified IS TRUE THEN v_clean_email ELSE NULL END,
      v_clean_phone,
      CASE WHEN p_email_verified IS TRUE AND v_clean_email IS NOT NULL THEN now() ELSE NULL END,
      NULL -- Phone is always unverified on first social/magic-link signup
    )
    RETURNING id INTO v_acc_id;

    INSERT INTO patient_identities (account_id, provider, provider_subject)
    VALUES (v_acc_id, p_provider, p_provider_subject);

    RETURN QUERY SELECT v_acc_id, true;
  ELSE
    -- Link new identity to verified email account
    INSERT INTO patient_identities (account_id, provider, provider_subject)
    VALUES (v_acc_id, p_provider, p_provider_subject)
    ON CONFLICT (provider, provider_subject) DO NOTHING;

    RETURN QUERY SELECT v_acc_id, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_register_patient_first_signup(text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_register_patient_first_signup(text, text, text, text, text, boolean) TO clinicpilot_app;

-- Function 4: Super-Admin Approval of Clinic Request (Atomic Clinic + Owner Invite + Audit)
DROP FUNCTION IF EXISTS super_admin_approve_clinic_request(uuid, text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS super_admin_approve_clinic_request(uuid, text, text, text, text, timestamptz, text);
CREATE OR REPLACE FUNCTION super_admin_approve_clinic_request(
  p_request_id uuid,
  p_slug text,
  p_invite_email text,
  p_invite_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_short_code text DEFAULT NULL
)
RETURNS TABLE (
  clinic_id uuid,
  invite_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req clinic_requests%ROWTYPE;
  v_clinic_id uuid;
  v_invite_id uuid;
  v_short_code text;
BEGIN
  -- Context verification: Must be super-admin
  IF COALESCE(current_setting('app.is_super_admin', true), '') <> 'true' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Super-admin context required to approve clinic requests'
      USING ERRCODE = '42501';
  END IF;

  -- Lock request for update
  SELECT * INTO v_req FROM clinic_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clinic request % not found', p_request_id USING ERRCODE = 'P0002';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Clinic request % is already %', p_request_id, v_req.status USING ERRCODE = '22000';
  END IF;

  v_short_code := coalesce(
    NULLIF(p_short_code, ''),
    upper(substring(replace(v_req.clinic_name, ' ', ''), 1, 4)) || substring(gen_random_uuid()::text, 1, 4)
  );

  -- 1. Create clinic
  INSERT INTO clinics (name, slug, short_code, city, timezone, plan, is_active)
  VALUES (v_req.clinic_name, p_slug, v_short_code, v_req.city, 'Asia/Kolkata', 'starter', true)
  RETURNING id INTO v_clinic_id;

  -- 2. Create owner invite
  INSERT INTO staff_invites (clinic_id, email, name, role, token_hash, expires_at)
  VALUES (
    v_clinic_id,
    lower(trim(coalesce(p_invite_email, v_req.owner_email))),
    coalesce(p_invite_name, v_req.owner_name),
    'owner',
    p_token_hash,
    p_expires_at
  )
  RETURNING id INTO v_invite_id;

  -- 3. Update request status to approved
  UPDATE clinic_requests
  SET status = 'approved',
      reviewed_at = now()
  WHERE id = p_request_id;

  -- 4. Record audit entry
  INSERT INTO audit_log (
    clinic_id,
    actor_id,
    actor_role,
    action,
    resource,
    resource_id,
    details
  ) VALUES (
    v_clinic_id,
    'super_admin',
    'super_admin',
    'approve_clinic_request',
    'clinic_requests',
    p_request_id::text,
    jsonb_build_object(
      'approved_clinic_id', v_clinic_id,
      'invite_id', v_invite_id,
      'clinic_name', v_req.clinic_name
    )::text
  );

  RETURN QUERY SELECT v_clinic_id, v_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION super_admin_approve_clinic_request(uuid, text, text, text, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION super_admin_approve_clinic_request(uuid, text, text, text, text, timestamptz, text) TO clinicpilot_app;

-- Super-admin platform metrics: returns aggregated counts ONLY (no direct access to clinical tables)
-- Hardened with null-safe super-admin context verification
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
  IF COALESCE(current_setting('app.is_super_admin', true), '') <> 'true' THEN
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

-- Function 4: System & Pre-login Audit Event Logging (NULL clinic_id inserts via allowlist)
DROP FUNCTION IF EXISTS audit_log_system_event(text, text, text, text, text, text);
CREATE OR REPLACE FUNCTION audit_log_system_event(
  p_actor_id text,
  p_actor_role text,
  p_action text,
  p_resource text,
  p_resource_id text,
  p_details text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Strict allowlist: Action must begin with 'super_admin:', 'auth:', or 'system:'
  IF p_action !~ '^(super_admin:|auth:|system:)[a-zA-Z0-9_:-]+$' THEN
    RAISE EXCEPTION 'FORBIDDEN: Action % is not in the system audit action allowlist', p_action
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO audit_log (
    clinic_id,
    actor_id,
    actor_role,
    action,
    resource,
    resource_id,
    details
  ) VALUES (
    NULL,
    p_actor_id,
    p_actor_role,
    p_action,
    p_resource,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION audit_log_system_event(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION audit_log_system_event(text, text, text, text, text, text) TO clinicpilot_app;

-- Function 5: Atomic Staff Invite Acceptance & User Creation
DROP FUNCTION IF EXISTS auth_accept_staff_invite(text, text, text);
CREATE OR REPLACE FUNCTION auth_accept_staff_invite(
  p_token_hash text,
  p_name text,
  p_password_hash text
)
RETURNS TABLE (
  user_id uuid,
  clinic_id uuid,
  name text,
  email text,
  role text,
  success boolean,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite staff_invites%ROWTYPE;
  v_user_id uuid;
  v_name text;
BEGIN
  SELECT * INTO v_invite
  FROM staff_invites
  WHERE token_hash = p_token_hash AND used_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, false, 'INVALID_OR_EXPIRED_INVITE';
    RETURN;
  END IF;

  v_name := coalesce(NULLIF(trim(p_name), ''), v_invite.name, 'Staff Member');

  UPDATE staff_invites SET used_at = now() WHERE id = v_invite.id;

  INSERT INTO staff_users (clinic_id, name, email, role, password_hash, is_active)
  VALUES (v_invite.clinic_id, v_name, lower(trim(v_invite.email)), v_invite.role, p_password_hash, true)
  RETURNING id INTO v_user_id;

  RETURN QUERY SELECT v_user_id, v_invite.clinic_id, v_name, lower(trim(v_invite.email)), v_invite.role, true, 'SUCCESS';
END;
$$;

REVOKE ALL ON FUNCTION auth_accept_staff_invite(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_accept_staff_invite(text, text, text) TO clinicpilot_app;

-- Function 6: Password Reset Token Consumption with Immediate Session Revocation
DROP FUNCTION IF EXISTS auth_consume_password_reset_token(text);
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
    -- Revoke all active sessions of this user in the same transaction (Requirement 7)
    UPDATE sessions SET revoked_at = now() WHERE user_id = v_rec.user_id AND revoked_at IS NULL;
    SELECT clinic_id INTO v_clinic_id FROM staff_users WHERE id = v_rec.user_id;
    RETURN QUERY SELECT v_rec.user_id, v_clinic_id, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_consume_password_reset_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_consume_password_reset_token(text) TO clinicpilot_app;

-- Function 7: Staff Lookup by Email with System Clinic Login Guard & Consistent Timing Equalization
DROP FUNCTION IF EXISTS auth_lookup_staff_by_email(text);
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
  v_is_system boolean;
  v_dummy_hash text;
BEGIN
  SELECT * INTO v_user
  FROM staff_users
  WHERE lower(staff_users.email) = lower(p_email)
  LIMIT 1;

  IF FOUND THEN
    -- Check/guard: Platform system clinic cannot be used for staff login (Requirement 8)
    SELECT coalesce(is_system, false) OR (slug = 'system-platform')
    INTO v_is_system
    FROM clinics
    WHERE id = v_user.clinic_id;

    IF v_is_system THEN
      RAISE EXCEPTION 'FORBIDDEN: Platform system clinic accounts cannot be used for staff login'
        USING ERRCODE = '42501';
    END IF;

    -- Equalize timing: calculate crypt in the same layer on hit
    v_dummy_hash := crypt('timing_equalizer_real_user', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');

    RETURN QUERY SELECT v_user.id, v_user.clinic_id, v_user.name, v_user.email, v_user.role, v_user.password_hash, v_user.is_active;
  ELSE
    -- Constant timing dummy bcrypt calculation in the exact same layer on miss
    v_dummy_hash := crypt('dummy_password_timing_defense', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_lookup_staff_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_lookup_staff_by_email(text) TO clinicpilot_app;

-- Function 8: Staff Credentials Verification in Database Layer (Consistent Timing & System Guard)
DROP FUNCTION IF EXISTS auth_verify_staff_credentials(text, text);
CREATE OR REPLACE FUNCTION auth_verify_staff_credentials(p_email text, p_password text)
RETURNS TABLE (
  user_id uuid,
  clinic_id uuid,
  name text,
  email text,
  role text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user staff_users%ROWTYPE;
  v_is_system boolean;
  v_match boolean;
  c_dummy_hash CONSTANT text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
  SELECT * INTO v_user
  FROM staff_users
  WHERE lower(staff_users.email) = lower(p_email)
  LIMIT 1;

  IF FOUND THEN
    SELECT coalesce(is_system, false) OR (slug = 'system-platform')
    INTO v_is_system
    FROM clinics
    WHERE id = v_user.clinic_id;

    IF v_is_system THEN
      RAISE EXCEPTION 'FORBIDDEN: Platform system clinic accounts cannot be used for staff login'
        USING ERRCODE = '42501';
    END IF;

    v_match := (v_user.password_hash = crypt(p_password, v_user.password_hash));
    IF v_match AND v_user.is_active THEN
      RETURN QUERY SELECT v_user.id, v_user.clinic_id, v_user.name, v_user.email, v_user.role, true;
    ELSE
      RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, false;
    END IF;
  ELSE
    -- Dummy crypt in the exact same layer
    PERFORM (c_dummy_hash = crypt(p_password, c_dummy_hash));
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::text, NULL::text, false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth_verify_staff_credentials(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_verify_staff_credentials(text, text) TO clinicpilot_app;

-- ============================================================================
-- 6. M7 Patient Write Functions Signatures (SECURITY DEFINER with Slot & Rule Re-checks)
-- ============================================================================
-- Signature 1: Book appointment
DROP FUNCTION IF EXISTS patient_book_appointment(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION patient_book_appointment(
  p_account_id uuid,
  p_clinic_id uuid,
  p_patient_id uuid,
  p_doctor_id uuid,
  p_service_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Context verification
  IF NULLIF(current_setting('app.patient_account_id', true), '')::uuid IS DISTINCT FROM p_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Context app.patient_account_id does not match p_account_id' USING ERRCODE = '42501';
  END IF;

  -- Verified link verification
  IF NOT EXISTS (
    SELECT 1 FROM patient_account_links
    WHERE account_id = p_account_id AND clinic_id = p_clinic_id AND patient_id = p_patient_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: Patient account is not linked to patient record at this clinic' USING ERRCODE = '42501';
  END IF;

  RAISE EXCEPTION 'FEATURE_PLANNED_M7: patient_book_appointment is scheduled for Milestone 7 release' USING ERRCODE = '0A000';
END;
$$;

-- Signature 2: Cancel appointment
DROP FUNCTION IF EXISTS patient_cancel_appointment(uuid, uuid, uuid, text);
CREATE OR REPLACE FUNCTION patient_cancel_appointment(
  p_account_id uuid,
  p_clinic_id uuid,
  p_appointment_id uuid,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Context verification
  IF NULLIF(current_setting('app.patient_account_id', true), '')::uuid IS DISTINCT FROM p_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Context app.patient_account_id does not match p_account_id' USING ERRCODE = '42501';
  END IF;

  RAISE EXCEPTION 'FEATURE_PLANNED_M7: patient_cancel_appointment is scheduled for Milestone 7 release' USING ERRCODE = '0A000';
END;
$$;

-- Signature 3: Reschedule appointment
DROP FUNCTION IF EXISTS patient_reschedule_appointment(uuid, uuid, uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION patient_reschedule_appointment(
  p_account_id uuid,
  p_clinic_id uuid,
  p_appointment_id uuid,
  p_new_start_time timestamptz,
  p_new_end_time timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Context verification
  IF NULLIF(current_setting('app.patient_account_id', true), '')::uuid IS DISTINCT FROM p_account_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Context app.patient_account_id does not match p_account_id' USING ERRCODE = '42501';
  END IF;

  RAISE EXCEPTION 'FEATURE_PLANNED_M7: patient_reschedule_appointment is scheduled for Milestone 7 release' USING ERRCODE = '0A000';
END;
$$;

REVOKE ALL ON FUNCTION patient_book_appointment(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION patient_book_appointment(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz) TO clinicpilot_app;

REVOKE ALL ON FUNCTION patient_cancel_appointment(uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION patient_cancel_appointment(uuid, uuid, uuid, text) TO clinicpilot_app;

REVOKE ALL ON FUNCTION patient_reschedule_appointment(uuid, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION patient_reschedule_appointment(uuid, uuid, uuid, timestamptz, timestamptz) TO clinicpilot_app;
