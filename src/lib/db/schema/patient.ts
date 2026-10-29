import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { clinics, patients } from "./clinic";

// --- 20. Patient Accounts ---
export const patientAccounts = pgTable(
  "patient_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    phone: text("phone"),
    name: text("name").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("patient_accounts_email_idx").on(table.email)]
);

// --- 21. Patient Identities (OIDC / OAuth / Magic link identities) ---
export const patientIdentities = pgTable(
  "patient_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => patientAccounts.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'google' | 'email_magic_link'
    provider_subject: text("provider_subject").notNull(), // Google sub or verified email
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("patient_identities_provider_sub_idx").on(
      table.provider,
      table.provider_subject
    ),
    index("patient_identities_account_id_idx").on(table.account_id),
  ]
);

// --- 22. Patient Account Links (Links patient account to clinic-scoped patient record) ---
export const patientAccountLinks = pgTable(
  "patient_account_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => patientAccounts.id, { onDelete: "cascade" }),
    clinic_id: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patient_id: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    verified_via: text("verified_via").notNull(), // 'phone_otp' | 'staff_code' | 'direct_booking'
    linked_at: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("patient_account_links_acc_clinic_pat_idx").on(
      table.account_id,
      table.clinic_id,
      table.patient_id
    ),
    index("patient_account_links_account_id_idx").on(table.account_id),
    index("patient_account_links_clinic_id_idx").on(table.clinic_id),
    index("patient_account_links_patient_id_idx").on(table.patient_id),
  ]
);

// --- 23. Patient Sessions ---
export const patientSessions = pgTable(
  "patient_sessions",
  {
    jti: uuid("jti").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => patientAccounts.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("patient_sessions_account_id_idx").on(table.account_id)]
);

// --- 24. Family Members ---
export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guardian_account_id: uuid("guardian_account_id")
      .notNull()
      .references(() => patientAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(),
    dob: date("dob"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("family_members_guardian_account_id_idx").on(table.guardian_account_id)]
);

// --- 25. Magic Link Tokens ---
export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    token_hash: text("token_hash").notNull().unique(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    used_at: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [index("magic_link_tokens_email_idx").on(table.email)]
);
