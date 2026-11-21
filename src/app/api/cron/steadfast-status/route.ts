import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  SteadfastClient,
} from "@/lib/courier/steadfast";

import {
  syncSteadfastShipment,
} from "@/lib/courier/steadfast-sync";

import {
  db,
} from "@/lib/db";

import {
  refreshTelegramOrderMessage,
} from "@/lib/telegram";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

const BATCH_SIZE =
  3;

const TERMINAL_COURIER_STATUSES =
  new Set([
    "delivered",
    "cancelled",
    "returned",
  ]);

function authorized(
  request:
    Request,
) {
  const secret =
    process.env
      .CRON_SECRET;

  if (
    !secret
  ) {
    return false;
  }

  return (
    request.headers.get(
      "authorization",
    ) ===
    `Bearer ${secret}`
  );
}

function normalizedStatus(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase();
}

export async function GET(
  request:
    Request,
) {
  if (
    !authorized(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status:
          401,
      },
    );
  }

  try {
    const shipments =
      await db.courierShipment.findMany({
        where: {
          provider:
            "STEADFAST",

          consignmentId: {
            not:
              null,
          },

          status: {
            notIn: [
              "delivered",
              "cancelled",
              "returned",
            ],
          },
        },

        orderBy: [
          {
            lastSyncedAt:
              "asc",
          },

          {
            createdAt:
              "asc",
          },
        ],

        take:
          BATCH_SIZE,

        select: {
          orderId:
            true,

          status:
            true,
        },
      });

    const eligible =
      shipments.filter(
        (
          shipment,
        ) =>
          !TERMINAL_COURIER_STATUSES.has(
            normalizedStatus(
              shipment.status,
            ),
          ),
      );

    if (
      eligible.length ===
      0
    ) {
      return NextResponse.json({
        ok:
          true,

        checked:
          0,

        changed:
          0,

        telegramUpdated:
          0,

        failed:
          0,

        message:
          "No active Steadfast shipments require syncing.",
      });
    }

    const steadfast =
      await SteadfastClient
        .fromDatabase();

    let changed =
      0;

    let telegramUpdated =
      0;

    const failures: {
      orderId:
        string;

      error:
        string;
    }[] =
      [];

    const results: {
      orderId:
        string;

      orderNumber:
        string;

      status:
        string;

      changed:
        boolean;

      trackingEventsAdded:
        number;

      autoDelivered:
        boolean;
    }[] =
      [];

    for (
      const shipment
      of eligible
    ) {
      try {
        const result =
          await syncSteadfastShipment({
            orderId:
              shipment.orderId,

            steadfast,

            actorId:
              null,
          });

        results.push({
          orderId:
            result.orderId,

          orderNumber:
            result.orderNumber,

          status:
            result.status,

          changed:
            result.changed,

          trackingEventsAdded:
            result
              .trackingEventsAdded,

          autoDelivered:
            result.autoDelivered,
        });

        const meaningfulUpdate =
          !result.skipped &&
          (
            result.changed ||
            result.trackingEventsAdded >
              0 ||
            result.autoDelivered
          );

        if (
          meaningfulUpdate
        ) {
          changed +=
            1;

          const telegramResult =
            await refreshTelegramOrderMessage(
              result.orderId,
            ).catch(
              (
                error,
              ) => {
                console.error(
                  "Automatic Steadfast Telegram refresh failed:",
                  error,
                );

                return null;
              },
            );

          if (
            telegramResult
          ) {
            telegramUpdated +=
              1;
          }

          revalidatePath(
            "/admin/orders",
          );

          revalidatePath(
            `/admin/orders/${result.orderId}`,
          );

          revalidatePath(
            "/account/orders",
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Automatic Steadfast sync failed:",
          shipment.orderId,
          error,
        );

        failures.push({
          orderId:
            shipment.orderId,

          error:
            error instanceof
            Error
              ? error.message
              : "Unknown sync error.",
        });
      }
    }

    return NextResponse.json({
      ok:
        failures.length ===
        0,

      checked:
        eligible.length,

      changed,

      telegramUpdated,

      failed:
        failures.length,

      results,

      failures,
    });
  } catch (
    error
  ) {
    console.error(
      "Automatic Steadfast cron failed:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof
          Error
            ? error.message
            : "Automatic Steadfast sync failed.",
      },
      {
        status:
          500,
      },
    );
  }
}
