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

-- Super-admin platform policy for patient_link_codes
DROP POLICY IF EXISTS patient_link_codes_super_admin_policy ON patient_link_codes;
CREATE POLICY patient_link_codes_super_admin_policy ON patient_link_codes FOR ALL
  USING (current_setting('app.is_super_admin', true) = 'true');

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

-- audit_log: INSERT policy allowing clinic_id IS NULL, matching clinic_id, or super_admin
DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy ON audit_log FOR INSERT
  WITH CHECK (
    clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
    OR clinic_id IS NULL
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- ============================================================================
-- 3. Least-Privilege Grants & Revocations
-- ============================================================================
-- Tokens: NO DIRECT ACCESS for clinicpilot_app. Tokens are handled exclusively via SECURITY DEFINER functions.
REVOKE ALL ON password_reset_tokens FROM clinicpilot_app;
REVOKE ALL ON magic_link_tokens FROM clinicpilot_app;

-- Column-Level SELECT Grants on staff_users: Exclude password_hash
-- Table-level SELECT is revoked; only permitted non-secret columns are granted.
REVOKE SELECT ON staff_users FROM clinicpilot_app;
GRANT SELECT (id, clinic_id, name, email, role, is_active, created_at) ON staff_users TO clinicpilot_app;

-- Column-Level UPDATE Grants on clinics: Exclude privileged columns (plan, is_active, slug, id, created_at)
REVOKE UPDATE ON clinics FROM clinicpilot_app;
GRANT UPDATE (name, city, timezone, updated_at) ON clinics TO clinicpilot_app;

-- Ensure clinicpilot_app has access to patient_link_codes for staff generation
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_link_codes TO clinicpilot_app;

-- staff_users: Grant column-level UPDATE on role, but enforce at policy/trigger level that role changes require 'owner'
GRANT UPDATE (role) ON staff_users TO clinicpilot_app;

CREATE OR REPLACE FUNCTION check_staff_role_change_permission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NULLIF(current_setting('app.staff_role', true), '') IS DISTINCT FROM 'owner'
       AND current_setting('app.is_super_admin', true) <> 'true' THEN
      RAISE EXCEPTION 'FORBIDDEN: Only clinic owners can modify staff roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_role_change ON staff_users;
CREATE TRIGGER trg_enforce_staff_role_change
  BEFORE UPDATE ON staff_users
  FOR EACH ROW
  EXECUTE FUNCTION check_staff_role_change_permission();

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
  IF current_setting('app.is_super_admin', true) <> 'true' THEN
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
