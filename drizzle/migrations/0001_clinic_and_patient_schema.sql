-- 0001_clinic_and_patient_schema.sql

-- 1. Clinics
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_code text NOT NULL UNIQUE,
  city text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Staff Users
CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'receptionist', 'doctor', 'super_admin')),
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_users_clinic_id_idx ON staff_users(clinic_id);
-- Case-insensitive global uniqueness for staff emails
CREATE UNIQUE INDEX IF NOT EXISTS staff_users_lower_email_idx ON staff_users (lower(email));

-- 3. Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text NOT NULL,
  qualifications text,
  experience_years integer DEFAULT 0,
  consultation_fee integer DEFAULT 0,
  video_fee integer DEFAULT 0,
  color_tag text NOT NULL DEFAULT '#3B82F6',
  active boolean NOT NULL DEFAULT true,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doctors_clinic_id_idx ON doctors(clinic_id);

-- 4. Services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 15,
  price integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_clinic_id_idx ON services(clinic_id);

-- 5. Doctor Working Hours
CREATE TABLE IF NOT EXISTS doctor_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 15
);

CREATE INDEX IF NOT EXISTS doctor_working_hours_clinic_id_idx ON doctor_working_hours(clinic_id);
CREATE INDEX IF NOT EXISTS doctor_working_hours_doctor_id_idx ON doctor_working_hours(doctor_id);

-- 6. Doctor Time Off
CREATE TABLE IF NOT EXISTS doctor_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text
);

CREATE INDEX IF NOT EXISTS doctor_time_off_clinic_id_idx ON doctor_time_off(clinic_id);
CREATE INDEX IF NOT EXISTS doctor_time_off_doctor_id_idx ON doctor_time_off(doctor_id);

-- 7. Patients (Clinic-scoped records)
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'hinglish')),
  total_visits integer NOT NULL DEFAULT 0,
  last_visit timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patients_clinic_id_idx ON patients(clinic_id);
-- Phone numbers are unique within each clinic
CREATE UNIQUE INDEX IF NOT EXISTS patients_clinic_phone_idx ON patients(clinic_id, phone);

-- 8. Consents
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  account_id uuid,
  family_member_id uuid,
  consent_type text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  consent_text_version text NOT NULL DEFAULT 'v1.0',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consents_clinic_id_idx ON consents(clinic_id);
CREATE INDEX IF NOT EXISTS consents_patient_id_idx ON consents(patient_id);
CREATE INDEX IF NOT EXISTS consents_account_id_idx ON consents(account_id);

-- 9. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled')),
  source text NOT NULL DEFAULT 'walkin' CHECK (source IN ('whatsapp', 'walkin', 'call', 'online')),
  notes text,
  token_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_clinic_id_idx ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_doctor_id_idx ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS appointments_start_idx ON appointments(scheduled_start);

-- Positive-list GiST Exclusion Constraint: Blocks overlapping appointments for the same doctor
-- Half-open range '[)' allows back-to-back appointments (e.g. 10:00-10:15 and 10:15-10:30)
ALTER TABLE appointments ADD CONSTRAINT no_overlapping_doctor_appointments 
EXCLUDE USING gist (
  doctor_id WITH =,
  tstzrange(scheduled_start, scheduled_end, '[)') WITH &&
) WHERE (status IN ('booked', 'confirmed', 'arrived'));

-- 10. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'bot_handling' CHECK (state IN ('needs_staff', 'bot_handling', 'resolved')),
  last_message text,
  last_message_time timestamptz DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_clinic_id_idx ON conversations(clinic_id);
CREATE INDEX IF NOT EXISTS conversations_patient_id_idx ON conversations(patient_id);

-- 11. Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('patient', 'bot', 'staff')),
  content text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_clinic_id_idx ON messages(clinic_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);

-- 12. Follow-Up Rules
CREATE TABLE IF NOT EXISTS followup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  delay_days integer NOT NULL DEFAULT 7,
  template_text text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS followup_rules_clinic_id_idx ON followup_rules(clinic_id);

-- 13. Follow-Ups
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  last_visit_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'sent', 'snoozed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS followups_clinic_id_idx ON followups(clinic_id);
CREATE INDEX IF NOT EXISTS followups_patient_id_idx ON followups(patient_id);

-- 14. Reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('x_ray', 'blood_test', 'scan', 'prescription')),
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  patient_dob date,
  dob_lock_until timestamptz,
  dob_failed_attempts integer NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_clinic_id_idx ON reports(clinic_id);
CREATE INDEX IF NOT EXISTS reports_patient_id_idx ON reports(patient_id);

-- 15. Audit Log (Append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_clinic_id_idx ON audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- 16. Staff Sessions
CREATE TABLE IF NOT EXISTS sessions (
  jti uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_clinic_id_idx ON sessions(clinic_id);

-- 17. Staff Invites
CREATE TABLE IF NOT EXISTS staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'receptionist', 'doctor', 'super_admin')),
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS staff_invites_clinic_id_idx ON staff_invites(clinic_id);

-- 18. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

-- 19. Clinic Requests
CREATE TABLE IF NOT EXISTS clinic_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL,
  city text NOT NULL,
  owner_name text NOT NULL,
  owner_email text NOT NULL,
  owner_phone text NOT NULL,
  registration_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- 20. Patient Accounts
CREATE TABLE IF NOT EXISTS patient_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. Patient Identities
CREATE TABLE IF NOT EXISTS patient_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'email_magic_link')),
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_identities_provider_sub_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS patient_identities_account_id_idx ON patient_identities(account_id);

-- 22. Patient Account Links
CREATE TABLE IF NOT EXISTS patient_account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  verified_via text NOT NULL CHECK (verified_via IN ('phone_otp', 'staff_code', 'direct_booking')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_account_links_unique UNIQUE (account_id, clinic_id, patient_id)
);

CREATE INDEX IF NOT EXISTS patient_account_links_account_id_idx ON patient_account_links(account_id);
CREATE INDEX IF NOT EXISTS patient_account_links_clinic_id_idx ON patient_account_links(clinic_id);
CREATE INDEX IF NOT EXISTS patient_account_links_patient_id_idx ON patient_account_links(patient_id);

-- 23. Patient Sessions
CREATE TABLE IF NOT EXISTS patient_sessions (
  jti uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS patient_sessions_account_id_idx ON patient_sessions(account_id);

-- 24. Family Members
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_account_id uuid NOT NULL REFERENCES patient_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  dob date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_members_guardian_account_id_idx ON family_members(guardian_account_id);

-- 25. Magic Link Tokens
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens(email);
