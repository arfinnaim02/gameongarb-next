import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/lib/db";

import {
  bkashRequest,
} from "@/lib/payments/bkash/client";

import {
  BkashApiError,
} from "@/lib/payments/bkash/errors";

import type {
  BkashPaymentResult,
} from "@/lib/payments/bkash/types";

export const dynamic =
  "force-dynamic";

/* =========================================================
   HELPERS
   ========================================================= */

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

function isExecuteTimeout(
  error:
    unknown,
) {
  return (
    error instanceof
      BkashApiError &&
    error.status ===
      null &&
    error.message
      .toLowerCase()
      .includes(
        "timed out",
      )
  );
}

function resultUrl(
  req:
    Request,

  params: {
    status:
      string;

    order?:
      string;

    message?:
      string;
  },
) {
  const url =
    new URL(
      "/payment/bkash/result",
      req.url,
    );

  url.searchParams.set(
    "status",
    params.status,
  );

  if (
    params.order
  ) {
    url.searchParams.set(
      "order",
      params.order,
    );
  }

  if (
    params.message
  ) {
    url.searchParams.set(
      "message",
      params.message,
    );
  }

  return url;
}

/* =========================================================
   QUERY PAYMENT
   ========================================================= */

async function queryBkashPayment(
  paymentId:
    string,
) {
  return bkashRequest<BkashPaymentResult>({
    path:
      "/tokenized-checkout/payment/status",

    body: {
      paymentId,
    },
  });
}

/* =========================================================
   GET CALLBACK
   ========================================================= */

