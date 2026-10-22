import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  revokeAllUserSessions,
} from "@/lib/auth";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  canAssignAdminRole,
  canManageAdminRole,
  isAdminRole,
  type AdminRole,
} from "@/lib/roles";

const updateSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    phone:
      z
        .string()
        .trim()
        .nullable()
        .optional(),

    role:
      z
        .enum([
          "SUPER_ADMIN",
          "ADMIN",
          "MANAGER",
          "STAFF",
        ])
        .optional(),

    status:
      z
        .enum([
          "ACTIVE",
          "BLOCKED",
        ])
        .optional(),

    password:
      z
        .string()
        .min(
          8,
          "Password must be at least 8 characters.",
        )
        .max(100)
        .optional(),
  });

export async function PATCH(
  request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "users",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized.",
      },
      {
        status:
          403,
      },
    );
  }

  try {
    const {
      id,
    } =
      await params;

    const input =
      updateSchema.parse(
        await request.json(),
      );

    const target =
      await db.user.findUnique({
        where: {
          id,
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
        },
      });

    if (
      !target ||
      !isAdminRole(
        target.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Admin user not found.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      target.id ===
      admin.id &&
      (
        input.role ||
        input.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot change your own role or account status.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      !canManageAdminRole(
        admin.role,
        target.role as
          AdminRole,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot manage this user.",
        },
        {
          status:
            403,
        },
      );
    }

    const newRole =
      input.role
        ? (
            input.role as
              AdminRole
          )
        : target.role;

    if (
      input.role &&
      !canAssignAdminRole(
        admin.role,
        newRole,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot assign this role.",
        },
        {
          status:
            403,
        },
      );
    }

    const phone =
      input.phone ===
      undefined
        ? undefined
        : (
            input.phone
              ?.trim() ||
            null
          );

    if (
      phone &&
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Phone number must be a valid Bangladesh mobile number.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      phone
    ) {
      const phoneOwner =
        await db.user.findFirst({
          where: {
            phone,

            NOT: {
              id:
                target.id,
            },
          },

          select: {
            id:
              true,
          },
        });

      if (
        phoneOwner
      ) {
        return NextResponse.json(
          {
            error:
              "That phone number is already being used.",
          },
          {
            status:
              409,
          },
        );
      }
    }

    const passwordHash =
      input.password
        ? await bcrypt.hash(
            input.password,
            12,
          )
        : undefined;

    const roleChanged =
      Boolean(
        input.role &&
        input.role !==
          target.role,
      );

    const statusChanged =
      Boolean(
        input.status &&
        input.status !==
          target.status,
      );

    const passwordChanged =
      Boolean(
        input.password,
      );

    const updated =
      await db.$transaction(
        async (
          tx,
        ) => {
          const user =
            await tx.user.update({
              where: {
                id:
                  target.id,
              },

              data: {
                ...(input.name !==
                undefined
                  ? {
                      name:
                        input.name,
                    }
                  : {}),

                ...(phone !==
                undefined
                  ? {
                      phone,
                    }
                  : {}),

                ...(input.role
                  ? {
                      role:
                        newRole,
                    }
                  : {}),

                ...(input.status
                  ? {
                      status:
                        input.status,
                    }
                  : {}),

                ...(passwordHash
                  ? {
                      passwordHash,
                    }
                  : {}),
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
              },
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "ADMIN_USER_UPDATED",

              entityType:
                "User",

              entityId:
                target.id,

              metadata: {
                previousRole:
                  target.role,

                role:
                  user.role,

                previousStatus:
                  target.status,

                status:
                  user.status,

                passwordChanged,
              },
            },
          });

          return user;
        },
      );

    if (
      roleChanged ||
      statusChanged ||
      passwordChanged
    ) {
      await revokeAllUserSessions(
        target.id,
      );
    }

    const sessionCount =
      await db.session.count({
        where: {
          userId:
            target.id,
        },
      });

    return NextResponse.json({
      user: {
        ...updated,

        sessionCount,

        createdAt:
          updated.createdAt
            .toISOString(),

        updatedAt:
          updated.updatedAt
            .toISOString(),
      },

      message:
        "Admin user updated successfully.",
    });
  } catch (
    error
  ) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            error.issues[0]
              ?.message ??
            "Check the user details.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Update admin user error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update admin user.",
      },
      {
        status:
          500,
      },
    );
  }
}