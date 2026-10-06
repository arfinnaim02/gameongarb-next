import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  SteadfastClient,
  STEADFAST_PROVIDER,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

/*
 * Steadfast documents status responses
 * as cached for 60 seconds.
 *
 * Do not waste requests by polling the
 * same shipment faster than that.
 */
const MIN_REFRESH_INTERVAL_MS =
  60_000;

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

  try {
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
      !order.shipment
    ) {
      return NextResponse.json(
        {
          error:
            "No courier shipment exists for this order.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      order.shipment
        .provider !==
      STEADFAST_PROVIDER
    ) {
      return NextResponse.json(
        {
          error:
            "This shipment is not a Steadfast shipment.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      !order.shipment
        .consignmentId
    ) {
      return NextResponse.json(
        {
          error:
            order.shipment
              .status ===
            "booking_failed"
              ? "The previous Steadfast booking failed. Use Retry Steadfast first."
              : "Steadfast has not returned a consignment ID yet.",
        },
        {
          status:
            409,
        },
      );
    }

    const now =
      new Date();

    if (
      order.shipment
        .lastSyncedAt &&
      now.getTime() -
        order.shipment
          .lastSyncedAt
          .getTime() <
        MIN_REFRESH_INTERVAL_MS
    ) {
      const secondsAgo =
        Math.max(
          0,
          Math.floor(
            (
              now.getTime() -
              order.shipment
                .lastSyncedAt
                .getTime()
            ) /
              1000,
          ),
        );

      return NextResponse.json({
        message:
          `Courier status was synced ${secondsAgo} second${
            secondsAgo ===
            1
              ? ""
              : "s"
          } ago. Steadfast caches status for 60 seconds.`,

        skipped:
          true,

        status:
          order.shipment
            .status,

        lastSyncedAt:
          order.shipment
            .lastSyncedAt
            .toISOString(),
      });
    }

    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const result =
      await steadfast
        .getStatusWithReturnByConsignmentId(
          order.shipment
            .consignmentId,
        );

    const previousStatus =
      order.shipment
        .status;

    const nextStatus =
      result.status;

    const changed =
      previousStatus !==
      nextStatus;

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

          /*
           * Do not fill tracking history
           * with identical refresh events.
           */
          if (
            changed
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
                    `Steadfast status changed from ${previousStatus} to ${nextStatus}.`,

                  source:
                    "API",

                  externalAt:
                    now,
                },
              });
          }
        },
      );

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "STEADFAST_STATUS_REFRESHED",

          entityType:
            "Order",

          entityId:
            order.id,

          metadata: {
            orderNumber:
              order.number,

            previousStatus,

            status:
              nextStatus,

            changed,
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
        changed
          ? `Steadfast status updated to ${nextStatus}.`
          : `Steadfast status is still ${nextStatus}.`,

      status:
        nextStatus,

      changed,

      lastSyncedAt:
        now.toISOString(),
    });
  } catch (
    error
  ) {
    console.error(
      "Steadfast status refresh error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to refresh Steadfast status.",
      },
      {
        status:
          400,
      },
    );
  }
}