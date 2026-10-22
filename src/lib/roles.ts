import type { UserRole } from "@prisma/client";

export type AdminRole = Exclude<
  UserRole,
  "CUSTOMER"
>;

export const ADMIN_ROLES: readonly AdminRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "STAFF",
];

export function isAdminRole(
  role: UserRole,
): role is AdminRole {
  return role !== "CUSTOMER";
}

export function canAssignAdminRole(
  actorRole: AdminRole,
  targetRole: AdminRole,
) {
  if (
    actorRole ===
    "SUPER_ADMIN"
  ) {
    return true;
  }

  if (
    actorRole ===
    "ADMIN"
  ) {
    return (
      targetRole ===
        "MANAGER" ||
      targetRole ===
        "STAFF"
    );
  }

  return false;
}

export function canManageAdminRole(
  actorRole: AdminRole,
  targetRole: AdminRole,
) {
  if (
    actorRole ===
    "SUPER_ADMIN"
  ) {
    return true;
  }

  if (
    actorRole ===
    "ADMIN"
  ) {
    return (
      targetRole ===
        "MANAGER" ||
      targetRole ===
        "STAFF"
    );
  }

  return false;
}