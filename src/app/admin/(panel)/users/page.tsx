import {
  redirect,
} from "next/navigation";

import {
  AdminUsersManager,
} from "@/components/admin/admin-users-manager";

import {
  hasPermission,
} from "@/lib/business";

import type {
  AdminRole,
} from "@/lib/roles";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function AdminUsersPage() {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "users",
    )
  ) {
    redirect(
      "/admin",
    );
  }

  const users =
    await db.user.findMany({
      where: {
        role: {
          not:
            "CUSTOMER",
        },
      },

      select: {
        id:
          true,

        name:
          true,

        email:
          true,

        phone:
          true,

        role:
          true,

        status:
          true,

        createdAt:
          true,

        updatedAt:
          true,

        _count: {
          select: {
            sessions:
              true,
          },
        },
      },

      orderBy: [
        {
          role:
            "asc",
        },

        {
          createdAt:
            "asc",
        },
      ],
    });

  return (
    <AdminUsersManager
      currentUser={{
        id:
          admin.id,

        role:
          admin.role,
      }}
      initialUsers={users.map(
        (
          user,
        ) => ({
          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          phone:
            user.phone,

        role:
        user.role as
            AdminRole,

          status:
            user.status,

          sessionCount:
            user._count
              .sessions,

          createdAt:
            user.createdAt
              .toISOString(),

          updatedAt:
            user.updatedAt
              .toISOString(),
        }),
      )}
    />
  );
}