export async function GET(
  req:
    Request,
) {
  const url =
    new URL(
      req.url,
    );

  const paymentId =
    url.searchParams.get(
      "paymentID",
    ) ??
    url.searchParams.get(
      "paymentId",
    );

  const callbackStatus =
    url.searchParams
      .get(
        "status",
      )
      ?.toLowerCase();

  if (
    !paymentId
  ) {
    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "failed",

          message:
            "Missing bKash payment ID.",
        },
      ),
    );
  }

  /* =======================================================
     FIND LOCAL PAYMENT
     ======================================================= */

  const payment =
    await db.payment.findFirst({
      where: {
        providerReference:
          paymentId,

        method:
          "BKASH",
      },

      include: {
        order:
          true,

        transactions: {
          orderBy: {
            createdAt:
              "desc",
          },
        },
      },
    });

  if (
    !payment
  ) {
    console.error(
      "bKash callback payment not found:",
      {
        paymentId,
        callbackStatus,
      },
    );

    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "failed",

          message:
            "Payment record was not found.",
        },
      ),
    );
  }

  const order =
    payment.order;

  /* =======================================================
     IDEMPOTENT PAID CALLBACK
     ======================================================= */

  if (
    payment.status ===
      "PAID" &&
    order.paymentStatus ===
      "PAID"
  ) {
    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "success",

          order:
            order.number,
        },
      ),
    );
  }

  /* =======================================================
     CUSTOMER CANCELLED
     ======================================================= */

  if (
    callbackStatus ===
      "cancel"
  ) {
    await db.$transaction(
      async (
        tx,
      ) => {
        await tx.payment.update({
          where: {
            id:
              payment.id,
          },

          data: {
            status:
              "FAILED",
          },
        });

        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "FAILED",
          },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentId:
              payment.id,

            type:
              "CANCEL",

            amount:
              payment.amount,

            status:
              "FAILED",

            safePayload: {
              paymentId,

              callbackStatus:
                "cancel",
            },
          },
        });
      },
    );

    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "cancelled",

          order:
            order.number,

          message:
            "Payment Cancelled",
        },
      ),
    );
  }

  /* =======================================================
     BKASH FAILURE CALLBACK
     ======================================================= */

  if (
    callbackStatus ===
      "failure"
  ) {
    await db.$transaction(
      async (
        tx,
      ) => {
        await tx.payment.update({
          where: {
            id:
              payment.id,
          },

          data: {
            status:
              "FAILED",
          },
        });

        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "FAILED",
          },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentId:
              payment.id,

            type:
              "FAILURE_CALLBACK",

            amount:
              payment.amount,

            status:
              "FAILED",

            safePayload: {
              paymentId,

              callbackStatus:
                "failure",
            },
          },
        });
      },
    );

    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "failed",

          order:
            order.number,

          message:
            "Payment Failed",
        },
      ),
    );
  }

  /* =======================================================
     UNKNOWN CALLBACK
     ======================================================= */

  if (
    callbackStatus !==
      "success"
  ) {
    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "failed",

          order:
            order.number,

          message:
            "Invalid bKash callback status.",
        },
      ),
    );
  }

  /* =======================================================
     EXECUTE PAYMENT
     ======================================================= */

  let result:
    BkashPaymentResult;

  let source:
    "EXECUTE" |
    "QUERY" =
      "EXECUTE";

  try {
    const executeResult =
      await bkashRequest<BkashPaymentResult>({
        path:
          "/tokenized-checkout/payment/execute",

        body: {
          paymentId,
        },
      });

    /*
     * If Execute returns an uncertain result,
     * Query Payment is the source of truth.
     */
    if (
      !isCompleted(
        executeResult,
      ) ||
      !getTrxId(
        executeResult,
      )
    ) {
      result =
        await queryBkashPayment(
          paymentId,
        );

      source =
        "QUERY";
    } else {
      result =
        executeResult;
    }
  } catch (
    error
  ) {
    /*
     * bKash specifically requires Query Payment
     * if Execute times out / no response is received.
     */
    if (
      isExecuteTimeout(
        error,
      )
    ) {
      try {
        result =
          await queryBkashPayment(
            paymentId,
          );

        source =
          "QUERY";
      } catch (
        queryError
      ) {
        console.error(
          "bKash Query Payment failed after Execute timeout:",
          {
            paymentId,
            queryError,
          },
        );

        return NextResponse.redirect(
          resultUrl(
            req,
            {
              status:
                "pending",

              order:
                order.number,

              message:
                "Payment verification is still pending.",
            },
          ),
        );
      }
    } else {
      console.error(
        "bKash Execute Payment failed:",
        {
          paymentId,
          error,
        },
      );

      /*
       * Even after a non-timeout Execute error,
       * perform one Query before deciding the final state.
       */
      try {
        result =
          await queryBkashPayment(
            paymentId,
          );

        source =
          "QUERY";
      } catch (
        queryError
      ) {
        console.error(
          "bKash Query Payment also failed:",
          {
            paymentId,
            queryError,
          },
        );

        return NextResponse.redirect(
          resultUrl(
            req,
            {
              status:
                "failed",

              order:
                order.number,

              message:
                "Unable to verify bKash payment.",
            },
          ),
        );
      }
    }
  }

  /* =======================================================
     VERIFY RESULT
     ======================================================= */

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

  const orderAmount =
    Number(
      order.total,
    );

  const invoiceMatches =
    !result.merchantInvoiceNumber ||
    result.merchantInvoiceNumber ===
      order.number;

  const paymentIdMatches =
    resultPaymentId ===
      paymentId;

  const amountMatches =
    Number.isFinite(
      resultAmount,
    ) &&
    Math.abs(
      resultAmount -
        orderAmount,
    ) <
      0.01;

  const currencyMatches =
    !result.currency ||
    result.currency ===
      "BDT";

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
      "bKash verification failed:",
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

        orderAmount,

        currency:
          result.currency,

        merchantInvoiceNumber:
          result.merchantInvoiceNumber,

        source,
      },
    );

    await db.$transaction(
      async (
        tx,
      ) => {
        await tx.payment.update({
          where: {
            id:
              payment.id,
          },

          data: {
            status:
              "FAILED",
          },
        });

        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "FAILED",
          },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentId:
              payment.id,

            type:
              `${source}_VERIFICATION_FAILED`,

            amount:
              payment.amount,

            status:
              "FAILED",

            safePayload: {
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
                result.merchantInvoiceNumber ??
                null,
            },
          },
        });
      },
    );

    return NextResponse.redirect(
      resultUrl(
        req,
        {
          status:
            "failed",

          order:
            order.number,

          message:
            "Payment could not be verified.",
        },
      ),
    );
  }

  /* =======================================================
     MARK PAYMENT AS PAID
     ======================================================= */

  await db.$transaction(
    async (
      tx,
    ) => {
      const freshPayment =
        await tx.payment.findUnique({
          where: {
            id:
              payment.id,
          },
        });

      /*
       * Prevent duplicate callback processing.
       */
      if (
        freshPayment?.status ===
        "PAID"
      ) {
        return;
      }

      await tx.payment.update({
        where: {
          id:
            payment.id,
        },

        data: {
          status:
            "PAID",
        },
      });

      await tx.order.update({
        where: {
          id:
            order.id,
        },

        data: {
          paymentStatus:
            "PAID",
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId:
            payment.id,

          type:
            source,

          externalId:
            trxId,

          amount:
            payment.amount,

          status:
            "PAID",

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
              result.merchantInvoiceNumber ??
              order.number,

            paymentExecuteTime:
              result.paymentExecuteTime ??
              null,

            payerReference:
              result.payerReference ??
              null,

            payerAccount:
              result.payerAccount ??
              null,

            verificationSource:
              source,
          },
        },
      });
    },
  );

  /* =======================================================
     SUCCESS
     ======================================================= */

  return NextResponse.redirect(
    resultUrl(
      req,
      {
        status:
          "success",

        order:
          order.number,
      },
    ),
  );
}