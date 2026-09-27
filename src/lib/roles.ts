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