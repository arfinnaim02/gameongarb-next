import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  SignJWT,
  jwtVerify,
} from "jose";

import {
  db,
} from "@/lib/db";

/* =========================================================
   SESSION CONSTANTS
   ========================================================= */

export const SESSION_COOKIE_NAME =
  "gog_session";

export const SESSION_MAX_AGE_SECONDS =
  60 *
  60 *
  24 *
  7;

const SESSION_TTL_MS =
  SESSION_MAX_AGE_SECONDS *
  1000;

/* =========================================================
   SESSION TOKEN HELPERS
   ========================================================= */

function hashSessionToken(
  token:
    string,
) {
  return createHash(
    "sha256",
  )
    .update(
      token,
    )
    .digest(
      "hex",
    );
}

function generateSessionToken() {
  return randomBytes(
    32,
  ).toString(
    "base64url",
  );
}

/* =========================================================
   CREATE DB-BACKED SESSION
   ========================================================= */

export async function createSessionToken(
  payload: {
    sub:
      string;

    role:
      string;

    name:
      string;
  },
) {
  const token =
    generateSessionToken();

  const tokenHash =
    hashSessionToken(
      token,
    );

  const expiresAt =
    new Date(
      Date.now() +
        SESSION_TTL_MS,
    );

  /*
   * Opportunistic cleanup.
   *
   * This prevents the session
   * table from accumulating expired
   * sessions indefinitely.
   */
  await db.session
    .deleteMany({
      where: {
        expiresAt: {
          lte:
            new Date(),
        },
      },
    })
    .catch(() => {
      /*
       * Cleanup should never prevent
       * a valid login.
       */
    });

  await db.session.create({
    data: {
      tokenHash,

      userId:
        payload.sub,

      expiresAt,
    },
  });

  /*
   * Only the raw token reaches the
   * browser.
   *
   * The database stores only its hash.
   */
  return token;
}

/* =========================================================
   READ / VALIDATE SESSION
   ========================================================= */

export async function readSessionToken(
  token:
    string,
) {
  if (
    !token ||
    token.length <
      20
  ) {
    throw new Error(
      "Invalid session token.",
    );
  }

  const tokenHash =
    hashSessionToken(
      token,
    );

  const session =
    await db.session.findUnique({
      where: {
        tokenHash,
      },

      include: {
        user: {
          select: {
            id:
              true,

            name:
              true,

            role:
              true,

            status:
              true,
          },
        },
      },
    });

  if (!session) {
    throw new Error(
      "Session not found.",
    );
  }

  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    await db.session
      .delete({
        where: {
          id:
            session.id,
        },
      })
      .catch(() => {
        /*
         * Session is already invalid.
         */
      });

    throw new Error(
      "Session expired.",
    );
  }

  if (
    session.user.status !==
    "ACTIVE"
  ) {
    throw new Error(
      "User is not active.",
    );
  }

  return {
    sub:
      session.userId,

    sessionId:
      session.id,

    role:
      session.user.role,

    name:
      session.user.name,

    exp:
      Math.floor(
        session.expiresAt.getTime() /
          1000,
      ),
  };
}

/* =========================================================
   REVOKE SINGLE SESSION
   ========================================================= */

export async function revokeSessionToken(
  token:
    string | null |
    undefined,
) {
  if (!token) {
    return null;
  }

  const tokenHash =
    hashSessionToken(
      token,
    );

  const session =
    await db.session.findUnique({
      where: {
        tokenHash,
      },

      select: {
        id:
          true,

        userId:
          true,
      },
    });

  if (!session) {
    return null;
  }

  await db.session.deleteMany({
    where: {
      id:
        session.id,
    },
  });

  return session.userId;
}

/* =========================================================
   REVOKE ALL USER SESSIONS
   ========================================================= */

export async function revokeAllUserSessions(
  userId:
    string,
) {
  await db.session.deleteMany({
    where: {
      userId,
    },
  });
}

/* =========================================================
   COOKIE PARSING
   ========================================================= */

export function readSessionCookieFromRequest(
  request:
    Request,
) {
  const cookie =
    request.headers.get(
      "cookie",
    ) ??
    "";

  const escaped =
    SESSION_COOKIE_NAME.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const token =
    cookie.match(
      new RegExp(
        `(?:^|;\\s*)${escaped}=([^;]+)`,
      ),
    )?.[1];

  if (!token) {
    return null;
  }

  try {
    return decodeURIComponent(
      token,
    );
  } catch {
    return token;
  }
}

/* =========================================================
   ORDER ACCESS JWT SECRET
   ========================================================= */

function getJwtSecret() {
  const configured =
    process.env
      .SESSION_SECRET ??
    process.env
      .NEXTAUTH_SECRET;

  if (configured) {
    return new TextEncoder().encode(
      configured,
    );
  }

  /*
   * Never silently use a known
   * secret in production.
   */
  if (
    process.env
      .NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "SESSION_SECRET is required in production.",
    );
  }

  return new TextEncoder().encode(
    "development-only-change-this-secret",
  );
}

/* =========================================================
   ORDER ACCESS TOKEN
   ========================================================= */

export async function createOrderAccessToken(
  orderNumber:
    string,

  phone:
    string,
) {
  return new SignJWT({
    orderNumber,

    phone,

    purpose:
      "order-access",
  })
    .setProtectedHeader({
      alg:
        "HS256",
    })
    .setIssuedAt()
    .setExpirationTime(
      "2h",
    )
    .sign(
      getJwtSecret(),
    );
}

export async function readOrderAccessToken(
  token:
    string,
) {
  const payload =
    (
      await jwtVerify(
        token,
        getJwtSecret(),
      )
    ).payload;

  if (
    payload.purpose !==
    "order-access"
  ) {
    throw new Error(
      "Invalid token purpose.",
    );
  }

  return payload;
}