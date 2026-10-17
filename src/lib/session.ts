import {
  cookies,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import {
  SESSION_COOKIE_NAME,
  readOrderAccessToken,
  readSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  isAdminRole,
  type AdminRole,
} from "@/lib/roles";

export type {
  AdminRole,
};

/* =========================================================
   CURRENT USER
   ========================================================= */

export async function getCurrentUser() {
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

    if (!payload.sub) {
      return null;
    }

    const user =
      await db.user.findUnique({
        where: {
          id:
            String(
              payload.sub,
            ),
        },

        include: {
          customer:
            true,
        },
      });

    if (
      !user ||
      user.status !==
        "ACTIVE"
    ) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/* =========================================================
   CUSTOMER GUARD
   ========================================================= */

export async function requireCustomer() {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !user.customer
  ) {
    redirect(
      "/account/login",
    );
  }

  return {
    user,

    customer:
      user.customer,
  };
}

/* =========================================================
   ADMIN GUARD
   ========================================================= */

export async function requireAdmin() {
  const user =
    await getCurrentUser();

  if (!user) {
    redirect(
      "/admin/login",
    );
  }

  if (
    !isAdminRole(
      user.role,
    )
  ) {
    redirect(
      "/admin/login",
    );
  }

  return {
    ...user,

    role:
      user.role as
      AdminRole,
  };
}

/* =========================================================
   API ADMIN
   ========================================================= */

export async function getApiAdmin(
  request:
    Request,
) {
  const cookie =
    request.headers.get(
      "cookie",
    ) ??
    "";

  const token =
    cookie.match(
      /(?:^|;\s*)gog_session=([^;]+)/,
    )?.[1];

  if (!token) {
    return null;
  }

  try {
    const payload =
      await readSessionToken(
        decodeURIComponent(
          token,
        ),
      );

    if (!payload.sub) {
      return null;
    }

    const user =
      await db.user.findUnique({
        where: {
          id:
            String(
              payload.sub,
            ),
        },
      });

    if (
      !user ||
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

    return user;
  } catch {
    return null;
  }
}

/* =========================================================
   API USER
   ========================================================= */

export async function getApiUser(
  request:
    Request,
) {
  const cookie =
    request.headers.get(
      "cookie",
    ) ??
    "";

  const token =
    cookie.match(
      /(?:^|;\s*)gog_session=([^;]+)/,
    )?.[1];

  if (!token) {
    return null;
  }

  try {
    const payload =
      await readSessionToken(
        decodeURIComponent(
          token,
        ),
      );

    if (!payload.sub) {
      return null;
    }

    const user =
      await db.user.findUnique({
        where: {
          id:
            String(
              payload.sub,
            ),
        },

        include: {
          customer:
            true,
        },
      });

    return user?.status ===
      "ACTIVE"
      ? user
      : null;
  } catch {
    return null;
  }
}

/* =========================================================
   ORDER ACCESS
   ========================================================= */

export async function canAccessOrder(
  request:
    Request,

  orderNumber:
    string,
) {
  const user =
    await getApiUser(
      request,
    );

  if (
    user?.customer
  ) {
    const owned =
      await db.order.count({
        where: {
          number:
            orderNumber,

          customerId:
            user.customer.id,
        },
      });

    if (owned) {
      return true;
    }
  }

  const cookie =
    request.headers.get(
      "cookie",
    ) ??
    "";

  const token =
    cookie.match(
      /(?:^|;\s*)gog_order_access=([^;]+)/,
    )?.[1];

  if (!token) {
    return false;
  }

  try {
    const payload =
      await readOrderAccessToken(
        decodeURIComponent(
          token,
        ),
      );

    return (
      payload.orderNumber ===
      orderNumber
    );
  } catch {
    return false;
  }
}