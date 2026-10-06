import type { Prisma } from "@prisma/client";

const FIRST_ORDER_NUMBER = 20_260_001n;
const ORDER_NUMBER_LOCK = 20_260_001;

type OrderNumberRow = {
  max_number: bigint | null;
};

/**
 * Generate the next Game On Garb order number.
 *
 * Format:
 * GOG-20260001
 * GOG-20260002
 * GOG-20260003
 * ...
 *
 * PostgreSQL transaction-level advisory locking serializes the
 * number-generation step, so two simultaneous checkouts cannot
 * receive the same order number. If a transaction rolls back, the
 * number is not consumed because the lookup happens inside the same
 * database transaction. Older date-based order numbers are ignored.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(${ORDER_NUMBER_LOCK})
  `;

  const rows =
    await tx.$queryRaw<OrderNumberRow[]>`
      SELECT
        MAX(
          CAST(
            SUBSTRING(
              "number"
              FROM '^GOG-([0-9]+)$'
            )
            AS BIGINT
          )
        ) AS "max_number"
      FROM "Order"
      WHERE "number" ~ '^GOG-[0-9]+$'
    `;

  const current =
    rows[0]?.max_number ??
    (FIRST_ORDER_NUMBER - 1n);

  const next =
    current < FIRST_ORDER_NUMBER
      ? FIRST_ORDER_NUMBER
      : current + 1n;

  return `GOG-${next.toString()}`;
}
