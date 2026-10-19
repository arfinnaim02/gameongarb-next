import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  readOrderAccessToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  bkashRequest,
} from "@/lib/payments/bkash/client";

import {
  getBkashConfig,
} from "@/lib/payments/bkash/config";

import type {
  BkashCreatePaymentResponse,
} from "@/lib/payments/bkash/types";

import {
  getBkashCustomerMessage,
} from "@/lib/payments/bkash/errors";

export const dynamic =
  "force-dynamic";

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  req:
    Request,
) {
  try {
    const body =
      (await req.json()) as {
        orderNumber?:
          string;
      };

    const orderNumber =
      body.orderNumber
        ?.trim();

    if (
      !orderNumber
    ) {
      return NextResponse.json(
        {
          error:
            "Order number is required.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       ORDER ACCESS
       ===================================================== */

    const cookieStore =
      await cookies();

    const accessToken =
      cookieStore.get(
        "gog_order_access",
      )?.value;

    if (
      !accessToken
    ) {
      return NextResponse.json(
        {
          error:
            "Order access expired. Please place the order again.",
        },
        {
          status:
            401,
        },
      );
    }

    let accessPayload:
      Awaited<
        ReturnType<
          typeof readOrderAccessToken
        >
      >;

    try {
      accessPayload =
        await readOrderAccessToken(
          accessToken,
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid order access.",
        },
        {
          status:
            401,
        },
      );
    }

    if (
      accessPayload.orderNumber !==
      orderNumber
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot access this order.",
        },
        {
          status:
            403,
        },
      );
    }

    /* =====================================================
       ORDER
       ===================================================== */

    const order =
      await db.order.findUnique({
        where: {
          number:
            orderNumber,
        },

        include: {
          payments: {
            where: {
              method:
                "BKASH",
            },

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              1,
          },
        },
      });

    if (
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order was not found.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      order.phone !==
      accessPayload.phone
    ) {
      return NextResponse.json(
        {
          error:
            "Order verification failed.",
        },
        {
          status:
            403,
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
            "This order is not a bKash order.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      order.paymentStatus ===
      "PAID"
    ) {
      return NextResponse.json(
        {
          error:
            "This order has already been paid.",
        },
        {
          status:
            409,
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
            "bKash payment record was not found.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      payment.providerReference
    ) {
      return NextResponse.json(
        {
          error:
            "A bKash payment has already been initiated for this order.",
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       CREATE BKASH PAYMENT
       ===================================================== */

    const config =
      getBkashConfig();

    const amount =
      Number(
        order.total,
      ).toFixed(
        2,
      );

    const result =
      await bkashRequest<BkashCreatePaymentResponse>({
        path:
          "/tokenized-checkout/payment/create",

        body: {
          mode:
            "0011",

          payerReference:
            order.phone,

          callbackURL:
            config.callbackUrl,

          amount,

          currency:
            "BDT",

          intent:
            "sale",

          merchantInvoiceNumber:
            order.number,
        },
      });

    const paymentId =
      result.paymentId ??
      result.paymentID;

    if (
      !paymentId ||
      !result.bkashURL
    ) {
      console.error(
        "Invalid bKash Create Payment response:",
        {
          orderNumber:
            order.number,

          statusCode:
            result.statusCode,

          statusMessage:
            result.statusMessage,

          errorCode:
            result.errorCode,

          errorMessage:
            result.errorMessage,
        },
      );

      return NextResponse.json(
        {
          error:
            result.errorMessage ??
            result.statusMessage ??
            "bKash payment could not be created.",
        },
        {
          status:
            502,
        },
      );
    }

    /* =====================================================
       SAVE PAYMENT REFERENCE
       ===================================================== */

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
            providerReference:
              paymentId,

            status:
              "PROCESSING",
          },
        });

        await tx.paymentTransaction.create({
          data: {
            paymentId:
              payment.id,

            type:
              "CREATE",

            externalId:
              paymentId,

            amount:
              order.total,

            status:
              "PROCESSING",

            safePayload: {
              paymentId,

              transactionStatus:
                result.transactionStatus ??
                null,

              amount:
                result.amount ??
                amount,

              currency:
                result.currency ??
                "BDT",

              merchantInvoiceNumber:
                result.merchantInvoiceNumber ??
                order.number,

              paymentCreateTime:
                result.paymentCreateTime ??
                null,
            },
          },
        });
      },
    );

    /* =====================================================
       RESPONSE
       ===================================================== */

    return NextResponse.json(
      {
        ok:
          true,

        orderNumber:
          order.number,

        paymentId,

        bkashURL:
          result.bkashURL,
      },
      {
        status:
          200,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "bKash create payment error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          getBkashCustomerMessage(
            error,
          ),
      },
      {
        status:
          500,
      },
    );
  }
}