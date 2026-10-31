import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

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
  refreshTelegramOrderMessage,
} from "@/lib/telegram";

export const dynamic =
  "force-dynamic";

const schema =
  z.object({
    amount:
      z
        .number()
        .finite()
        .min(
          0,
          "Advance amount cannot be negative.",
        ),

    reference:
      z
        .string()
        .trim()
        .max(
          200,
          "Reference must be 200 characters or less.",
        )
        .default(""),
  });

export async function PATCH(
  request:
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
  try {
    const admin =
      await requireAdminApi();

    if (!admin) {
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

    const input =
      schema.parse(
        await request.json(),
      );

    const order =
      await db.order.findUnique({
        where: {
          id,
        },

        include: {
          shipment:
            true,
        },
      });

    if (!order) {
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
      "COD"
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery advance can only be recorded for COD orders.",
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
            "Delivery advance is only required for outside Dhaka COD orders.",
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
            "Delivery advance is locked because this order has already been sent to the courier.",
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

    const orderTotal =
      Number(
        order.total,
      );

    if (
      input.amount >
      deliveryCharge
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery advance cannot exceed the delivery charge.",
        },
        {
          status:
            400,
        },
      );
    }

    if (
      input.amount >
        0 &&
      input.amount !==
        deliveryCharge
    ) {
      return NextResponse.json(
        {
          error:
            `Outside Dhaka delivery advance must be exactly ৳${deliveryCharge.toFixed(
              2,
            )}.`,
        },
        {
          status:
            400,
        },
      );
    }

    if (
      input.amount >
      orderTotal
    ) {
      return NextResponse.json(
        {
          error:
            "Delivery advance cannot exceed the order total.",
        },
        {
          status:
            400,
        },
      );
    }

    const reference =
      input.reference.trim();

    const oldAmount =
      Number(
        order.deliveryAdvancePaid,
      );

    await db.$transaction(
      async (
        tx,
      ) => {
        await tx.order.update({
          where: {
            id,
          },

          data: {
            deliveryAdvancePaid:
              input.amount,

            deliveryAdvanceReference:
              input.amount >
              0
                ? reference ||
                  null
                : null,

            deliveryAdvancePaidAt:
              input.amount >
              0
                ? order
                    .deliveryAdvancePaidAt ??
                  new Date()
                : null,
          },
        });

        await tx.activityLog.create({
          data: {
            actorId:
              admin.id,

            action:
              "ORDER_DELIVERY_ADVANCE_UPDATED",

            entityType:
              "Order",

            entityId:
              order.id,

            metadata: {
              orderNumber:
                order.number,

              previousAmount:
                oldAmount,

              amount:
                input.amount,

              reference:
                input.amount >
                0
                  ? reference ||
                    null
                  : null,

              remainingCod:
                Math.max(
                  0,
                  orderTotal -
                    input.amount,
                ),
            },
          },
        });
      },
    );

    revalidatePath(
      `/admin/orders/${id}`,
    );

    try {
      await refreshTelegramOrderMessage(
        id,
      );
    } catch (
      telegramError
    ) {
      console.error(
        "Unable to refresh Telegram order after delivery advance update:",
        telegramError,
      );
    }

    return NextResponse.json({
      message:
        input.amount >
        0
          ? `Delivery advance of ৳${input.amount.toFixed(
              2,
            )} recorded successfully.`
          : "Delivery advance cleared successfully.",
    });
  } catch (
    error
  ) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            error.issues[0]
              ?.message ??
            "Invalid delivery advance.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Delivery advance PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to update delivery advance.",
      },
      {
        status:
          400,
      },
    );
  }
}