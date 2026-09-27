import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import { z } from "zod";

import {
  createSessionToken,
} from "@/lib/auth";

import { db } from "@/lib/db";

import {
  isAdminRole,
} from "@/lib/roles";

import {
  rateLimit,
  requestIp,
} from "@/lib/security/rate-limit";

const schema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) =>
      value.toLowerCase(),
    ),

  password: z
    .string()
    .min(8),

  admin: z
    .boolean()
    .optional()
    .default(false),
});

export async function POST(
  req: Request,
) {
  const limit =
    rateLimit(
      `login:${requestIp(
        req,
      )}`,
      8,
      10 * 60_000,
    );

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many sign-in attempts. Please try again later.",
      },

      {
        status: 429,

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
     * Do not reveal whether
     * email exists.
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
          status: 401,
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
          status: 401,
        },
      );
    }

    /*
     * ADMIN LOGIN:
     *
     * A CUSTOMER cannot use
     * /admin/login.
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
          status: 403,
        },
      );
    }

    /*
     * CUSTOMER LOGIN:
     *
     * Keep normal customer
     * login separate.
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
          status: 403,
        },
      );
    }

    const token =
      await createSessionToken({
        sub: user.id,
        role: user.role,
        name: user.name,
      });

    const response =
      NextResponse.json({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
      });

    /*
     * Important:
     *
     * This replaces any current
     * customer/admin session.
     *
     * Therefore you CAN be logged
     * in as customer, open the
     * admin login page, enter admin
     * credentials, and the session
     * becomes the admin session.
     */
    response.cookies.set(
      "gog_session",
      token,
      {
        httpOnly: true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",

        maxAge:
          60 *
          60 *
          24 *
          7,
      },
    );

    return response;
  } catch (error) {
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
          status: 400,
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
        status: 500,
      },
    );
  }
}