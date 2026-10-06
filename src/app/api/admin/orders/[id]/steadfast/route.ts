import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  hasPermission,
} from "@/lib/business";

import {
  buildSteadfastParcel,
  SteadfastClient,
  STEADFAST_PROVIDER,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

export const dynamic =
  "force-dynamic";

const BOOKABLE_ORDER_STATUSES =
  new Set([
    "READY_TO_SHIP",
    "SHIPPED",
  ]);

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

  let reservedShipmentId:
    string |
    null =
    null;

  try {
    const order =
      await db.order.findUnique({
        where: {
          id,
        },

        include: {
          items:
            true,

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

    /*
     * Courier booking is intentionally
     * blocked until the order reaches
     * READY_TO_SHIP.
     *
     * SHIPPED is also allowed as a
     * recovery case if an admin changed
     * the GOG status manually before
     * creating the parcel.
     */
    if (
      !BOOKABLE_ORDER_STATUSES.has(
        order.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            order.status ===
            "DELIVERED"
              ? "Delivered orders are locked and cannot be sent to Steadfast."
              : "Move this order to Ready to Ship before sending it to Steadfast.",
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * Do not allow an unpaid bKash
     * order to become a courier parcel.
     */
    if (
      order.paymentMethod ===
        "BKASH" &&
      order.paymentStatus !==
        "PAID"
    ) {
      return NextResponse.json(
        {
          error:
            "This bKash order must be paid before it can be sent to Steadfast.",
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * If a real shipment already exists,
     * never create another parcel.
     */
    if (
      order.shipment &&
      (
        order.shipment
          .consignmentId ||
        order.shipment
          .trackingId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This order already has a courier shipment. Refresh the existing shipment instead.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      order.shipment &&
      order.shipment
        .provider !==
        STEADFAST_PROVIDER
    ) {
      return NextResponse.json(
        {
          error:
            `This order is already reserved for ${order.shipment.provider}.`,
        },
        {
          status:
            409,
        },
      );
    }

    if (
      order.shipment
        ?.status ===
      "booking"
    ) {
      return NextResponse.json(
        {
          error:
            "A Steadfast booking is already in progress for this order.",
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * Load and decrypt credentials
     * before reserving the shipment.
     *
     * If Steadfast has not been
     * configured, no placeholder
     * shipment is created.
     */
    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const fullAddress = [
      order.shippingAddress,
      order.thana,
      order.district,
      order.division,
    ]
      .map(
        (
          value,
        ) =>
          value?.trim(),
      )
      .filter(
        Boolean,
      )
      .filter(
        (
          value,
          index,
          values,
        ) =>
          values.indexOf(
            value,
          ) ===
          index,
      )
      .join(
        ", ",
      );

    const parcel =
      buildSteadfastParcel({
        number:
          order.number,

        customerName:
          order.customerName,

        phone:
          order.phone,

        shippingAddress:
          fullAddress,

        total:
          Number(
            order.total,
          ),

        paymentMethod:
          order.paymentMethod,

        paymentStatus:
          order.paymentStatus,

        internalNotes:
          order.internalNotes,

        items:
          order.items.map(
            (
              item,
            ) => ({
              name:
                item.name,

              sku:
                item.sku,

              size:
                item.size,

              color:
                item.color,

              quantity:
                item.quantity,
            }),
          ),
      });

    /*
     * Reserve the order locally BEFORE
     * contacting Steadfast.
     *
     * orderId is UNIQUE in
     * CourierShipment, so two browser
     * clicks cannot create two local
     * shipment rows.
     */
    if (
      order.shipment
    ) {
      const claimed =
        await db
          .courierShipment
          .updateMany({
            where: {
              id:
                order.shipment
                  .id,

              provider:
                STEADFAST_PROVIDER,

              consignmentId:
                null,

              trackingId:
                null,

              status: {
                in: [
                  "booking_failed",
                  "unknown",
                ],
              },
            },

            data: {
              status:
                "booking",

              codAmount:
                parcel
                  .cod_amount,

              lastSyncedAt:
                null,
            },
          });

      if (
        claimed.count !==
        1
      ) {
        return NextResponse.json(
          {
            error:
              "This courier booking is already being processed. Refresh the page and try again.",
          },
          {
            status:
              409,
          },
        );
      }

      reservedShipmentId =
        order.shipment.id;
    } else {
      try {
        const reserved =
          await db
            .courierShipment
            .create({
              data: {
                orderId:
                  order.id,

                provider:
                  STEADFAST_PROVIDER,

                status:
                  "booking",

                codAmount:
                  parcel
                    .cod_amount,
              },
            });

        reservedShipmentId =
          reserved.id;
      } catch {
        return NextResponse.json(
          {
            error:
              "A courier booking already exists for this order. Refresh the page before trying again.",
          },
          {
            status:
              409,
          },
        );
      }
    }

    /*
     * The invoice is the permanent GOG
     * order number, so retries use the
     * exact same invoice.
     */
    const created =
      await steadfast
        .createOrder(
          parcel,
        );

    const now =
      new Date();

    const shipment =
      await db
        .$transaction(
          async (
            tx,
          ) => {
            const updated =
              await tx
                .courierShipment
                .update({
                  where: {
                    id:
                      reservedShipmentId!,
                  },

                  data: {
                    provider:
                      STEADFAST_PROVIDER,

                    consignmentId:
                      created
                        .consignmentId,

                    trackingId:
                      created
                        .trackingCode,

                    status:
                      created
                        .status,

                    codAmount:
                      parcel
                        .cod_amount,

                    lastSyncedAt:
                      now,
                  },
                });

            await tx
              .courierTrackingEvent
              .create({
                data: {
                  shipmentId:
                    updated.id,

                  status:
                    created
                      .status,

                  message:
                    "Parcel created in Steadfast.",

                  source:
                    "API",

                  externalAt:
                    now,
                },
              });

            return updated;
          },
        );

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "STEADFAST_SHIPMENT_CREATED",

          entityType:
            "Order",

          entityId:
            order.id,

          metadata: {
            orderNumber:
              order.number,

            provider:
              STEADFAST_PROVIDER,

            consignmentId:
              shipment
                .consignmentId,

            trackingId:
              shipment
                .trackingId,

            courierStatus:
              shipment
                .status,

            codAmount:
              parcel
                .cod_amount,
          },
        },
      });

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      `/admin/orders/${order.id}`,
    );

    return NextResponse.json({
      message:
        "Order sent to Steadfast successfully.",

      shipment: {
        id:
          shipment.id,

        provider:
          shipment.provider,

        consignmentId:
          shipment
            .consignmentId,

        trackingId:
          shipment
            .trackingId,

        status:
          shipment.status,

        codAmount:
          shipment.codAmount
            ? Number(
                shipment
                  .codAmount,
              )
            : 0,

        lastSyncedAt:
          shipment
            .lastSyncedAt
            ?.toISOString() ??
          null,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Steadfast shipment creation error:",
      error,
    );

    /*
     * Important:
     *
     * A timeout can happen AFTER
     * Steadfast accepted the parcel.
     *
     * We therefore keep this shipment
     * reservation and mark it failed
     * instead of deleting it.
     *
     * Retrying uses the same GOG invoice.
     */
    if (
      reservedShipmentId
    ) {
      try {
        await db
          .$transaction(
            async (
              tx,
            ) => {
              await tx
                .courierShipment
                .update({
                  where: {
                    id:
                      reservedShipmentId!,
                  },

                  data: {
                    status:
                      "booking_failed",
                  },
                });

              await tx
                .courierTrackingEvent
                .create({
                  data: {
                    shipmentId:
                      reservedShipmentId!,

                    status:
                      "booking_failed",

                    message:
                      error instanceof
                      Error
                        ? error.message
                        : "Steadfast booking failed.",

                    source:
                      "API",
                  },
                });
            },
          );
      } catch (
        updateError
      ) {
        console.error(
          "Unable to record failed Steadfast booking:",
          updateError,
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to send this order to Steadfast.",
      },
      {
        status:
          400,
      },
    );
  }
}