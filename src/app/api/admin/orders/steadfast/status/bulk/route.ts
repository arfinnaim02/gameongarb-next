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

const schema =
  z.object({
    orderIds:
      z
        .array(
          z
            .string()
            .min(
              1,
            ),
        )
        .min(
          1,
          "Select at least one order.",
        )
        .max(
          100,
          "Refresh a maximum of 100 orders at once.",
        ),
  });

export async function POST(
  request:
    Request,
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

  try {
    const input =
      schema.parse(
        await request.json(),
      );

    const uniqueIds =
      [
        ...new Set(
          input.orderIds,
        ),
      ];

    const orders =
      await db.order.findMany({
        where: {
          id: {
            in:
              uniqueIds,
          },
        },

        include: {
          shipment:
            true,
        },
      });

    const eligible =
      orders.filter(
        (
          order,
        ) =>
          order.shipment
            ?.provider ===
            "STEADFAST" &&
          Boolean(
            order.shipment
              .consignmentId,
          ),
      );

    const skipped =
      orders
        .filter(
          (
            order,
          ) =>
            !eligible.some(
              (
                item,
              ) =>
                item.id ===
                order.id,
            ),
        )
        .map(
          (
            order,
          ) => ({
            orderId:
              order.id,

            orderNumber:
              order.number,

            reason:
              order.shipment
                ? "Shipment is not refreshable through Steadfast."
                : "No courier shipment exists.",
          }),
        );

    if (
      eligible.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "None of the selected orders have a refreshable Steadfast shipment.",

          skipped,
        },
        {
          status:
            409,
        },
      );
    }

    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const successful: {
      orderId:
        string;

      orderNumber:
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
    }[] = [];

    const failed: {
      orderId:
        string;

      orderNumber:
        string;

      reason:
        string;
    }[] = [];

    /*
     * Sequential intentionally.
     *
     * This prevents a large selected
     * batch from creating a sudden API
     * request burst.
     */
    for (
      const order
      of eligible
    ) {
      try {
        const result =
          await syncSteadfastShipment({
            orderId:
              order.id,

            steadfast,

            actorId:
              admin.id,
          });

        successful.push({
          orderId:
            result.orderId,

          orderNumber:
            result.orderNumber,

          status:
            result.status,

          changed:
            result.changed,

          skipped:
            result.skipped,

          trackingEventsAdded:
            result
              .trackingEventsAdded,

          autoDelivered:
            result
              .autoDelivered,
        });
      } catch (
        error
      ) {
        failed.push({
          orderId:
            order.id,

          orderNumber:
            order.number,

          reason:
            error instanceof
              Error
              ? error.message
              : "Unable to refresh shipment.",
        });
      }
    }

    const changedCount =
      successful.filter(
        (
          item,
        ) =>
          item.changed,
      ).length;

    const cacheSkipped =
      successful.filter(
        (
          item,
        ) =>
          item.skipped,
      ).length;

    const trackingAdded =
      successful.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.trackingEventsAdded,
        0,
      );

    const autoDeliveredCount =
      successful.filter(
        (
          item,
        ) =>
          item.autoDelivered,
      ).length;

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "STEADFAST_BULK_STATUS_REFRESHED",

          entityType:
            "Order",

          metadata: {
            selected:
              uniqueIds.length,

            refreshable:
              eligible.length,

            successful:
              successful.length,

            changed:
              changedCount,

            cacheSkipped,

            trackingEventsAdded:
              trackingAdded,

            autoDelivered:
              autoDeliveredCount,

            failed:
              failed.length,

            skipped:
              skipped.length,
          },
        },
      });

    revalidatePath(
      "/admin/orders",
    );

    for (
      const item
      of successful
    ) {
      revalidatePath(
        `/admin/orders/${item.orderId}`,
      );
    }

    if (
      autoDeliveredCount >
      0
    ) {
      revalidatePath(
        "/account/orders",
      );
    }

    return NextResponse.json({
      message:
        `${successful.length} Steadfast shipment${
          successful.length ===
          1
            ? ""
            : "s"
        } checked · ${changedCount} courier status changed · ${autoDeliveredCount} order${
          autoDeliveredCount ===
          1
            ? ""
            : "s"
        } auto-delivered · ${trackingAdded} tracking update${
          trackingAdded ===
          1
            ? ""
            : "s"
        } added${
          failed.length >
          0
            ? ` · ${failed.length} failed`
            : ""
        }.`,

      successful,

      failed,

      skipped,
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
            "Invalid bulk refresh request.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Steadfast bulk status refresh error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to refresh selected Steadfast shipments.",
      },
      {
        status:
          400,
      },
    );
  }
}