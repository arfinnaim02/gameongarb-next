import {
  NextResponse,
} from "next/server";

import type {
  Prisma,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  refreshTelegramOrderMessage,
} from "@/lib/telegram";

import {
  bkashRequest,
} from "@/lib/payments/bkash/client";

import type {
  BkashPaymentResult,
} from "@/lib/payments/bkash/types";

function getPaymentId(
  result:
    BkashPaymentResult,
) {
  return (
    result.paymentId ??
    result.paymentID ??
    null
  );
}

function getTrxId(
  result:
    BkashPaymentResult,
) {
  return (
    result.trxId ??
    result.trxID ??
    null
  );
}

function isCompleted(
  result:
    BkashPaymentResult,
) {
  return (
    result.transactionStatus ===
    "Completed"
  );
}

function isPending(
  result:
    BkashPaymentResult,
) {
  return (
    result.transactionStatus ===
      "Initiated" ||
    result.transactionStatus ===
      "Processing"
  );
}

function getSafePayloadObject(
  value:
    Prisma.JsonValue |
    null,
): Prisma.JsonObject {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as
      Prisma.JsonObject;
  }

  return {};
}

function resultUrl(
  req:
    Request,

  orderNumber:
    string,

  status:
    string,
) {
  const url =
    new URL(
      `/checkout/success/${orderNumber}`,
      req.url,
    );

  url.searchParams.set(
    "advancePayment",
    status,
  );

  return url;
}

async function queryPayment(
  paymentId:
    string,
) {
  return bkashRequest<BkashPaymentResult>({
    path:
      "/tokenized/checkout/payment/status",

    body: {
      paymentID:
        paymentId,
    },
  });
}

