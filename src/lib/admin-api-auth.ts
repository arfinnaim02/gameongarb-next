import {
  cookies,
} from "next/headers";

import {
  SESSION_COOKIE_NAME,
  readSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  isAdminRole,
  type AdminRole,
} from "@/lib/roles";

export async function requireAdminApi() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  try {
    const payload =
      await readSessionToken(
        token,
      );

    const userId =
      typeof payload.sub ===
      "string"
        ? payload.sub
        : null;

    if (!userId) {
      return null;
    }

    const user =
      await db.user.findUnique({
        where: {
          id:
            userId,
        },
      });

    if (!user) {
      return null;
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      return null;
    }

    if (
      !isAdminRole(
        user.role,
      )
    ) {
      return null;
    }

    return {
      ...user,

      role:
        user.role as
        AdminRole,
    };
  } catch {
    return null;
  }
}