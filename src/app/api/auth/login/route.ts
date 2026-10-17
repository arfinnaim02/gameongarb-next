import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionCookieFromRequest,
  revokeSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  isAdminRole,
} from "@/lib/roles";

import {
  rateLimit,
  requestIp,
} from "@/lib/security/rate-limit";

const schema =
  z.object({
    email:
      z
        .string()
        .trim()
        .email()
        .transform(
          (value) =>
            value.toLowerCase(),
        ),

    password:
      z
        .string()
        .min(8),

    admin:
      z
        .boolean()
        .optional()
        .default(
          false,
        ),
  });

export async function POST(
  req:
    Request,
) {
  const ip =
    requestIp(
      req,
    );

  const limit =
    rateLimit(
      `login:${ip}`,
      8,
      10 *
        60_000,
    );

  if (
    !limit.allowed
  ) {
    return NextResponse.json(
      {
        error:
          "Too many sign-in attempts. Please try again later.",
      },
      {
        status:
          429,

        headers: {
          "retry-after":
            String(
              limit.retryAfter,
            ),
        },
      },
    );
  }

  try {
    const input =
      schema.parse(
        await req.json(),
      );

    const user =
      await db.user.findUnique({
        where: {
          email:
            input.email,
        },
      });

    /*
     * Never reveal whether
     * the email exists.
     */
    if (
      !user ||
      user.status !==
        "ACTIVE"
    ) {
      return NextResponse.json(
        {
          error:
            "Incorrect email or password.",
        },
        {
          status:
            401,
        },
      );
    }

    const validPassword =
      await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

    if (
      !validPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Incorrect email or password.",
        },
        {
          status:
            401,
        },
      );
    }

    /*
     * ADMIN LOGIN
     */
    if (
      input.admin &&
      !isAdminRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This account does not have admin access.",
        },
        {
          status:
            403,
        },
      );
    }

    /*
     * CUSTOMER LOGIN
     */
    if (
      !input.admin &&
      isAdminRole(
        user.role,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please use the admin sign-in page for this account.",
        },
        {
          status:
            403,
        },
      );
    }

    /*
     * If another account/session
     * is currently active in this
     * browser, revoke it before
     * issuing the replacement.
     */
    const previousToken =
      readSessionCookieFromRequest(
        req,
      );

    if (
      previousToken
    ) {
      await revokeSessionToken(
        previousToken,
      ).catch(() => {
        /*
         * A stale cookie should not
         * block a fresh valid login.
         */
      });
    }

    const token =
      await createSessionToken({
        sub:
          user.id,

        role:
          user.role,

        name:
          user.name,
      });

    /*
     * Audit login without making
     * authentication depend on
     * activity-log availability.
     */
    await db.activityLog
      .create({
        data: {
          actorId:
            user.id,

          action:
            input.admin
              ? "ADMIN_LOGIN"
              : "CUSTOMER_LOGIN",

          entityType:
            "User",

          entityId:
            user.id,

          ip,

          metadata: {
            role:
              user.role,
          },
        },
      })
      .catch(() => {
        /*
         * Authentication remains valid
         * if audit logging fails.
         */
      });

    const response =
      NextResponse.json({
        ok:
          true,

        user: {
          id:
            user.id,

          name:
            user.name,

          role:
            user.role,
        },
      });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      {
        httpOnly:
          true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          SESSION_MAX_AGE_SECONDS,
      },
    );

    response.headers.set(
      "cache-control",
      "no-store",
    );

    return response;
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
            "Invalid login request.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Login error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to sign in right now.",
      },
      {
        status:
          500,
      },
    );
  }
}