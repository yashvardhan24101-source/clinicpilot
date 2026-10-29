import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// --- 1. Clinics ---
export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    short_code: text("short_code").notNull().unique(),
    city: text("city").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("clinics_slug_idx").on(table.slug),
    uniqueIndex("clinics_short_code_idx").on(table.short_code),
  ]
);

// --- 2. Staff Users ---
export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(), // 'owner' | 'receptionist' | 'doctor' | 'super_admin'
    password_hash: text("password_hash").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staff_users_clinic_id_idx").on(table.clinic_id),
    uniqueIndex("staff_users_email_idx").on(table.email),
  ]
);

// --- 3. Doctors ---
export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    specialty: text("specialty").notNull(),
    qualifications: text("qualifications"),
    experience_years: integer("experience_years").default(0),
    consultation_fee: integer("consultation_fee").default(0),
    video_fee: integer("video_fee").default(0),
    color_tag: text("color_tag").notNull().default("#3B82F6"),
    active: boolean("active").notNull().default(true),
    phone: text("phone"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("doctors_clinic_id_idx").on(table.clinic_id)]
);

// --- 4. Services ---
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    duration_minutes: integer("duration_minutes").notNull().default(15),
    price: integer("price").notNull().default(0),
    category: text("category").notNull().default("general"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("services_clinic_id_idx").on(table.clinic_id)]
);

// --- 5. Doctor Working Hours ---
export const doctorWorkingHours = pgTable(
  "doctor_working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    doctor_id: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    day_of_week: integer("day_of_week").notNull(), // 0=Sun, 1=Mon, ..., 6=Sat
    start_time: text("start_time").notNull(), // "09:00"
    end_time: text("end_time").notNull(), // "17:00"
    slot_duration_minutes: integer("slot_duration_minutes").notNull().default(15),
  },
  (table) => [
    index("doctor_working_hours_clinic_id_idx").on(table.clinic_id),
    index("doctor_working_hours_doctor_id_idx").on(table.doctor_id),
  ]
);

// --- 6. Doctor Time Off ---
export const doctorTimeOff = pgTable(
  "doctor_time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    doctor_id: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    start_time: timestamp("start_time", { withTimezone: true }).notNull(),
    end_time: timestamp("end_time", { withTimezone: true }).notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("doctor_time_off_clinic_id_idx").on(table.clinic_id),
    index("doctor_time_off_doctor_id_idx").on(table.doctor_id),
  ]
);

// --- 7. Patients (Clinic-scoped walk-in and registered patient records) ---
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // E.164 (+91...)
    language: text("language").notNull().default("en"), // 'en' | 'hi' | 'hinglish'
    total_visits: integer("total_visits").notNull().default(0),
    last_visit: timestamp("last_visit", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("patients_clinic_id_idx").on(table.clinic_id),
    uniqueIndex("patients_clinic_phone_idx").on(table.clinic_id, table.phone),
  ]
);

// --- 8. Consents ---
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
    account_id: uuid("account_id"), // for patient portal account level consents
    family_member_id: uuid("family_member_id"),
    consent_type: text("consent_type").notNull(), // 'whatsapp_reminders' | 'marketing' | 'guardian_representation'
    granted: boolean("granted").notNull().default(true),
    consent_text_version: text("consent_text_version").notNull().default("v1.0"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("consents_clinic_id_idx").on(table.clinic_id),
    index("consents_patient_id_idx").on(table.patient_id),
  ]
);

// --- 9. Appointments ---
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctor_id: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    service_id: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    scheduled_start: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    scheduled_end: timestamp("scheduled_end", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("booked"), // 'booked' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled'
    source: text("source").notNull().default("walkin"), // 'whatsapp' | 'walkin' | 'call' | 'online'
    notes: text("notes"),
    token_number: integer("token_number"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("appointments_clinic_id_idx").on(table.clinic_id),
    index("appointments_patient_id_idx").on(table.patient_id),
    index("appointments_doctor_id_idx").on(table.doctor_id),
    index("appointments_start_idx").on(table.scheduled_start),
  ]
);

// --- 10. Conversations ---
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("bot_handling"), // 'needs_staff' | 'bot_handling' | 'resolved'
    last_message: text("last_message"),
    last_message_time: timestamp("last_message_time", { withTimezone: true }).defaultNow(),
    unread_count: integer("unread_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversations_clinic_id_idx").on(table.clinic_id),
    index("conversations_patient_id_idx").on(table.patient_id),
  ]
);

// --- 11. Messages ---
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    conversation_id: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sender: text("sender").notNull(), // 'patient' | 'bot' | 'staff'
    content: text("content").notNull(),
    delivery_status: text("delivery_status").notNull().default("sent"), // 'sent' | 'delivered' | 'read' | 'failed'
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("messages_clinic_id_idx").on(table.clinic_id),
    index("messages_conversation_id_idx").on(table.conversation_id),
  ]
);

// --- 12. Follow-Up Rules ---
export const followupRules = pgTable(
  "followup_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    service_id: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
    delay_days: integer("delay_days").notNull().default(7),
    template_text: text("template_text").notNull(),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("followup_rules_clinic_id_idx").on(table.clinic_id)]
);

// --- 13. Follow-Ups ---
export const followups = pgTable(
  "followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    service_id: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    last_visit_date: date("last_visit_date").notNull(),
    due_date: date("due_date").notNull(),
    status: text("status").notNull().default("due"), // 'due' | 'sent' | 'snoozed'
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("followups_clinic_id_idx").on(table.clinic_id),
    index("followups_patient_id_idx").on(table.patient_id),
  ]
);

// --- 14. Reports ---
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(), // 'x_ray' | 'blood_test' | 'scan' | 'prescription'
    file_name: text("file_name").notNull(),
    file_size_bytes: integer("file_size_bytes").notNull().default(0),
    storage_path: text("storage_path").notNull(),
    patient_dob: date("patient_dob"),
    dob_lock_until: timestamp("dob_lock_until", { withTimezone: true }),
    dob_failed_attempts: integer("dob_failed_attempts").notNull().default(0),
    uploaded_at: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reports_clinic_id_idx").on(table.clinic_id),
    index("reports_patient_id_idx").on(table.patient_id),
  ]
);

// --- 15. Audit Log (Append-only) ---
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
    actor_id: text("actor_id").notNull(),
    actor_role: text("actor_role").notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resource_id: text("resource_id"),
    details: text("details"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_clinic_id_idx").on(table.clinic_id),
    index("audit_log_created_at_idx").on(table.created_at),
  ]
);

// --- 16. Staff Sessions ---
export const sessions = pgTable(
  "sessions",
  {
    jti: uuid("jti").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.user_id),
    index("sessions_clinic_id_idx").on(table.clinic_id),
  ]
);

// --- 17. Staff Invites ---
export const staffInvites = pgTable(
  "staff_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    token_hash: text("token_hash").notNull().unique(),
    created_by: uuid("created_by")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    used_at: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [index("staff_invites_clinic_id_idx").on(table.clinic_id)]
);

// --- 18. Password Reset Tokens ---
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    token_hash: text("token_hash").notNull().unique(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    used_at: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [index("password_reset_tokens_user_id_idx").on(table.user_id)]
);

// --- 19. Clinic Registration Requests ---
export const clinicRequests = pgTable("clinic_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinic_name: text("clinic_name").notNull(),
  city: text("city").notNull(),
  owner_name: text("owner_name").notNull(),
  owner_email: text("owner_email").notNull(),
  owner_phone: text("owner_phone").notNull(),
  registration_number: text("registration_number"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  review_notes: text("review_notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
});