export async function handleDeliveryAdvanceBkashCallback({
  req,
  paymentId,
  callbackStatus,
}: {
  req:
    Request;

  paymentId:
    string;

  callbackStatus:
    string |
    undefined;
}) {
  const advancePayment =
    await db.deliveryAdvancePayment.findUnique({
      where: {
        providerPaymentId:
          paymentId,
      },

      include: {
        order:
          true,
      },
    });

  /*
   * This payment ID does not belong to
   * the delivery-advance flow.
   *
   * Returning null allows the existing
   * full-order bKash callback to continue
   * exactly as before.
   */
  if (
    !advancePayment
  ) {
    return null;
  }

  const order =
    advancePayment.order;

  const originalPayload =
    getSafePayloadObject(
      advancePayment.safePayload,
    );

  const expectedInvoice =
    typeof originalPayload
      .merchantInvoiceNumber ===
      "string"
      ? originalPayload
          .merchantInvoiceNumber
      : null;

  /*
   * Idempotency.
   *
   * Never credit an already-paid
   * delivery advance twice.
   */
  if (
    advancePayment.status ===
    "PAID"
  ) {
    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "success",
      ),
    );
  }

  /*
   * Customer cancelled only this
   * delivery-charge payment attempt.
   *
   * The COD order itself must remain active.
   */
  if (
    callbackStatus ===
    "cancel"
  ) {
    await db.deliveryAdvancePayment.update({
      where: {
        id:
          advancePayment.id,
      },

      data: {
        status:
          "FAILED",

        safePayload: {
          ...originalPayload,

          paymentId,

          callbackStatus:
            "cancel",
        },
      },
    });

    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "cancelled",
      ),
    );
  }

  /*
   * bKash reported failure.
   *
   * Do not:
   * - cancel order
   * - restore inventory
   * - change order.paymentStatus
   */
  if (
    callbackStatus ===
    "failure"
  ) {
    await db.deliveryAdvancePayment.update({
      where: {
        id:
          advancePayment.id,
      },

      data: {
        status:
          "FAILED",

        safePayload: {
          ...originalPayload,

          paymentId,

          callbackStatus:
            "failure",
        },
      },
    });

    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "failed",
      ),
    );
  }

  if (
    callbackStatus !==
      "success"
  ) {
    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "failed",
      ),
    );
  }

  let result:
    BkashPaymentResult;

  let verificationSource:
    "EXECUTE" |
    "QUERY" =
      "EXECUTE";

  try {
    const executeResult =
      await bkashRequest<BkashPaymentResult>({
        path:
          "/tokenized/checkout/execute",

        body: {
          paymentID:
            paymentId,
        },
      });

    if (
      isCompleted(
        executeResult,
      ) &&
      getTrxId(
        executeResult,
      )
    ) {
      result =
        executeResult;
    } else {
      result =
        await queryPayment(
          paymentId,
        );

      verificationSource =
        "QUERY";
    }
  } catch (
    executeError
  ) {
    console.error(
      "Delivery advance bKash Execute failed:",
      {
        paymentId,
        executeError,
      },
    );

    try {
      result =
        await queryPayment(
          paymentId,
        );

      verificationSource =
        "QUERY";
    } catch (
      queryError
    ) {
      console.error(
        "Delivery advance bKash Query failed:",
        {
          paymentId,
          queryError,
        },
      );

      return NextResponse.redirect(
        resultUrl(
          req,
          order.number,
          "pending",
        ),
      );
    }
  }

  /*
   * Initiated / Processing is not failure.
   */
  if (
    isPending(
      result,
    )
  ) {
    await db.deliveryAdvancePayment.update({
      where: {
        id:
          advancePayment.id,
      },

      data: {
        status:
          "PROCESSING",

        safePayload: {
          ...originalPayload,

          paymentId,

          transactionStatus:
            result.transactionStatus ??
            null,

          verificationSource,
        },
      },
    });

    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "pending",
      ),
    );
  }

  const resultPaymentId =
    getPaymentId(
      result,
    );

  const trxId =
    getTrxId(
      result,
    );

  const resultAmount =
    Number(
      result.amount,
    );

  const expectedAmount =
    Number(
      advancePayment.amount,
    );

  const resultInvoice =
    result.merchantInvoiceNumber ??
    result.merchantInvoice ??
    null;

  const invoiceMatches =
    Boolean(
      expectedInvoice,
    ) &&
    Boolean(
      resultInvoice,
    ) &&
    resultInvoice ===
      expectedInvoice;

  const paymentIdMatches =
    resultPaymentId ===
      paymentId;

  const amountMatches =
    Number.isFinite(
      resultAmount,
    ) &&
    Math.abs(
      resultAmount -
        expectedAmount,
    ) <
      0.01;

  const currencyMatches =
    !result.currency ||
    result.currency ===
      "BDT";

  /*
   * Never credit the order unless
   * bKash verification matches.
   */
  if (
    !isCompleted(
      result,
    ) ||
    !trxId ||
    !paymentIdMatches ||
    !amountMatches ||
    !invoiceMatches ||
    !currencyMatches
  ) {
    console.error(
      "Delivery advance bKash verification failed:",
      {
        orderNumber:
          order.number,

        paymentId,

        resultPaymentId,

        trxId,

        transactionStatus:
          result.transactionStatus,

        resultAmount:
          result.amount,

        expectedAmount,

        expectedInvoice,

        resultInvoice,

        currency:
          result.currency,

        verificationSource,
      },
    );

    await db.deliveryAdvancePayment.update({
      where: {
        id:
          advancePayment.id,
      },

      data: {
        status:
          "PROCESSING",

        safePayload: {
          ...originalPayload,

          paymentId,

          resultPaymentId,

          trxId,

          transactionStatus:
            result.transactionStatus ??
            null,

          amount:
            result.amount ??
            null,

          currency:
            result.currency ??
            null,

          merchantInvoiceNumber:
            resultInvoice,

          verificationSource,

          verification:
            "REVIEW_REQUIRED",
        },
      },
    });

    return NextResponse.redirect(
      resultUrl(
        req,
        order.number,
        "pending",
      ),
    );
  }

  /*
   * Financial update.
   *
   * DeliveryAdvancePayment + Order are
   * updated atomically.
   */
  await db.$transaction(
    async (
      tx,
    ) => {
      const freshAdvance =
        await tx.deliveryAdvancePayment.findUnique({
          where: {
            id:
              advancePayment.id,
          },
        });

      if (
        !freshAdvance ||
        freshAdvance.status ===
          "PAID"
      ) {
        return;
      }

      const freshOrder =
        await tx.order.findUnique({
          where: {
            id:
              order.id,
          },
        });

      if (
        !freshOrder
      ) {
        throw new Error(
          "Order was not found while completing delivery advance payment.",
        );
      }

      /*
       * Never credit more than the
       * delivery charge.
       */
      const deliveryCharge =
        Number(
          freshOrder
            .deliveryCharge,
        );

      if (
        Math.abs(
          expectedAmount -
            deliveryCharge,
        ) >=
        0.01
      ) {
        throw new Error(
          "Delivery advance amount no longer matches the order delivery charge.",
        );
      }

      const alreadyPaid =
        Number(
          freshOrder
            .deliveryAdvancePaid,
        );

      if (
        alreadyPaid >=
        deliveryCharge
      ) {
        await tx.deliveryAdvancePayment.update({
          where: {
            id:
              advancePayment.id,
          },

          data: {
            status:
              "PAID",

            trxId,

            safePayload: {
              paymentId,

              trxId,

              transactionStatus:
                result.transactionStatus,

              amount:
                result.amount,

              currency:
                result.currency,

             merchantInvoiceNumber:
                resultInvoice,

              verificationSource,

              alreadyCredited:
                true,
            },
          },
        });

        return;
      }

      await tx.deliveryAdvancePayment.update({
        where: {
          id:
            advancePayment.id,
        },

        data: {
          status:
            "PAID",

          trxId,

          safePayload: {
            paymentId,

            trxId,

            transactionStatus:
              result.transactionStatus,

            amount:
              result.amount,

            currency:
              result.currency,

            paymentExecuteTime:
              result.paymentExecuteTime ??
              null,

            payerReference:
              result.payerReference ??
              null,

            payerAccount:
              result.payerAccount ??
              null,

            verificationSource,
          },
        },
      });

      await tx.order.update({
        where: {
          id:
            order.id,
        },

        data: {
          deliveryAdvancePaid:
            expectedAmount,

          deliveryAdvanceReference:
            trxId,

          deliveryAdvancePaidAt:
            new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          action:
            "ORDER_DELIVERY_ADVANCE_BKASH_PAID",

          entityType:
            "Order",

          entityId:
            order.id,

          metadata: {
            orderNumber:
              order.number,

            amount:
              expectedAmount,

            trxId,

            paymentId,

            remainingCod:
              Math.max(
                0,
                Number(
                  order.total,
                ) -
                  expectedAmount,
              ),
          },
        },
      });
    },
  );

  await refreshTelegramOrderMessage(
    order.id,
  ).catch(
    (
      error,
    ) => {
      console.error(
        "Telegram refresh after delivery advance bKash success failed:",
        error,
      );
    },
  );

  return NextResponse.redirect(
    resultUrl(
      req,
      order.number,
      "success",
    ),
  );
}