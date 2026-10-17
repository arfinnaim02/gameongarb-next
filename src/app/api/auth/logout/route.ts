import {
  NextResponse,
} from "next/server";

import {
  SESSION_COOKIE_NAME,
  readSessionCookieFromRequest,
  revokeSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  requestIp,
} from "@/lib/security/rate-limit";

function safeRedirectPath(
  value:
    string | null,
) {
  if (
    !value ||
    !value.startsWith(
      "/",
    ) ||
    value.startsWith(
      "//",
    )
  ) {
    return "/";
  }

  return value;
}

export async function POST(
  request:
    Request,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const safeNext =
    safeRedirectPath(
      requestUrl.searchParams.get(
        "next",
      ),
    );

  const token =
    readSessionCookieFromRequest(
      request,
    );

  let userId:
    string | null =
    null;

  if (token) {
    userId =
      await revokeSessionToken(
        token,
      ).catch(
        () =>
          null,
      );
  }

  if (userId) {
    await db.activityLog
      .create({
        data: {
          actorId:
            userId,

          action:
            "USER_LOGOUT",

          entityType:
            "User",

          entityId:
            userId,

          ip:
            requestIp(
              request,
            ),
        },
      })
      .catch(() => {
        /*
         * Never block logout because
         * audit logging failed.
         */
      });
  }

  const response =
    NextResponse.redirect(
      new URL(
        safeNext,
        request.url,
      ),
      303,
    );

  response.cookies.set(
    SESSION_COOKIE_NAME,
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

  response.headers.set(
    "cache-control",
    "no-store",
  );

  return response;
}