import {
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  OAUTH_PENDING_COOKIE_NAME,
  OAUTH_PENDING_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createOAuthPendingToken,
  createSessionToken,
  readSessionCookieFromRequest,
  revokeSessionToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

export type SupportedOAuthProvider =
  "GOOGLE" |
  "FACEBOOK";

const OAUTH_STATE_MAX_AGE_SECONDS =
  60 * 10;

const OAUTH_RETURN_COOKIE_NAME =
  "gog_oauth_return";

/* =========================================================
   COOKIE NAMES
   ========================================================= */

function stateCookieName(
  provider:
    SupportedOAuthProvider,
) {
  return `gog_oauth_state_${provider.toLowerCase()}`;
}

function isSecureCookie() {
  return (
    process.env.NODE_ENV ===
    "production"
  );
}

/* =========================================================
   APP ORIGIN
   ========================================================= */

function getAppOrigin(
  request:
    NextRequest,
) {
  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    process.env
      .NEXTAUTH_URL;

  if (
    configured
  ) {
    return configured.replace(
      /\/+$/,
      "",
    );
  }

  return request.nextUrl.origin;
}

function getCallbackUrl(
  provider:
    SupportedOAuthProvider,

  request:
    NextRequest,
) {
  return `${getAppOrigin(
    request,
  )}/api/auth/oauth/${provider.toLowerCase()}/callback`;
}

/* =========================================================
   PROVIDER CONFIG
   ========================================================= */

function getGoogleConfig() {
  const clientId =
    process.env
      .GOOGLE_CLIENT_ID;

  const clientSecret =
    process.env
      .GOOGLE_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Google OAuth is not configured.",
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

function getFacebookConfig() {
  const clientId =
    process.env
      .FACEBOOK_CLIENT_ID;

  const clientSecret =
    process.env
      .FACEBOOK_CLIENT_SECRET;

  const graphVersion =
    process.env
      .FACEBOOK_GRAPH_VERSION;

  if (
    !clientId ||
    !clientSecret ||
    !graphVersion
  ) {
    throw new Error(
      "Facebook OAuth is not configured.",
    );
  }

  return {
    clientId,
    clientSecret,
    graphVersion,
  };
}

/* =========================================================
   STATE
   ========================================================= */

function createState() {
  return randomBytes(
    32,
  ).toString(
    "base64url",
  );
}

function validateState(
  received:
    string | null,

  expected:
    string | undefined,
) {
  if (
    !received ||
    !expected
  ) {
    return false;
  }

  const receivedBuffer =
    Buffer.from(
      received,
    );

  const expectedBuffer =
    Buffer.from(
      expected,
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}

/* =========================================================
   TEMP COOKIE CLEANUP
   ========================================================= */

function clearOAuthTemporaryCookies(
  response:
    NextResponse,

  provider:
    SupportedOAuthProvider,
) {
  response.cookies.set(
    stateCookieName(
      provider,
    ),
    "",
    {
      httpOnly:
        true,

      secure:
        isSecureCookie(),

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

  response.cookies.set(
    OAUTH_RETURN_COOKIE_NAME,
    "",
    {
      httpOnly:
        true,

      secure:
        isSecureCookie(),

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
}

/* =========================================================
   ERROR REDIRECT
   ========================================================= */

function oauthErrorRedirect(
  request:
    NextRequest,

  provider:
    SupportedOAuthProvider,

  error:
    string,
) {
  const mode =
    request.cookies.get(
      OAUTH_RETURN_COOKIE_NAME,
    )?.value;

  const pathname =
    mode ===
    "register"
      ? "/account/register"
      : "/account/login";

  const url =
    new URL(
      pathname,
      getAppOrigin(
        request,
      ),
    );

  url.searchParams.set(
    "social_error",
    error,
  );

  const response =
    NextResponse.redirect(
      url,
    );

  clearOAuthTemporaryCookies(
    response,
    provider,
  );

  return response;
}

/* =========================================================
   START OAUTH
   ========================================================= */

export async function startOAuth(
  provider:
    SupportedOAuthProvider,

  request:
    NextRequest,
) {
  try {
    const state =
      createState();

    const mode =
      request.nextUrl
        .searchParams
        .get(
          "mode",
        ) ===
      "register"
        ? "register"
        : "login";

    const callbackUrl =
      getCallbackUrl(
        provider,
        request,
      );

    let authorizationUrl:
      URL;

    if (
      provider ===
      "GOOGLE"
    ) {
      const {
        clientId,
      } =
        getGoogleConfig();

      authorizationUrl =
        new URL(
          "https://accounts.google.com/o/oauth2/v2/auth",
        );

      authorizationUrl.searchParams.set(
        "client_id",
        clientId,
      );

      authorizationUrl.searchParams.set(
        "redirect_uri",
        callbackUrl,
      );

      authorizationUrl.searchParams.set(
        "response_type",
        "code",
      );

      authorizationUrl.searchParams.set(
        "scope",
        "openid email profile",
      );

      authorizationUrl.searchParams.set(
        "state",
        state,
      );

      authorizationUrl.searchParams.set(
        "prompt",
        "select_account",
      );
    } else {
      const {
        clientId,
        graphVersion,
      } =
        getFacebookConfig();

      authorizationUrl =
        new URL(
          `https://www.facebook.com/${graphVersion}/dialog/oauth`,
        );

      authorizationUrl.searchParams.set(
        "client_id",
        clientId,
      );

      authorizationUrl.searchParams.set(
        "redirect_uri",
        callbackUrl,
      );

      authorizationUrl.searchParams.set(
        "response_type",
        "code",
      );

      authorizationUrl.searchParams.set(
        "scope",
        "email,public_profile",
      );

      authorizationUrl.searchParams.set(
        "state",
        state,
      );
    }

    const response =
      NextResponse.redirect(
        authorizationUrl,
      );

    response.cookies.set(
      stateCookieName(
        provider,
      ),
      state,
      {
        httpOnly:
          true,

        secure:
          isSecureCookie(),

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          OAUTH_STATE_MAX_AGE_SECONDS,
      },
    );

    response.cookies.set(
      OAUTH_RETURN_COOKIE_NAME,
      mode,
      {
        httpOnly:
          true,

        secure:
          isSecureCookie(),

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          OAUTH_STATE_MAX_AGE_SECONDS,
      },
    );

    return response;
  } catch (
    error
  ) {
    console.error(
      `${provider} OAuth start error:`,
      error,
    );

    return oauthErrorRedirect(
      request,
      provider,
      "provider_not_configured",
    );
  }
}

/* =========================================================
   GOOGLE PROFILE
   ========================================================= */

async function getGoogleProfile(
  code:
    string,

  request:
    NextRequest,
) {
  const {
    clientId,
    clientSecret,
  } =
    getGoogleConfig();

  const tokenResponse =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              clientId,

            client_secret:
              clientSecret,

            code,

            grant_type:
              "authorization_code",

            redirect_uri:
              getCallbackUrl(
                "GOOGLE",
                request,
              ),
          }),

        cache:
          "no-store",
      },
    );

    if (
    !tokenResponse.ok
    ) {
    const errorText =
        await tokenResponse.text();

    console.error(
        "Google token exchange failed:",
        tokenResponse.status,
        errorText,
    );

    throw new Error(
        "Google token exchange failed.",
    );
    }

  const token =
    (await tokenResponse.json()) as {
      access_token?:
        string;
    };

  if (
    !token.access_token
  ) {
    throw new Error(
      "Google access token missing.",
    );
  }

  const profileResponse =
    await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          authorization:
            `Bearer ${token.access_token}`,
        },

        cache:
          "no-store",
      },
    );

    if (
    !profileResponse.ok
    ) {
    const errorText =
        await profileResponse.text();

    console.error(
        "Google profile request failed:",
        profileResponse.status,
        errorText,
    );

    throw new Error(
        "Google profile request failed.",
    );
    }
  const profile =
    (await profileResponse.json()) as {
      sub?:
        string;

      email?:
        string;

      email_verified?:
        boolean;

      name?:
        string;
    };

  if (
    !profile.sub ||
    !profile.email ||
    profile.email_verified !==
      true
  ) {
    throw new Error(
      "Google did not return a verified email.",
    );
  }

  return {
    providerAccountId:
      profile.sub,

    email:
      profile.email
        .trim()
        .toLowerCase(),

    name:
      profile.name
        ?.trim() ||
      "Game On Garb Customer",
  };
}

