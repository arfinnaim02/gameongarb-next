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
      "/tokenized/checkout/payment/status",

    body: {
      paymentID:
        paymentId,
    },
  });
}

/* =========================================================
   FAIL PAYMENT + RESTORE STOCK

   This runs only for a definitive bKash cancel/failure.

   The CANCELLATION_RESTORE inventory transaction acts as
   our restoration marker.

   Serializable isolation + retry prevents concurrent
   duplicate callbacks from restoring stock twice.
   ========================================================= */

async function failPaymentAndRestoreStock({
  paymentRecordId,
  orderId,
  orderNumber,
  providerPaymentId,
  transactionType,
  callbackStatus,
}: {
  paymentRecordId:
    string;

  orderId:
    string;

  orderNumber:
    string;

  providerPaymentId:
    string;

  transactionType:
    string;

  callbackStatus:
    string;
}) {
  const maxAttempts =
    3;

  for (
    let attempt =
      1;
    attempt <=
      maxAttempts;
    attempt +=
      1
  ) {
    try {
      return await db.$transaction(
        async (
          tx,
        ) => {
          const freshPayment =
            await tx.payment.findUnique({
              where: {
                id:
                  paymentRecordId,
              },
            });

          if (
            !freshPayment
          ) {
            throw new Error(
              "Payment record was not found during failure processing.",
            );
          }

          /*
           * A successful payment can never be
           * overwritten by a delayed cancel/failure
           * callback.
           */
          if (
            freshPayment.status ===
            "PAID"
          ) {
            return {
              paid:
                true,

              restored:
                false,
            };
          }

          const freshOrder =
            await tx.order.findUnique({
              where: {
                id:
                  orderId,
              },

              include: {
                items: {
                  select: {
                    variantId:
                      true,

                    quantity:
                      true,
                  },
                },
              },
            });

          if (
            !freshOrder
          ) {
            throw new Error(
              "Order was not found during stock restoration.",
            );
          }

          /*
           * If a restoration transaction already exists
           * for this order, another callback must not
           * increment stock again.
           */
          const existingRestore =
            await tx.inventoryTransaction.findFirst({
              where: {
                reference:
                  orderNumber,

                type:
                  "CANCELLATION_RESTORE",
              },

              select: {
                id:
                  true,
              },
            });

          if (
            !existingRestore
          ) {
            /*
             * Aggregate by variant so the same variant
             * can never be incremented twice inside one
             * restoration transaction.
             */
            const quantities =
              new Map<
                string,
                number
              >();

            for (
              const item
              of freshOrder.items
            ) {
              if (
                !item.variantId
              ) {
                continue;
              }

              quantities.set(
                item.variantId,
                (
                  quantities.get(
                    item.variantId,
                  ) ??
                  0
                ) +
                  item.quantity,
              );
            }

            for (
              const [
                variantId,
                quantity,
              ]
              of quantities
            ) {
              const variant =
                await tx.productVariant.findUnique({
                  where: {
                    id:
                      variantId,
                  },

                  select: {
                    stock:
                      true,
                  },
                });

              if (
                !variant
              ) {
                throw new Error(
                  `Variant ${variantId} was not found during stock restoration.`,
                );
              }

              const beforeQuantity =
                variant.stock;

              const afterQuantity =
                beforeQuantity +
                quantity;

              await tx.productVariant.update({
                where: {
                  id:
                    variantId,
                },

                data: {
                  stock: {
                    increment:
                      quantity,
                  },
                },
              });

              await tx.inventoryTransaction.create({
                data: {
                  variantId,

                  quantityChange:
                    quantity,

                  beforeQuantity,

                  afterQuantity,

                  type:
                    "CANCELLATION_RESTORE",

                  reference:
                    orderNumber,

                  reason:
                    "bKash payment cancelled or failed",
                },
              });
            }
          }

          await tx.payment.update({
            where: {
              id:
                paymentRecordId,
            },

            data: {
              status:
                "FAILED",
            },
          });

          await tx.order.update({
            where: {
              id:
                orderId,
            },

            data: {
              paymentStatus:
                "FAILED",

              status:
                "CANCELLED",
            },
          });

          const existingPaymentEvent =
            await tx.paymentTransaction.findFirst({
              where: {
                paymentId:
                  paymentRecordId,

                type:
                  transactionType,
              },

              select: {
                id:
                  true,
              },
            });

          if (
            !existingPaymentEvent
          ) {
            await tx.paymentTransaction.create({
              data: {
                paymentId:
                  paymentRecordId,

                type:
                  transactionType,

                amount:
                  freshPayment.amount,

                status:
                  "FAILED",

                safePayload: {
                  paymentId:
                    providerPaymentId,

                  callbackStatus,

                  stockRestored:
                    !existingRestore,
                },
              },
            });
          }

          const existingHistory =
            await tx.orderStatusHistory.findFirst({
              where: {
                orderId,

                newStatus:
                  "CANCELLED",

                source:
                  "BKASH",
              },

              select: {
                id:
                  true,
              },
            });

          if (
            !existingHistory
          ) {
            await tx.orderStatusHistory.create({
              data: {
                orderId,

                oldStatus:
                  freshOrder.status,

                newStatus:
                  "CANCELLED",

                note:
                  "Order cancelled because bKash payment was cancelled or failed.",

                source:
                  "BKASH",
              },
            });
          }

          return {
            paid:
              false,

            restored:
              !existingRestore,
          };
        },

        {
          isolationLevel:
            "Serializable",

          maxWait:
            10_000,

          timeout:
            20_000,
        },
      );
    } catch (
      error
    ) {
      const prismaError =
        error &&
        typeof error ===
          "object" &&
        "code" in error
          ? (
              error as {
                code?:
                  string;
              }
            )
          : null;

      /*
       * Serializable transactions can intentionally
       * reject one of two concurrent callbacks.
       *
       * Retry that transaction rather than allowing
       * duplicate inventory restoration.
       */
      if (
        prismaError?.code ===
          "P2034" &&
        attempt <
          maxAttempts
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Unable to finalize failed bKash payment.",
  );
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
    const failureResult =
      await failPaymentAndRestoreStock({
        paymentRecordId:
          payment.id,

        orderId:
          order.id,

        orderNumber:
          order.number,

        providerPaymentId:
          paymentId,

        transactionType:
          "CANCEL",

        callbackStatus:
          "cancel",
      });

    /*
     * A delayed cancel callback must never override
     * an already verified successful payment.
     */
    if (
      failureResult.paid
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
    const failureResult =
      await failPaymentAndRestoreStock({
        paymentRecordId:
          payment.id,

        orderId:
          order.id,

        orderNumber:
          order.number,

        providerPaymentId:
          paymentId,

        transactionType:
          "FAILURE_CALLBACK",

        callbackStatus:
          "failure",
      });

    if (
      failureResult.paid
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
      "/tokenized/checkout/execute",

    body: {
      paymentID:
        paymentId,
    },
  });

console.info(
  "BKASH_EXECUTE_RESULT",
  {
    paymentId,

    resultPaymentId:
      getPaymentId(
        executeResult,
      ),

    trxId:
      getTrxId(
        executeResult,
      ),

    transactionStatus:
      executeResult.transactionStatus ??
      null,

    statusCode:
      executeResult.statusCode ??
      null,

    statusMessage:
      executeResult.statusMessage ??
      null,

    errorCode:
      executeResult.errorCode ??
      null,

    errorMessage:
      executeResult.errorMessage ??
      null,

    amount:
      executeResult.amount ??
      null,

    currency:
      executeResult.currency ??
      null,
  },
);

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
                "pending",

              order:
                order.number,

              message:
                "Payment verification is still pending.",
            },
          ),
        );
      }
    }
  }

  /* =======================================================
     PENDING / INITIATED RESULT

     Initiated is not a payment failure.

     Keep both local payment states PROCESSING and do
     not restore stock.
     ======================================================= */

  if (
    isPending(
      result,
    )
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
              "PROCESSING",
          },
        });

        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "PROCESSING",
          },
        });

        const existingPending =
          await tx.paymentTransaction.findFirst({
            where: {
              paymentId:
                payment.id,

              type:
                "QUERY_PENDING",
            },

            select: {
              id:
                true,
            },
          });

        if (
          !existingPending
        ) {
          await tx.paymentTransaction.create({
            data: {
              paymentId:
                payment.id,

              type:
                "QUERY_PENDING",

              amount:
                payment.amount,

              status:
                "PROCESSING",

              safePayload: {
                paymentId,

                transactionStatus:
                  result.transactionStatus ??
                  null,

                verificationSource:
                  source,
              },
            },
          });
        }
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

const resultInvoice =
  result.merchantInvoiceNumber ??
  result.merchantInvoice ??
  null;

const invoiceMatches =
  !resultInvoice ||
  resultInvoice ===
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

        merchantInvoice:
          resultInvoice,

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
              "PROCESSING",
          },
        });

        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            paymentStatus:
              "PROCESSING",
          },
        });

        const existingReview =
          await tx.paymentTransaction.findFirst({
            where: {
              paymentId:
                payment.id,

              type:
                `${source}_VERIFICATION_REVIEW`,
            },

            select: {
              id:
                true,
            },
          });

        if (
          !existingReview
        ) {
          await tx.paymentTransaction.create({
            data: {
              paymentId:
                payment.id,

              type:
                `${source}_VERIFICATION_REVIEW`,

              amount:
                payment.amount,

              status:
                "PROCESSING",

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
                  resultInvoice,

                verificationSource:
                  source,
              },
            },
          });
        }
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
            "Payment requires additional verification.",
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
              resultInvoice ??
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