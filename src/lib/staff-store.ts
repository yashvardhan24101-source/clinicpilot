import bcrypt from "bcryptjs";
import { UserRole } from "@/types/auth";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic_id: string;
  clinic_name: string;
  password_hash: string;
}

// Pre-hashed bcrypt string for default password: "demo123" (salt rounds: 10)
const DEMO_PASSWORD_HASH = bcrypt.hashSync("demo123", 10);

// Seeded staff accounts for Demo Mode
export const DEMO_STAFF: StaffUser[] = [
  // Clinic 1: SmileCraft Dental
  {
    id: "usr-owner-1",
    name: "Dr. Vikram Patel",
    email: "owner@smilecraft.in",
    role: "owner",
    clinic_id: "cln-1",
    clinic_name: "SmileCraft Dental Clinic",
    password_hash: DEMO_PASSWORD_HASH,
  },
  {
    id: "usr-reception-1",
    name: "Priya Sharma (Reception)",
    email: "reception@smilecraft.in",
    role: "receptionist",
    clinic_id: "cln-1",
    clinic_name: "SmileCraft Dental Clinic",
    password_hash: DEMO_PASSWORD_HASH,
  },
  {
    id: "usr-doctor-1",
    name: "Dr. Ananya Sharma",
    email: "doctor@smilecraft.in",
    role: "doctor",
    clinic_id: "cln-1",
    clinic_name: "SmileCraft Dental Clinic",
    password_hash: DEMO_PASSWORD_HASH,
  },
  // Super Admin (Platform Founder Only)
  {
    id: "usr-admin-1",
    name: "Platform SuperAdmin",
    email: "admin@clinicpilot.io",
    role: "super_admin",
    clinic_id: "cln-system",
    clinic_name: "ClinicPilot Platform",
    password_hash: DEMO_PASSWORD_HASH,
  },
  // Clinic 2: Apex Diagnostics (for multi-tenant cross-clinic isolation tests)
  {
    id: "usr-apex-owner-2",
    name: "Dr. Rajesh Iyer",
    email: "owner@apex.in",
    role: "owner",
    clinic_id: "cln-2",
    clinic_name: "Apex Diagnostics Hub",
    password_hash: DEMO_PASSWORD_HASH,
  },
  {
    id: "usr-apex-reception-2",
    name: "Neha Gupta (Apex Reception)",
    email: "reception@apex.in",
    role: "receptionist",
    clinic_id: "cln-2",
    clinic_name: "Apex Diagnostics Hub",
    password_hash: DEMO_PASSWORD_HASH,
  },
];

// Runtime registered staff users
declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_registered_staff__: StaffUser[] | undefined;
}

const registeredStaff: StaffUser[] =
  global.__clinicpilot_registered_staff__ ||
  (global.__clinicpilot_registered_staff__ = []);

/**
 * Get active staff list based on environment.
 * Per Security Rule A.2.1: Seeded demo staff & demo123 password are ONLY available when DEMO_MODE=true.
 * In production (DEMO_MODE=false), only bootstrap owner or registered staff exist.
 */
export function getStaffList(): StaffUser[] {
  const isDemo = process.env.DEMO_MODE === "true";
  const staff: StaffUser[] = isDemo ? [...DEMO_STAFF] : [];

  // Production Bootstrap Owner (configured via environment variables)
  const bootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const bootstrapPassHash = process.env.BOOTSTRAP_OWNER_PASSWORD_HASH?.trim();

  if (bootstrapEmail && bootstrapPassHash) {
    const existing = staff.find((s) => s.email.toLowerCase() === bootstrapEmail);
    if (!existing) {
      staff.push({
        id: "usr-bootstrap-owner",
        name: process.env.BOOTSTRAP_OWNER_NAME || "Clinic Owner",
        email: bootstrapEmail,
        role: "owner",
        clinic_id: process.env.BOOTSTRAP_CLINIC_ID || "cln-prod-1",
        clinic_name: process.env.BOOTSTRAP_CLINIC_NAME || "ClinicPilot Clinic",
        password_hash: bootstrapPassHash,
      });
    }
  }

  // Include runtime registered staff
  for (const r of registeredStaff) {
    if (!staff.some((s) => s.email.toLowerCase() === r.email.toLowerCase())) {
      staff.push(r);
    }
  }

  return staff;
}

/**
 * Find staff member by email (case-insensitive)
 */
export function findStaffByEmail(email: string): StaffUser | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const staff = getStaffList();
  return staff.find((s) => s.email.toLowerCase() === normalized) || null;
}

/**
 * Register a new staff member at runtime (used for owner creating staff)
 */
export function registerStaffUser(user: StaffUser): void {
  const existingIdx = registeredStaff.findIndex(
    (s) => s.email.toLowerCase() === user.email.toLowerCase()
  );
  if (existingIdx >= 0) {
    registeredStaff[existingIdx] = user;
  } else {
    registeredStaff.push(user);
  }
}

/**
 * Verify staff password against bcrypt hash
 */
export async function verifyStaffPassword(
  staff: StaffUser,
  passwordAttempt: string
): Promise<boolean> {
  if (!staff || !passwordAttempt) return false;
  return await bcrypt.compare(passwordAttempt, staff.password_hash);
}
