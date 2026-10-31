import {
  cookies,
} from "next/headers";

import {
  NextResponse,
} from "next/server";

import {
  readOrderAccessToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  isBkashAllowedForPhone,
} from "@/lib/payments/bkash/access";

import {
  bkashRequest,
} from "@/lib/payments/bkash/client";

import {
  getBkashConfig,
} from "@/lib/payments/bkash/config";

import {
  getBkashCustomerMessage,
} from "@/lib/payments/bkash/errors";

import type {
  BkashCreatePaymentResponse,
} from "@/lib/payments/bkash/types";

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
            "Order access expired. Please open your order again.",
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
          deliveryAdvancePayments: {
            orderBy: {
              createdAt:
                "desc",
            },

            take:
              1,
          },

          shipment:
            true,
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

    /* =====================================================
       ELIGIBILITY
       ===================================================== */

    if (
      order.paymentMethod !==
      "COD"
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery charge payment is only available for Cash on Delivery orders.",
        },
        {
          status:
            409,
        },
      );
    }

    const isOutsideDhaka =
      order.district
        .trim()
        .toLowerCase() !==
      "dhaka";

    if (
      !isOutsideDhaka
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery charge advance is only required for outside Dhaka orders.",
        },
        {
          status:
            409,
        },
      );
    }

    const deliveryCharge =
      Number(
        order.deliveryCharge,
      );

    if (
      !Number.isFinite(
        deliveryCharge,
      ) ||
      deliveryCharge <=
        0
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not have a valid delivery charge.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      Number(
        order.deliveryAdvancePaid,
      ) >=
      deliveryCharge
    ) {
      return NextResponse.json(
        {
          error:
            "The delivery charge has already been paid.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      order.shipment
        ?.consignmentId ||
      order.shipment
        ?.trackingId
    ) {
      return NextResponse.json(
        {
          error:
            "This order has already been sent to the courier.",
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       BKASH ACCESS
       ===================================================== */

    if (
      !isBkashAllowedForPhone(
        order.phone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "bKash payment is not currently available for this order.",
        },
        {
          status:
            403,
        },
      );
    }

    /* =====================================================
       ACTIVE ATTEMPT CHECK
       ===================================================== */

    const latestPayment =
      order
        .deliveryAdvancePayments[0];

    if (
      latestPayment &&
      latestPayment.status ===
        "PROCESSING" &&
      latestPayment
        .providerPaymentId
    ) {
      const payload =
        latestPayment
          .safePayload;

      const savedBkashURL =
        payload &&
        typeof payload ===
          "object" &&
        !Array.isArray(
          payload,
        ) &&
        typeof payload.bkashURL ===
          "string"
          ? payload.bkashURL
          : null;

      if (
        savedBkashURL
      ) {
        return NextResponse.json(
          {
            ok:
              true,

            orderNumber:
              order.number,

            paymentId:
              latestPayment
                .providerPaymentId,

            amount:
              Number(
                latestPayment.amount,
              ),

            bkashURL:
              savedBkashURL,

            resumed:
              true,
          },
          {
            status:
              200,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            "A delivery charge bKash payment is already in progress. Please try again shortly.",
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
      deliveryCharge.toFixed(
        2,
      );

    const merchantInvoiceNumber =
      `${order.number}-DA-${Date.now()}`;

    const result =
      await bkashRequest<BkashCreatePaymentResponse>({
        path:
          "/tokenized/checkout/create",

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

          merchantInvoiceNumber,
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
        "Invalid delivery charge bKash Create Payment response:",
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
            "Delivery charge bKash payment could not be created.",
        },
        {
          status:
            502,
        },
      );
    }

    /* =====================================================
       SAVE PAYMENT ATTEMPT
       ===================================================== */

    await db.deliveryAdvancePayment.create({
      data: {
        orderId:
          order.id,

        amount:
          deliveryCharge,

        status:
          "PROCESSING",

        provider:
          "BKASH",

        providerPaymentId:
          paymentId,

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
            merchantInvoiceNumber,

          paymentCreateTime:
            result.paymentCreateTime ??
            null,

          bkashURL:
            result.bkashURL,
        },
      },
    });

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

        amount:
          deliveryCharge,

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
      "Delivery charge bKash create payment error:",
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