import {
  Prisma,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  OAUTH_PENDING_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readOAuthPendingToken,
  readSessionCookieFromRequest,
  revokeSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  rateLimit,
  requestIp,
} from "@/lib/security/rate-limit";

const schema =
  z.object({
    phone:
      z
        .string()
        .trim()
        .regex(
          /^01\d{9}$/,
          "Enter a valid Bangladesh phone number.",
        ),
  });

export async function POST(
  request:
    NextRequest,
) {
  const ip =
    requestIp(
      request,
    );

  const limit =
    rateLimit(
      `oauth-complete:${ip}`,
      10,
      60 *
        60_000,
    );

  if (
    !limit.allowed
  ) {
    return NextResponse.json(
      {
        error:
          "Too many attempts. Please try again later.",
      },
      {
        status:
          429,
      },
    );
  }

  try {
    const pendingToken =
      request.cookies.get(
        OAUTH_PENDING_COOKIE_NAME,
      )?.value;

    if (
      !pendingToken
    ) {
      return NextResponse.json(
        {
          error:
            "Your social registration session has expired. Please start again.",
        },
        {
          status:
            401,
        },
      );
    }

    const pending =
      await readOAuthPendingToken(
        pendingToken,
      );

    const input =
      schema.parse(
        await request.json(),
      );

    const phoneUser =
      await db.user.findUnique({
        where: {
          phone:
            input.phone,
        },

        select: {
          id:
            true,
        },
      });

    const phoneCustomer =
      await db.customer.findUnique({
        where: {
          phone:
            input.phone,
        },

        select: {
          id:
            true,
        },
      });

    if (
      phoneUser ||
      phoneCustomer
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this phone number.",
        },
        {
          status:
            409,
        },
      );
    }

    const emailUser =
      await db.user.findUnique({
        where: {
          email:
            pending.email,
        },

        select: {
          id:
            true,
        },
      });

    if (
      emailUser
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this email. Please sign in using your existing method.",
        },
        {
          status:
            409,
        },
      );
    }

    const linkedOAuth =
      await db.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId:
            {
              provider:
                pending.provider,

              providerAccountId:
                pending.providerAccountId,
            },
        },

        select: {
          id:
            true,
        },
      });

    if (
      linkedOAuth
    ) {
      return NextResponse.json(
        {
          error:
            "This social account is already registered. Please sign in again.",
        },
        {
          status:
            409,
        },
      );
    }

    const user =
      await db.$transaction(
        async (
          tx,
        ) => {
          return tx.user.create({
            data: {
              name:
                pending.name,

              email:
                pending.email,

              phone:
                input.phone,

              passwordHash:
                null,

              role:
                "CUSTOMER",

              status:
                "ACTIVE",

              customer: {
                create: {
                  name:
                    pending.name,

                  email:
                    pending.email,

                  phone:
                    input.phone,

                  status:
                    "ACTIVE",
                },
              },

              oauthAccounts: {
                create: {
                  provider:
                    pending.provider,

                  providerAccountId:
                    pending.providerAccountId,

                  email:
                    pending.email,
                },
              },
            },
          });
        },
      );

    const previousToken =
      readSessionCookieFromRequest(
        request,
      );

    if (
      previousToken
    ) {
      await revokeSessionToken(
        previousToken,
      ).catch(
        () => undefined,
      );
    }

    const sessionToken =
      await createSessionToken({
        sub:
          user.id,

        role:
          user.role,

        name:
          user.name,
      });

    await db.activityLog
      .create({
        data: {
          actorId:
            user.id,

          action:
            "SOCIAL_REGISTER",

          entityType:
            "User",

          entityId:
            user.id,

          ip,

          metadata: {
            provider:
              pending.provider,
          },
        },
      })
      .catch(
        () => undefined,
      );

    const response =
      NextResponse.json(
        {
          ok:
            true,
        },
        {
          status:
            201,
        },
      );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionToken,
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

    response.cookies.set(
      OAUTH_PENDING_COOKIE_NAME,
      "",
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

        expires:
          new Date(0),

        maxAge:
          0,
      },
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
            "Check your phone number.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "That account information is already in use.",
        },
        {
          status:
            409,
        },
      );
    }

    console.error(
      "OAuth completion error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to finish registration right now.",
      },
      {
        status:
          500,
      },
    );
  }
}