/* =========================================================
   FACEBOOK PROFILE
   ========================================================= */

async function getFacebookProfile(
  code:
    string,

  request:
    NextRequest,
) {
  const {
    clientId,
    clientSecret,
    graphVersion,
  } =
    getFacebookConfig();

  const tokenUrl =
    new URL(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
    );

  tokenUrl.searchParams.set(
    "client_id",
    clientId,
  );

  tokenUrl.searchParams.set(
    "client_secret",
    clientSecret,
  );

  tokenUrl.searchParams.set(
    "redirect_uri",
    getCallbackUrl(
      "FACEBOOK",
      request,
    ),
  );

  tokenUrl.searchParams.set(
    "code",
    code,
  );

  const tokenResponse =
    await fetch(
      tokenUrl,
      {
        cache:
          "no-store",
      },
    );

  if (
    !tokenResponse.ok
  ) {
    throw new Error(
      "Facebook token exchange failed.",
    );
  }

  const token =
    (await tokenResponse.json()) as {
      access_token?:
        string;
    };

  if (
    !token.access_token
  ) {
    throw new Error(
      "Facebook access token missing.",
    );
  }

  const profileUrl =
    new URL(
      `https://graph.facebook.com/${graphVersion}/me`,
    );

  profileUrl.searchParams.set(
    "fields",
    "id,name,email",
  );

  profileUrl.searchParams.set(
    "access_token",
    token.access_token,
  );

  const profileResponse =
    await fetch(
      profileUrl,
      {
        cache:
          "no-store",
      },
    );

  if (
    !profileResponse.ok
  ) {
    throw new Error(
      "Facebook profile request failed.",
    );
  }

  const profile =
    (await profileResponse.json()) as {
      id?:
        string;

      email?:
        string;

      name?:
        string;
    };

  if (
    !profile.id ||
    !profile.email
  ) {
    throw new Error(
      "Facebook did not provide an email address.",
    );
  }

  return {
    providerAccountId:
      profile.id,

    email:
      profile.email
        .trim()
        .toLowerCase(),

    name:
      profile.name
        ?.trim() ||
      "Game On Garb Customer",
  };
}

