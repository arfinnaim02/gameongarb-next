import {
  SteadfastClient,
  STEADFAST_PROVIDER,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

const MIN_REFRESH_INTERVAL_MS =
  60_000;

function safeDate(
  value:
    string |
    null,
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function eventKey({
  status,
  message,
  externalAt,
}: {
  status:
    string |
    null;

  message:
    string;

  externalAt:
    Date |
    null;
}) {
  return [
    status ??
      "",
    message.trim(),
    externalAt
      ?.toISOString() ??
      "",
  ].join(
    "|",
  );
}

export type SteadfastSyncResult = {
  orderId:
    string;

  orderNumber:
    string;

  shipmentId:
    string;

  previousStatus:
    string;

  status:
    string;

  changed:
    boolean;

  skipped:
    boolean;

  trackingEventsAdded:
    number;

  lastSyncedAt:
    string;
};

export async function syncSteadfastShipment({
  orderId,
  steadfast,
  force = false,
}: {
  orderId:
    string;

  steadfast:
    SteadfastClient;

  force?:
    boolean;
}):
  Promise<
    SteadfastSyncResult
  > {
  const order =
    await db.order.findUnique({
      where: {
        id:
          orderId,
      },

      include: {
        shipment: {
          include: {
            events: {
              orderBy: {
                createdAt:
                  "desc",
              },

              take:
                100,
            },
          },
        },
      },
    });

  if (
    !order
  ) {
    throw new Error(
      "Order not found.",
    );
  }

  if (
    !order.shipment
  ) {
    throw new Error(
      "No courier shipment exists for this order.",
    );
  }

  if (
    order.shipment
      .provider !==
    STEADFAST_PROVIDER
  ) {
    throw new Error(
      "This shipment is not a Steadfast shipment.",
    );
  }

  if (
    !order.shipment
      .consignmentId
  ) {
    throw new Error(
      order.shipment
        .status ===
        "booking_failed"
        ? "The Steadfast booking failed and cannot be refreshed."
        : "Steadfast has not returned a consignment ID yet.",
    );
  }

  const now =
    new Date();

  if (
    !force &&
    order.shipment
      .lastSyncedAt &&
    now.getTime() -
      order.shipment
        .lastSyncedAt
        .getTime() <
      MIN_REFRESH_INTERVAL_MS
  ) {
    return {
      orderId:
        order.id,

      orderNumber:
        order.number,

      shipmentId:
        order.shipment
          .id,

      previousStatus:
        order.shipment
          .status,

      status:
        order.shipment
          .status,

      changed:
        false,

      skipped:
        true,

      trackingEventsAdded:
        0,

      lastSyncedAt:
        order.shipment
          .lastSyncedAt
          .toISOString(),
    };
  }

  const statusResult =
    await steadfast
      .getStatusWithReturnByConsignmentId(
        order.shipment
          .consignmentId,
      );

  const trackingEvents =
    await steadfast
      .getTrackingsByInvoice(
        order.number,
      )
      .catch(
        () => [],
      );

  const previousStatus =
    order.shipment
      .status;

  const nextStatus =
    statusResult.status;

  const changed =
    previousStatus !==
    nextStatus;

  const existingKeys =
    new Set(
      order.shipment
        .events.map(
          (
            event,
          ) =>
            eventKey({
              status:
                event.status,

              message:
                event.message,

              externalAt:
                event.externalAt,
            }),
        ),
    );

  const newTrackingEvents =
    trackingEvents
      .map(
        (
          event,
        ) => {
          const externalAt =
            safeDate(
              event.at,
            );

          return {
            status:
              event.status,

            message:
              event.message,

            externalAt,

            key:
              eventKey({
                status:
                  event.status,

                message:
                  event.message,

                externalAt,
              }),
          };
        },
      )
      .filter(
        (
          event,
        ) =>
          !existingKeys.has(
            event.key,
          ),
      );

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
                order.shipment!
                  .id,
            },

            data: {
              status:
                nextStatus,

              lastSyncedAt:
                now,
            },
          });

        if (
          changed
        ) {
          const statusMessage =
            `Steadfast status changed from ${previousStatus} to ${nextStatus}.`;

          const key =
            eventKey({
              status:
                nextStatus,

              message:
                statusMessage,

              externalAt:
                now,
            });

          if (
            !existingKeys.has(
              key,
            )
          ) {
            await tx
              .courierTrackingEvent
              .create({
                data: {
                  shipmentId:
                    order.shipment!
                      .id,

                  status:
                    nextStatus,

                  message:
                    statusMessage,

                  source:
                    "API",

                  externalAt:
                    now,
                },
              });
          }
        }

        for (
          const event
          of newTrackingEvents
        ) {
          await tx
            .courierTrackingEvent
            .create({
              data: {
                shipmentId:
                  order.shipment!
                    .id,

                status:
                  event.status,

                message:
                  event.message,

                source:
                  "STEADFAST",

                externalAt:
                  event.externalAt,
              },
            });
        }
      },
    );

  return {
    orderId:
      order.id,

    orderNumber:
      order.number,

    shipmentId:
      order.shipment
        .id,

    previousStatus,

    status:
      nextStatus,

    changed,

    skipped:
      false,

    trackingEventsAdded:
      newTrackingEvents
        .length,

    lastSyncedAt:
      now.toISOString(),
  };
}