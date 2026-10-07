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
} from "@/lib/courier/steadfast";

import {
  syncSteadfastShipment,
} from "@/lib/courier/steadfast-sync";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

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

  if (
    !admin
  ) {
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
    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const result =
      await syncSteadfastShipment({
        orderId:
          id,

        steadfast,
      });

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
            result.orderId,

          metadata: {
            orderNumber:
              result.orderNumber,

            previousStatus:
              result.previousStatus,

            status:
              result.status,

            changed:
              result.changed,

            skipped:
              result.skipped,

            trackingEventsAdded:
              result
                .trackingEventsAdded,
          },
        },
      });

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      `/admin/orders/${result.orderId}`,
    );

    return NextResponse.json({
      message:
        result.skipped
          ? "Courier status was synced less than 60 seconds ago."
          : result.changed
            ? `Steadfast status updated to ${result.status}.`
            : result.trackingEventsAdded >
                0
              ? `Steadfast status is still ${result.status}. ${result.trackingEventsAdded} new tracking update${
                  result.trackingEventsAdded ===
                  1
                    ? ""
                    : "s"
                } added.`
              : `Steadfast status is still ${result.status}.`,

      ...result,
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