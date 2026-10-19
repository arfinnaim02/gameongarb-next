import {
  NextResponse,
} from "next/server";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  searchBkashTransaction,
} from "@/lib/payments/bkash/search-transaction";

import {
  BkashApiError,
} from "@/lib/payments/bkash/errors";

export const dynamic =
  "force-dynamic";

export async function POST(
  _request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (
    !admin
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized.",
      },
      {
        status:
          401,
      },
    );
  }

  if (
    !hasPermission(
      admin.role,
      "orders",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Forbidden.",
      },
      {
        status:
          403,
      },
    );
  }

  const {
    id,
  } =
    await params;

  try {
    const order =
      await db.order.findUnique({
        where: {
          id,
        },

        select: {
          id:
            true,

          number:
            true,

          total:
            true,

          paymentMethod:
            true,

          paymentStatus:
            true,

          payments: {
            where: {
              method:
                "BKASH",
            },

            orderBy: {
              createdAt:
                "desc",
            },

            select: {
              id:
                true,

              status:
                true,

              amount:
                true,

              providerReference:
                true,

              transactions: {
                where: {
                  externalId: {
                    not:
                      null,
                  },
                },

                orderBy: {
                  createdAt:
                    "desc",
                },

                select: {
                  externalId:
                    true,

                  type:
                    true,

                  status:
                    true,

                  createdAt:
                    true,
                },
              },
            },
          },
        },
      });

    if (
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      order.paymentMethod !==
      "BKASH"
    ) {
      return NextResponse.json(
        {
          error:
            "This is not a bKash order.",
        },
        {
          status:
            400,
        },
      );
    }

    const payment =
      order.payments[0];

    if (
      !payment
    ) {
      return NextResponse.json(
        {
          error:
            "bKash payment record not found.",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * CREATE transaction externalId is paymentId,
     * not trxID.
     *
     * Therefore only use a PAID transaction as the
     * source of the real bKash trxID.
     */
    const transaction =
      payment.transactions.find(
        (
          item,
        ) =>
          item.status ===
            "PAID" &&
          item.type !==
            "CREATE" &&
          Boolean(
            item.externalId,
          ),
      );

    const trxId =
      transaction
        ?.externalId
        ?.trim();

    if (
      !trxId
    ) {
      return NextResponse.json(
        {
          error:
            "No completed bKash transaction ID is stored for this order.",
        },
        {
          status:
            409,
        },
      );
    }

    const result =
      await searchBkashTransaction(
        trxId,
      );

    const remoteTrxId =
      result.trxId
        ?.trim() ??
      "";

    const remoteStatus =
      result.transactionStatus
        ?.trim() ??
      "";

    const remoteCurrency =
      result.currency
        ?.trim()
        .toUpperCase() ??
      "";

    const remoteAmount =
      Number(
        result.amount,
      );

    const localAmount =
      Number(
        order.total,
      );

    const trxMatches =
      remoteTrxId ===
      trxId;

    const statusCompleted =
      remoteStatus ===
      "Completed";

    const amountMatches =
      Number.isFinite(
        remoteAmount,
      ) &&
      Math.abs(
        remoteAmount -
          localAmount,
      ) <
        0.01;

    const currencyMatches =
      remoteCurrency ===
      "BDT";

    const verified =
      trxMatches &&
      statusCompleted &&
      amountMatches &&
      currencyMatches;

    const checkedAt =
      new Date();

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          verified
            ? "BKASH_TRANSACTION_VERIFIED"
            : "BKASH_TRANSACTION_MISMATCH",

        entityType:
          "Order",

        entityId:
          order.id,

        metadata: {
          provider:
            "BKASH",

          orderNumber:
            order.number,

          paymentId:
            payment.providerReference,

          trxId,

          remoteTrxId,

          localPaymentStatus:
            order.paymentStatus,

          remoteTransactionStatus:
            remoteStatus,

          localAmount,

          remoteAmount:
            Number.isFinite(
              remoteAmount,
            )
              ? remoteAmount
              : null,

          remoteCurrency,

          trxMatches,

          statusCompleted,

          amountMatches,

          currencyMatches,

          verified,

          checkedAt:
            checkedAt.toISOString(),
        },
      },
    });

    return NextResponse.json({
      message:
        verified
          ? "bKash transaction verified successfully."
          : "bKash transaction does not fully match this order.",

      result: {
        verified,

        checkedAt:
          checkedAt.toISOString(),

        trxId:
          remoteTrxId ||
          trxId,

        transactionStatus:
          remoteStatus ||
          null,

        amount:
          Number.isFinite(
            remoteAmount,
          )
            ? remoteAmount
            : null,

        currency:
          remoteCurrency ||
          null,

        payerAccount:
          result.payerAccount ??
          null,

        organizationAccount:
          result.organizationAccount ??
          null,

        initiationTime:
          result.initiationTime ??
          null,

        completedTime:
          result.completedTime ??
          null,

        serviceFee:
          result.serviceFee ??
          null,

        creditedAmount:
          result.creditedAmount ??
          null,

        maxRefundableAmount:
          result.maxRefundableAmount ??
          null,

        checks: {
          trxMatches,

          statusCompleted,

          amountMatches,

          currencyMatches,
        },
      },
    });
  } catch (
    error
  ) {
    console.error(
      "bKash transaction verification error:",
      error,
    );

    if (
      error instanceof
        BkashApiError
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to verify this transaction with bKash right now.",
        },
        {
          status:
            error.status &&
            error.status >=
              400 &&
            error.status <
              600
              ? error.status
              : 502,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to verify bKash transaction.",
      },
      {
        status:
          500,
      },
    );
  }
}