import {
  BkashApiError,
  getBkashErrorCategory,
  getBkashErrorMessage,
} from "@/lib/payments/bkash/errors";

import {
  getBkashConfig,
} from "@/lib/payments/bkash/config";

import {
  getSharedBkashAccessToken,
} from "@/lib/payments/bkash/token-cache";

import type {
  BkashAccessToken,
  BkashApiErrorPayload,
  BkashGrantTokenResponse,
} from "@/lib/payments/bkash/types";

/* =========================================================
   TOKEN CACHE

   Memory cache:
   Fast path inside the current Node/Vercel process.

   Shared Neon cache:
   Used across all serverless instances.

   PostgreSQL advisory locking prevents multiple instances
   from requesting Grant Token simultaneously.

   bKash specifically warned that Grant Token may only be
   called twice per hour.
   ========================================================= */

let cachedToken:
  BkashAccessToken |
  null =
    null;

let tokenPromise:
  Promise<string> |
  null =
    null;

const TOKEN_EXPIRY_BUFFER_MS =
  5 *
  60 *
  1000;

/* =========================================================
   REQUEST HELPERS
   ========================================================= */

async function parseJsonSafe(
  response:
    Response,
) {
  try {
    return await response
      .json();
  } catch {
    return null;
  }
}

function tokenStillValid() {
  if (
    !cachedToken
  ) {
    return false;
  }

  return (
    cachedToken.expiresAt -
      TOKEN_EXPIRY_BUFFER_MS >
    Date.now()
  );
}

function buildUrl(
  path:
    string,
) {
  const config =
    getBkashConfig();

  return `${config.baseUrl}${path}`;
}

/* =========================================================
   GRANT TOKEN
   ========================================================= */

async function requestGrantToken() {
  const config =
    getBkashConfig();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      config.timeoutMs,
    );

  try {
    const response =
      await fetch(
        buildUrl(
          "/tokenized/checkout/token/grant",
        ),
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",

            accept:
              "application/json",

            username:
              config.username,

            password:
              config.password,
          },

          body:
            JSON.stringify({
              app_key:
                config.appKey,

              app_secret:
                config.appSecret,
            }),

          signal:
            controller.signal,

          cache:
            "no-store",
        },
      );

    const payload =
      (
        await parseJsonSafe(
          response,
        )
      ) as
        BkashGrantTokenResponse |
        null;

    if (
      !response.ok
    ) {
      const errorPayload =
        payload as
          BkashApiErrorPayload |
          null;

      const code =
        errorPayload
          ?.errorCode ??
        errorPayload
          ?.statusCode ??
        null;

      const message =
        getBkashErrorMessage(
          errorPayload,
        );

      throw new BkashApiError({
        status:
          response.status,

        code,

        message,

        category:
          getBkashErrorCategory({
            status:
              response.status,

            code,

            message,
          }),

        payload:
          errorPayload,
      });
    }

    const token =
      payload?.id_token;

    if (
      !token ||
      typeof token !==
        "string"
    ) {
      throw new BkashApiError({
        status:
          response.status,

        message:
          "bKash Grant Token API did not return id_token.",

        payload:
          payload as
            BkashApiErrorPayload |
            null,
      });
    }

    const expiresInSeconds =
      typeof payload
        ?.expires_in ===
        "number"
        ? payload.expires_in
        : 3600;

    const accessToken:
      BkashAccessToken = {
      token,

      expiresAt:
        Date.now() +
        expiresInSeconds *
          1000,
    };

    return accessToken;
  } catch (
    error
  ) {
    if (
      error instanceof
        BkashApiError
    ) {
      throw error;
    }

    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      throw new BkashApiError({
        message:
          "bKash Grant Token API timed out after 30 seconds.",
      });
    }

    throw new BkashApiError({
      message:
        error instanceof
          Error
          ? error.message
          : "Unable to request bKash Grant Token.",
    });
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

/* =========================================================
   GET ACCESS TOKEN
   ========================================================= */

export async function getBkashAccessToken() {
  /*
   * Fastest path:
   * use the current process memory cache.
   */
  if (
    tokenStillValid() &&
    cachedToken
  ) {
    return cachedToken.token;
  }

  /*
   * Requests arriving simultaneously inside the same
   * process share one promise.
   */
  if (
    tokenPromise
  ) {
    return tokenPromise;
  }

  tokenPromise =
    (
      async () => {
        /*
         * Across different Vercel instances, Neon +
         * PostgreSQL advisory locking becomes the shared
         * source of truth.
         */
        const accessToken =
          await getSharedBkashAccessToken(
            requestGrantToken,
          );

        cachedToken =
          accessToken;

        return accessToken.token;
      }
    )();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise =
      null;
  }
}

/* =========================================================
   GENERIC AUTHENTICATED REQUEST

   Stage 2/3 will use this for:
   Create
   Execute
   Query
   Search
   Refund
   ========================================================= */

export async function bkashRequest<T>({
  path,
  method =
    "POST",
  body,
}: {
  path:
    string;

  method?:
    "GET" |
    "POST";

  body?:
    unknown;
}): Promise<T> {
  const config =
    getBkashConfig();

  const token =
    await getBkashAccessToken();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      config.timeoutMs,
    );

  try {
    const response =
      await fetch(
        buildUrl(
          path,
        ),
        {
          method,

          headers: {
            "content-type":
              "application/json",

            accept:
              "application/json",

          authorization:
            token,

            "x-app-key":
              config.appKey,
          },

          ...(body !==
          undefined
            ? {
                body:
                  JSON.stringify(
                    body,
                  ),
              }
            : {}),

          signal:
            controller.signal,

          cache:
            "no-store",
        },
      );

    const payload =
      await parseJsonSafe(
        response,
      );

    if (
      !response.ok
    ) {
      const errorPayload =
        payload as
          BkashApiErrorPayload |
          null;

      throw new BkashApiError({
        status:
          response.status,

        code:
          errorPayload
            ?.errorCode ??
          errorPayload
            ?.statusCode ??
          null,

        message:
          getBkashErrorMessage(
            errorPayload,
          ),

        payload:
          errorPayload,
      });
    }

    return payload as T;
  } catch (
    error
  ) {
    if (
      error instanceof
        BkashApiError
    ) {
      throw error;
    }

    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      throw new BkashApiError({
        message:
          "bKash API request timed out after 30 seconds.",
      });
    }

    throw new BkashApiError({
      message:
        error instanceof
          Error
          ? error.message
          : "Unable to communicate with bKash.",
    });
  } finally {
    clearTimeout(
      timeout,
    );
  }
}