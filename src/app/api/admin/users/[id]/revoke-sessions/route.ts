import {
  NextResponse,
} from "next/server";

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
  canManageAdminRole,
  isAdminRole,
} from "@/lib/roles";

export async function POST(
  _request:
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

  const {
    id,
  } =
    await params;

  const target =
    await db.user.findUnique({
      where: {
        id,
      },

      select: {
        id:
          true,

        role:
          true,

        email:
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
    admin.id
  ) {
    return NextResponse.json(
      {
        error:
          "Use Sign Out to end your own session.",
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
      target.role,
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

  await revokeAllUserSessions(
    target.id,
  );

  await db.activityLog.create({
    data: {
      actorId:
        admin.id,

      action:
        "ADMIN_USER_SESSIONS_REVOKED",

      entityType:
        "User",

      entityId:
        target.id,

      metadata: {
        email:
          target.email,
      },
    },
  });

  return NextResponse.json({
    ok:
      true,

    message:
      "All active sessions were revoked.",
  });
}