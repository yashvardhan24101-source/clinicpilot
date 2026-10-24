import { UserRole } from "@/types/auth";

export interface RolePermissions {
  allowedPaths: string[];
  deniedPaths: string[];
  canAccessBilling: boolean;
  canAccessAdmin: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    allowedPaths: [
      "/admin",
      "/billing",
      "/today",
      "/calendar",
      "/appointments",
      "/inbox",
      "/patients",
      "/followups",
      "/reports",
      "/more",
      "/doctor",
    ],
    deniedPaths: [],
    canAccessBilling: true,
    canAccessAdmin: true,
  },
  owner: {
    allowedPaths: [
      "/billing",
      "/today",
      "/calendar",
      "/appointments",
      "/inbox",
      "/patients",
      "/followups",
      "/reports",
      "/more",
      "/doctor",
    ],
    deniedPaths: ["/admin"],
    canAccessBilling: true,
    canAccessAdmin: false,
  },
  receptionist: {
    allowedPaths: [
      "/today",
      "/calendar",
      "/appointments",
      "/inbox",
      "/patients",
      "/followups",
      "/reports",
      "/more",
    ],
    deniedPaths: ["/admin", "/billing", "/doctor"],
    canAccessBilling: false,
    canAccessAdmin: false,
  },
  doctor: {
    allowedPaths: [
      "/today",
      "/calendar",
      "/doctor",
      "/patients",
      "/reports",
      "/more",
    ],
    deniedPaths: ["/admin", "/billing", "/inbox"],
    canAccessBilling: false,
    canAccessAdmin: false,
  },
};

/**
 * Checks whether a given role is permitted to access a specific page pathname.
 */
export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Check explicit denied prefixes
  for (const denied of permissions.deniedPaths) {
    if (pathname === denied || pathname.startsWith(`${denied}/`)) {
      return false;
    }
  }

  // Check explicit allowed prefixes
  for (const allowed of permissions.allowedPaths) {
    if (pathname === allowed || pathname.startsWith(`${allowed}/`)) {
      return true;
    }
  }

  return false;
}

export interface ApiPermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Enforces per-route, per-method RBAC permission matrix on API endpoints.
 * Requirement 4:
 * - Doctors: see only own appointments, read-only on patients (no POST/DELETE), no billing, no admin.
 * - Receptionists: cannot access billing, admin, or staff management.
 * - Owners: full clinic operations + billing + staff; cannot access super admin.
 * - Super admin: platform-wide access.
 */
export function isApiAllowed(
  role: UserRole,
  pathname: string,
  method: string
): ApiPermissionResult {
  const normMethod = method.toUpperCase();

  // 1. Super admin has unrestricted access to all endpoints
  if (role === "super_admin") {
    return { allowed: true };
  }

  // 2. Platform admin area is strictly reserved for super_admin
  if (pathname.startsWith("/api/admin")) {
    return {
      allowed: false,
      reason: "Forbidden: Super Admin access required",
    };
  }

  // 3. Billing & subscription area is restricted to clinic owner and super_admin
  if (pathname.startsWith("/api/billing")) {
    if (role !== "owner") {
      return {
        allowed: false,
        reason: "Forbidden: Clinic Owner access required for billing and subscriptions",
      };
    }
    return { allowed: true };
  }

  // 4. Staff directory management (mutations) is restricted to clinic owner
  if (pathname.startsWith("/api/staff") && ["POST", "PATCH", "DELETE", "PUT"].includes(normMethod)) {
    if (role !== "owner") {
      return {
        allowed: false,
        reason: "Forbidden: Only Clinic Owners can modify staff members",
      };
    }
    return { allowed: true };
  }

  // 5. Doctor role restrictions
  if (role === "doctor") {
    // Doctors have read-only access to patient records (cannot POST, PATCH, or DELETE patients)
    if (pathname.startsWith("/api/patients") && ["POST", "PATCH", "DELETE", "PUT"].includes(normMethod)) {
      return {
        allowed: false,
        reason: "Forbidden: Doctors have read-only access to patient directory in v1",
      };
    }

    // Doctors cannot manage WhatsApp auto-replies or handbacks directly in inbox
    if (pathname.startsWith("/api/conversations") && ["POST", "PATCH", "DELETE"].includes(normMethod)) {
      return {
        allowed: false,
        reason: "Forbidden: Reception desk manages patient conversation state and dispatch",
      };
    }

    return { allowed: true };
  }

  // 6. Receptionist role restrictions
  if (role === "receptionist") {
    // Receptionist has full access to operational endpoints (appointments, patients, conversations, reports, followups)
    return { allowed: true };
  }

  return { allowed: false, reason: "Forbidden: Unrecognized role permissions" };
}