/* =========================================================
   FINISH OAUTH
   ========================================================= */

export async function finishOAuth(
  provider:
    SupportedOAuthProvider,

  request:
    NextRequest,
) {
  if (
    request.nextUrl
      .searchParams
      .get(
        "error",
      )
  ) {
    return oauthErrorRedirect(
      request,
      provider,
      "cancelled",
    );
  }

  const code =
    request.nextUrl
      .searchParams
      .get(
        "code",
      );

  const receivedState =
    request.nextUrl
      .searchParams
      .get(
        "state",
      );

  const expectedState =
    request.cookies.get(
      stateCookieName(
        provider,
      ),
    )?.value;

  if (
    !code ||
    !validateState(
      receivedState,
      expectedState,
    )
  ) {
    return oauthErrorRedirect(
      request,
      provider,
      "invalid_state",
    );
  }

  try {
    const profile =
      provider ===
      "GOOGLE"
        ? await getGoogleProfile(
            code,
            request,
          )
        : await getFacebookProfile(
            code,
            request,
          );

    const linkedAccount =
      await db.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId:
            {
              provider,

              providerAccountId:
                profile.providerAccountId,
            },
        },

        include: {
          user: {
            include: {
              customer:
                true,
            },
          },
        },
      });

    /*
     * Existing linked social account.
     */
    if (
      linkedAccount
    ) {
      const user =
        linkedAccount.user;

      if (
        user.status !==
          "ACTIVE" ||
        user.role !==
          "CUSTOMER" ||
        !user.customer
      ) {
        return oauthErrorRedirect(
          request,
          provider,
          "account_unavailable",
        );
      }

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

      const response =
        NextResponse.redirect(
          new URL(
            "/account",
            getAppOrigin(
              request,
            ),
          ),
        );

      response.cookies.set(
        SESSION_COOKIE_NAME,
        sessionToken,
        {
          httpOnly:
            true,

          secure:
            isSecureCookie(),

          sameSite:
            "lax",

          path:
            "/",

          maxAge:
            SESSION_MAX_AGE_SECONDS,
        },
      );

      clearOAuthTemporaryCookies(
        response,
        provider,
      );

      await db.activityLog
        .create({
          data: {
            actorId:
              user.id,

            action:
              "SOCIAL_LOGIN",

            entityType:
              "User",

            entityId:
              user.id,

            metadata: {
              provider,
            },
          },
        })
        .catch(
          () => undefined,
        );

      return response;
    }

    /*
     * Do not automatically attach a
     * provider to an existing email
     * account. That must be explicitly
     * linked later from account settings.
     */
