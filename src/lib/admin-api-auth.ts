import {
  cookies,
} from "next/headers";

import { db } from "@/lib/db";

import {
  readSessionToken,
} from "@/lib/auth";

import {
  isAdminRole,
  type AdminRole,
} from "@/lib/roles";

export async function requireAdminApi() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "gog_session",
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
          id: userId,
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

    /*
     * isAdminRole guarantees CUSTOMER
     * cannot reach this point.
     *
     * Returning a narrowed object also
     * means every API route gets the
     * correct AdminRole type automatically.
     */
    return {
      ...user,

      role:
        user.role as AdminRole,
    };
  } catch {
    return null;
  }
}