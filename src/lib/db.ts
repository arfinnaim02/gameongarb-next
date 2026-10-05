import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

/* =========================================================
   GLOBAL PRISMA SINGLETON
   ========================================================= */

const globalForPrisma =
  globalThis as unknown as {
    prisma?:
      PrismaClient;
  };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV ===
      "development"
        ? [
            "error",
            "warn",
          ]
        : [
            "error",
          ],
  });

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma =
    db;
}

/* =========================================================
   RETRY HELPERS
   ========================================================= */

function sleep(
  milliseconds:
    number,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function isRetryableDatabaseError(
  error:
    unknown,
) {
  if (
    error instanceof
    Prisma.PrismaClientInitializationError
  ) {
    return true;
  }

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    return [
      "P1001",
      "P1002",
      "P2024",
    ].includes(
      error.code,
    );
  }

  if (
    error instanceof
    Prisma.PrismaClientUnknownRequestError
  ) {
    const message =
      error.message
        .toLowerCase();

    return (
      message.includes(
        "engine is not yet connected",
      ) ||
      message.includes(
        "response from the engine was empty",
      ) ||
      message.includes(
        "connection pool",
      ) ||
      message.includes(
        "can't reach database server",
      )
    );
  }

  return false;
}

/* =========================================================
   SAFE DATABASE RETRY
   ========================================================= */

/**
 * Retries temporary Neon / Prisma
 * connection failures.
 *
 * IMPORTANT:
 * Never call db.$disconnect() here.
 * The Prisma client is shared by the
 * entire Next.js server.
 */
export async function withDatabaseRetry<T>(
  operation:
    () => Promise<T>,

  options?: {
    attempts?:
      number;

    initialDelayMs?:
      number;
  },
): Promise<T> {
  const attempts =
    Math.max(
      1,
      options?.attempts ??
        3,
    );

  const initialDelayMs =
    Math.max(
      100,
      options?.initialDelayMs ??
        500,
    );

  let lastError:
    unknown;

  for (
    let attempt =
      1;
    attempt <=
    attempts;
    attempt +=
      1
  ) {
    try {
      return await operation();
    } catch (
      error
    ) {
      lastError =
        error;

      if (
        !isRetryableDatabaseError(
          error,
        ) ||
        attempt ===
          attempts
      ) {
        throw error;
      }

      const delay =
        initialDelayMs *
        attempt;

      console.warn(
        `Database request failed. Retry ${attempt}/${attempts - 1} in ${delay}ms.`,
      );

      await sleep(
        delay,
      );
    }
  }

  throw lastError;
}