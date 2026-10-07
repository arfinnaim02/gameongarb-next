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

  autoDelivered:
    boolean;

  orderStatus:
    string;

  lastSyncedAt:
    string;
};

export async function syncSteadfastShipment({
  orderId,
  steadfast,
  actorId = null,
  force = false,
}: {
  orderId:
    string;

  steadfast:
    SteadfastClient;

  actorId?:
    string |
    null;

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

  /*
   * Steadfast documents courier status
   * responses as cached for 60 seconds.
   *
   * Avoid unnecessary provider calls
   * unless force=true is explicitly used.
   */
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

      autoDelivered:
        false,

      orderStatus:
        order.status,

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

  /*
   * Tracking history is useful but
   * should not make the whole status
   * refresh fail if Steadfast cannot
   * return tracking events.
   */
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

  /*
   * Only the FINAL Steadfast
   * "delivered" state can automatically
   * mark the GOG order Delivered.
   *
   * We intentionally do NOT treat:
   *
   * delivered_approval_pending
   * partial_delivered
   * partial_delivered_approval_pending
   * cancelled
   * cancelled_approval_pending
   * exceptional
   * unknown
   * unknown_approval_pending
   *
   * as final delivery.
   *
   * READY_TO_SHIP and SHIPPED are the
   * safe GOG states to auto-complete.
   *
   * A CANCELLED order is deliberately
   * excluded because cancellation may
   * already have restored inventory.
   */
  const shouldAutoDeliver =
    nextStatus
      .trim()
      .toLowerCase() ===
      "delivered" &&
    (
      order.status ===
        "READY_TO_SHIP" ||
      order.status ===
        "SHIPPED"
    );

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

  /*
   * Also prevent duplicates that may
   * appear multiple times inside the
   * same provider tracking response.
   */
  const seenKeys =
    new Set(
      existingKeys,
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
        ) => {
          if (
            seenKeys.has(
              event.key,
            )
          ) {
            return false;
          }

          seenKeys.add(
            event.key,
          );

          return true;
        },
      );

  await db
    .$transaction(
      async (
        tx,
      ) => {
        /*
         * Update courier status first.
         */
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

        /*
         * Final Steadfast delivery:
         *
         * Courier shipment update,
         * GOG order update and order
         * history are kept in the same
         * database transaction.
         */
        if (
          shouldAutoDeliver
        ) {
          await tx
            .order
            .update({
              where: {
                id:
                  order.id,
              },

              data: {
                status:
                  "DELIVERED",

                history: {
                  create: {
                    oldStatus:
                      order.status,

                    newStatus:
                      "DELIVERED",

                    changedBy:
                      actorId,

                    note:
                      "Automatically marked Delivered after Steadfast confirmed final delivery.",

                    source:
                      "STEADFAST",
                  },
                },
              },
            });
        }

        /*
         * Store a courier status-change
         * event only when the actual
         * courier state changed.
         */
        if (
          changed
        ) {
          const statusMessage =
            `Steadfast status changed from ${previousStatus} to ${nextStatus}.`;

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

        /*
         * Save previously unseen tracking
         * events returned by Steadfast.
         */
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

    autoDelivered:
      shouldAutoDeliver,

    orderStatus:
      shouldAutoDeliver
        ? "DELIVERED"
        : order.status,

    lastSyncedAt:
      now.toISOString(),
  };
}