const existingUser =
  await db.user.findUnique({
    where: {
      email:
        profile.email,
    },

    include: {
      customer:
        true,
    },
  });

if (
  existingUser
) {
  /*
   * Never automatically attach
   * social login to admin/staff
   * accounts.
   */
  if (
    existingUser.role !==
      "CUSTOMER" ||
    existingUser.status !==
      "ACTIVE" ||
    !existingUser.customer
  ) {
    return oauthErrorRedirect(
      request,
      provider,
      "account_unavailable",
    );
  }

  /*
   * Google returns a verified
   * email address, so an existing
   * customer with the exact same
   * email can safely connect their
   * Google identity.
   *
   * Facebook will remain separate
   * until we finalize its account
   * verification policy.
   */
    if (
        provider !==
        "GOOGLE"
    ) {
        return oauthErrorRedirect(
        request,
        provider,
        "existing_email",
        );
    }

    await db.oAuthAccount.create({
        data: {
        userId:
            existingUser.id,

        provider:
            "GOOGLE",

        providerAccountId:
            profile.providerAccountId,

        email:
            profile.email,
        },
    });

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
            existingUser.id,

        role:
            existingUser.role,

        name:
            existingUser.name,
        });

    await db.activityLog
        .create({
        data: {
            actorId:
            existingUser.id,

            action:
            "SOCIAL_ACCOUNT_LINKED",

            entityType:
            "User",

            entityId:
            existingUser.id,

            metadata: {
            provider:
                "GOOGLE",
            },
        },
        })
        .catch(
        () => undefined,
        );

    const response =
        NextResponse.redirect(
        new URL(
            "/account",
            getAppOrigin(
            request,
            ),
        ),
        );

    response.cookies.set(
        SESSION_COOKIE_NAME,
        sessionToken,
        {
        httpOnly:
            true,

        secure:
            isSecureCookie(),

        sameSite:
            "lax",

        path:
            "/",

        maxAge:
            SESSION_MAX_AGE_SECONDS,
        },
    );

    clearOAuthTemporaryCookies(
        response,
        provider,
    );

    return response;
    }

    /*
     * New social user.
     * Phone number is still required
     * by the Customer model.
     */
    const pendingToken =
      await createOAuthPendingToken({
        provider,

        providerAccountId:
          profile.providerAccountId,

        email:
          profile.email,

        name:
          profile.name,
      });

    const response =
      NextResponse.redirect(
        new URL(
          "/account/social-complete",
          getAppOrigin(
            request,
          ),
        ),
      );

    response.cookies.set(
      OAUTH_PENDING_COOKIE_NAME,
      pendingToken,
      {
        httpOnly:
          true,

        secure:
          isSecureCookie(),

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          OAUTH_PENDING_MAX_AGE_SECONDS,
      },
    );

    clearOAuthTemporaryCookies(
      response,
      provider,
    );

    return response;
  } catch (
    error
  ) {
    console.error(
      `${provider} OAuth callback error:`,
      error,
    );

    return oauthErrorRedirect(
      request,
      provider,
      "provider_error",
    );
  }
}