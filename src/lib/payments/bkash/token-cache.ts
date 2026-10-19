import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import type {
  Prisma,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  getBkashConfig,
} from "@/lib/payments/bkash/config";

import type {
  BkashAccessToken,
} from "@/lib/payments/bkash/types";

/* =========================================================
   CONSTANTS
   ========================================================= */

const CACHE_KEY =
  "bkash_token_cache";

const TOKEN_EXPIRY_BUFFER_MS =
  5 *
  60 *
  1000;

/*
 * PostgreSQL advisory lock.
 *
 * Every Vercel instance uses these same lock numbers,
 * so only one process may refresh the token at a time.
 */
const LOCK_NAMESPACE =
  73115;

const LOCK_KEY =
  24001;

/* =========================================================
   TYPES
   ========================================================= */

type StoredTokenCache = {
  version:
    1;

  iv:
    string;

  authTag:
    string;

  ciphertext:
    string;

  expiresAt:
    number;
};

/* =========================================================
   ENCRYPTION KEY
   ========================================================= */

function getEncryptionKey() {
  const config =
    getBkashConfig();

  const value =
    config.tokenEncryptionKey;

  if (
    !/^[a-fA-F0-9]{64}$/.test(
      value,
    )
  ) {
    throw new Error(
      "BKASH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal key.",
    );
  }

  return Buffer.from(
    value,
    "hex",
  );
}

/* =========================================================
   ENCRYPT
   ========================================================= */

function encryptToken(
  token:
    string,
) {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(
      12,
    );

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        token,
        "utf8",
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  return {
    iv:
      iv.toString(
        "base64",
      ),

    authTag:
      authTag.toString(
        "base64",
      ),

    ciphertext:
      encrypted.toString(
        "base64",
      ),
  };
}

/* =========================================================
   DECRYPT
   ========================================================= */

function decryptToken({
  iv,
  authTag,
  ciphertext,
}: {
  iv:
    string;

  authTag:
    string;

  ciphertext:
    string;
}) {
  const key =
    getEncryptionKey();

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(
        iv,
        "base64",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      authTag,
      "base64",
    ),
  );

  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          ciphertext,
          "base64",
        ),
      ),

      decipher.final(),
    ]);

  return decrypted.toString(
    "utf8",
  );
}

/* =========================================================
   PARSE CACHE
   ========================================================= */

function parseStoredCache(
  value:
    unknown,
): StoredTokenCache | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  if (
    candidate.version !==
      1 ||
    typeof candidate.iv !==
      "string" ||
    typeof candidate.authTag !==
      "string" ||
    typeof candidate.ciphertext !==
      "string" ||
    typeof candidate.expiresAt !==
      "number"
  ) {
    return null;
  }

  return {
    version:
      1,

    iv:
      candidate.iv,

    authTag:
      candidate.authTag,

    ciphertext:
      candidate.ciphertext,

    expiresAt:
      candidate.expiresAt,
  };
}

/* =========================================================
   CACHE VALIDITY
   ========================================================= */

function cacheStillValid(
  expiresAt:
    number,
) {
  return (
    expiresAt -
      TOKEN_EXPIRY_BUFFER_MS >
    Date.now()
  );
}

/* =========================================================
   READ CACHE
   ========================================================= */

async function readSharedToken(
  tx:
    Prisma.TransactionClient,
): Promise<BkashAccessToken | null> {
  const row =
    await tx.storeSetting.findUnique({
      where: {
        key:
          CACHE_KEY,
      },

      select: {
        value:
          true,
      },
    });

  if (
    !row
  ) {
    return null;
  }

  const stored =
    parseStoredCache(
      row.value,
    );

  if (
    !stored ||
    !cacheStillValid(
      stored.expiresAt,
    )
  ) {
    return null;
  }

  try {
    const token =
      decryptToken({
        iv:
          stored.iv,

        authTag:
          stored.authTag,

        ciphertext:
          stored.ciphertext,
      });

    if (
      !token
    ) {
      return null;
    }

    return {
      token,

      expiresAt:
        stored.expiresAt,
    };
  } catch (
    error
  ) {
    console.error(
      "Unable to decrypt shared bKash token cache:",
      error instanceof
        Error
        ? error.message
        : "Unknown decryption error",
    );

    return null;
  }
}

/* =========================================================
   WRITE CACHE
   ========================================================= */

async function writeSharedToken(
  tx:
    Prisma.TransactionClient,

  accessToken:
    BkashAccessToken,
) {
  const encrypted =
    encryptToken(
      accessToken.token,
    );

  const value:
    StoredTokenCache = {
    version:
      1,

    iv:
      encrypted.iv,

    authTag:
      encrypted.authTag,

    ciphertext:
      encrypted.ciphertext,

    expiresAt:
      accessToken.expiresAt,
  };

  await tx.storeSetting.upsert({
    where: {
      key:
        CACHE_KEY,
    },

    update: {
      value,

      isSecret:
        true,
    },

    create: {
      key:
        CACHE_KEY,

      value,

      isSecret:
        true,
    },
  });
}

/* =========================================================
   GET SHARED ACCESS TOKEN

   Flow:

   1. Acquire PostgreSQL advisory transaction lock.
   2. Re-check shared DB cache after obtaining lock.
   3. Only if expired/missing, call Grant Token.
   4. Encrypt and persist new token.
   5. Transaction ends and automatically releases lock.

   This prevents multiple Vercel instances from refreshing
   the token simultaneously.
   ========================================================= */

export async function getSharedBkashAccessToken(
  refresh:
    () =>
      Promise<BkashAccessToken>,
): Promise<BkashAccessToken> {
  return db.$transaction(
    async (
      tx,
    ) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${LOCK_NAMESPACE}::integer,
          ${LOCK_KEY}::integer
        )
      `;

      /*
       * Another server may have refreshed the token
       * while this request was waiting for the lock.
       *
       * Therefore always read AFTER acquiring it.
       */
      const cached =
        await readSharedToken(
          tx,
        );

      if (
        cached
      ) {
        console.info(
          "bKash access token loaded from shared cache.",
        );

        return cached;
      }

      /*
       * We own the distributed lock and no valid token
       * exists. This process is the only one allowed to
       * request a new Grant Token now.
       */
      const fresh =
        await refresh();

      await writeSharedToken(
        tx,
        fresh,
      );

      console.info(
        "bKash access token refreshed and stored in shared cache.",
      );

      return fresh;
    },

    {
      maxWait:
        15_000,

      /*
       * Grant Token itself may take up to 30 seconds.
       * Allow enough time for network request + DB work.
       */
      timeout:
        60_000,
    },
  );
}