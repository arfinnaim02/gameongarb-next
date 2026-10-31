import {
  buildSteadfastParcel,
  SteadfastClient,
  STEADFAST_PROVIDER,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

const BOOKABLE_ORDER_STATUSES =
  new Set([
    "READY_TO_SHIP",
    "SHIPPED",
  ]);

export async function bookOrderWithSteadfast({
  orderId,
  actorId = null,
  source = "SYSTEM",
}: {
  orderId:
    string;

  actorId?:
    string |
    null;

  source?:
    "ADMIN" |
    "TELEGRAM" |
    "SYSTEM";
}) {
  let reservedShipmentId:
    string |
    null =
    null;

  try {
    const order =
      await db.order.findUnique({
        where: {
          id:
            orderId,
        },

        include: {
          items:
            true,

          shipment:
            true,
        },
      });

    if (!order) {
      throw new Error(
        "Order not found.",
      );
    }

    if (
      !BOOKABLE_ORDER_STATUSES.has(
        order.status,
      )
    ) {
      throw new Error(
        "Order must be Ready to Ship before sending to Steadfast.",
      );
    }

    if (
      order.paymentMethod ===
        "BKASH" &&
      order.paymentStatus !==
        "PAID"
    ) {
      throw new Error(
        "This bKash order must be paid before courier booking.",
      );
    }

    if (
      order.shipment &&
      (
        order.shipment
          .consignmentId ||
        order.shipment
          .trackingId
      )
    ) {
      throw new Error(
        "This order already has a courier shipment.",
      );
    }

    if (
      order.shipment &&
      order.shipment
        .provider !==
        STEADFAST_PROVIDER
    ) {
      throw new Error(
        `This order is already reserved for ${order.shipment.provider}.`,
      );
    }

    if (
      order.shipment
        ?.status ===
      "booking"
    ) {
      throw new Error(
        "Courier booking is already in progress.",
      );
    }

    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const fullAddress =
      [
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

        deliveryAdvancePaid:
          Number(
            order.deliveryAdvancePaid,
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

    if (
      order.shipment
    ) {
      const claimed =
        await db
          .courierShipment
          .updateMany({
            where: {
              id:
                order.shipment.id,

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
                parcel.cod_amount,

              lastSyncedAt:
                null,
            },
          });

      if (
        claimed.count !==
        1
      ) {
        throw new Error(
          "Courier booking is already being processed.",
        );
      }

      reservedShipmentId =
        order.shipment.id;
    } else {
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
                parcel.cod_amount,
            },
          });

      reservedShipmentId =
        reserved.id;
    }

    const created =
      await steadfast
        .createOrder(
          parcel,
        );

    const now =
      new Date();

    const shipment =
      await db.$transaction(
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
                  source ===
                  "TELEGRAM"
                    ? "Parcel created in Steadfast from Telegram."
                    : "Parcel created in Steadfast.",

                source:
                  "API",

                externalAt:
                  now,
              },
            });

          return updated;
        },
      );

    await db.activityLog.create({
      data: {
        actorId:
          source ===
            "ADMIN"
            ? actorId
            : null,

        action:
          source ===
          "TELEGRAM"
            ? "STEADFAST_SHIPMENT_CREATED_TELEGRAM"
            : "STEADFAST_SHIPMENT_CREATED",

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

          source,
        },
      },
    });

    return {
      order,
      shipment,
    };
  } catch (
    error
  ) {
    if (
      reservedShipmentId
    ) {
      try {
        await db.$transaction(
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

    throw error;
  }
}