import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

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
  type AdminRole,
} from "@/lib/roles";

const createUserSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(
          2,
          "Name is required.",
        )
        .max(
          100,
        ),

    email:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email address.",
        )
        .max(
          180,
        )
        .transform(
          (
            value,
          ) =>
            value.toLowerCase(),
        ),

    phone:
      z
        .string()
        .trim()
        .optional()
        .default(""),

    password:
      z
        .string()
        .min(
          8,
          "Password must be at least 8 characters.",
        )
        .max(
          100,
        ),

    role:
      z.enum([
        "SUPER_ADMIN",
        "ADMIN",
        "MANAGER",
        "STAFF",
      ]),
  });

export async function POST(
  request:
    Request,
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
    const input =
      createUserSchema.parse(
        await request.json(),
      );

    const targetRole =
      input.role as
      AdminRole;

    if (
      !canAssignAdminRole(
        admin.role,
        targetRole,
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
      input.phone.trim() ||
      null;

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

    const existing =
      await db.user.findFirst({
        where: {
          OR: [
            {
              email:
                input.email,
            },

            ...(phone
              ? [
                  {
                    phone,
                  },
                ]
              : []),
          ],
        },

        select: {
          id:
            true,
        },
      });

    if (
      existing
    ) {
      return NextResponse.json(
        {
          error:
            "A user already exists with this email or phone number.",
        },
        {
          status:
            409,
        },
      );
    }

    const passwordHash =
      await bcrypt.hash(
        input.password,
        12,
      );

    const user =
      await db.$transaction(
        async (
          tx,
        ) => {
          const created =
            await tx.user.create({
              data: {
                name:
                  input.name,

                email:
                  input.email,

                phone,

                passwordHash,

                role:
                  targetRole,

                status:
                  "ACTIVE",
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
                "ADMIN_USER_CREATED",

              entityType:
                "User",

              entityId:
                created.id,

              metadata: {
                email:
                  created.email,

                role:
                  created.role,
              },
            },
          });

          return created;
        },
      );

    return NextResponse.json(
      {
        user: {
          ...user,

          sessionCount:
            0,

          createdAt:
            user.createdAt
              .toISOString(),

          updatedAt:
            user.updatedAt
              .toISOString(),
        },

        message:
          "Admin user created successfully.",
      },
      {
        status:
          201,
      },
    );
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
      "Create admin user error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create admin user.",
      },
      {
        status:
          500,
      },
    );
  }
}