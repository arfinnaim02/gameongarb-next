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
  buildSteadfastParcel,
  SteadfastClient,
  STEADFAST_PROVIDER,
  type SteadfastParcelInput,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

const BOOKABLE_STATUSES =
  new Set([
    "READY_TO_SHIP",
    "SHIPPED",
  ]);

const inputSchema =
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
          500,
          "A maximum of 500 orders can be sent at once.",
        ),
  });

type ReservedParcel = {
  orderId:
    string;

  orderNumber:
    string;

  shipmentId:
    string;

  parcel:
    SteadfastParcelInput;
};

type ParsedBulkResult = {
  invoice:
    string;

  success:
    boolean;

  consignmentId:
    string |
    null;

  trackingId:
    string |
    null;

  status:
    string;

  message:
    string |
    null;
};

function asRecord(
  value:
    unknown,
):
  Record<
    string,
    unknown
  > |
  null {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return null;
}

function asString(
  value:
    unknown,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
    "number"
  ) {
    return String(
      value,
    );
  }

  return null;
}

function findBulkRows(
  raw:
    unknown,
):
  unknown[] {
  if (
    Array.isArray(
      raw,
    )
  ) {
    return raw;
  }

  const root =
    asRecord(
      raw,
    );

  if (!root) {
    return [];
  }

  const candidates = [
    root.data,
    root.consignment,
    root.consignments,
    root.orders,
    root.results,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      Array.isArray(
        candidate,
      )
    ) {
      return candidate;
    }

    const nested =
      asRecord(
        candidate,
      );

    if (
      nested
    ) {
      for (
        const value
        of Object.values(
          nested,
        )
      ) {
        if (
          Array.isArray(
            value,
          )
        ) {
          return value;
        }
      }
    }
  }

  return [];
}

function parseBulkResult(
  raw:
    unknown,
):
  ParsedBulkResult[] {
  const rows =
    findBulkRows(
      raw,
    );

  return rows
    .map(
      (
        value,
      ):
        ParsedBulkResult |
        null => {
        const row =
          asRecord(
            value,
          );

        if (!row) {
          return null;
        }

        const invoice =
          asString(
            row.invoice ??
              row.invoice_no ??
              row.invoice_number,
          );

        if (
          !invoice
        ) {
          return null;
        }

        const consignmentId =
          asString(
            row.consignment_id ??
              row.consignmentId ??
              row.id,
          );

        const trackingId =
          asString(
            row.tracking_code ??
              row.trackingCode ??
              row.tracking_id ??
              row.trackingId,
          );

        const rawStatus =
          asString(
            row.status ??
              row.delivery_status,
          ) ??
          "";

        const message =
          asString(
            row.message ??
              row.error ??
              row.details,
          );

        const normalizedStatus =
          rawStatus
            .trim()
            .toLowerCase();

        const success =
          Boolean(
            consignmentId,
          ) ||
          [
            "success",
            "created",
            "pending",
            "in_review",
          ].includes(
            normalizedStatus,
          );

        return {
          invoice,

          success,

          consignmentId,

          trackingId,

          status:
            normalizedStatus ||
            (
              success
                ? "in_review"
                : "booking_failed"
            ),

          message,
        };
      },
    )
    .filter(
      (
        row,
      ):
        row is ParsedBulkResult =>
          row !==
          null,
    );
}

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

  let reserved:
    ReservedParcel[] =
    [];

  try {
    const input =
      inputSchema.parse(
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
          items:
            true,

          shipment:
            true,
        },
      });

    const orderMap =
      new Map(
        orders.map(
          (
            order,
          ) => [
            order.id,
            order,
          ],
        ),
      );

    const skipped: {
      orderId:
        string;

      orderNumber:
        string;

      reason:
        string;
    }[] = [];

    const eligible: {
      order:
        (typeof orders)[number];

      parcel:
        SteadfastParcelInput;
    }[] = [];

    /*
     * Revalidate every selected order
     * on the SERVER.
     *
     * Never trust only the dashboard
     * eligibility calculation.
     */
    for (
      const orderId
      of uniqueIds
    ) {
      const order =
        orderMap.get(
          orderId,
        );

      if (
        !order
      ) {
        skipped.push({
          orderId,

          orderNumber:
            orderId,

          reason:
            "Order not found.",
        });

        continue;
      }

      if (
        !BOOKABLE_STATUSES.has(
          order.status,
        )
      ) {
        skipped.push({
          orderId:
            order.id,

          orderNumber:
            order.number,

          reason:
            "Order is not Ready to Ship.",
        });

        continue;
      }

      /*
       * One GOG order may only have one
       * courier shipment.
       */
      if (
        order.shipment
      ) {
        skipped.push({
          orderId:
            order.id,

          orderNumber:
            order.number,

          reason:
            "Courier shipment already exists.",
        });

        continue;
      }

      if (
        order.paymentMethod ===
          "BKASH" &&
        order.paymentStatus !==
          "PAID"
      ) {
        skipped.push({
          orderId:
            order.id,

          orderNumber:
            order.number,

          reason:
            "bKash payment is not paid.",
        });

        continue;
      }

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

      try {
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

        eligible.push({
          order,
          parcel,
        });
      } catch (
        error
      ) {
        skipped.push({
          orderId:
            order.id,

          orderNumber:
            order.number,

          reason:
            error instanceof
              Error
              ? error.message
              : "Order cannot be sent to Steadfast.",
        });
      }
    }

    if (
      eligible.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "None of the selected orders are eligible for Steadfast booking.",

          skipped,
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * Make sure Steadfast is enabled and
     * credentials can be decrypted before
     * creating reservation records.
     */
    const steadfast =
      await SteadfastClient
        .fromDatabase();

    /*
     * Reserve locally before sending.
     * orderId is UNIQUE in
     * CourierShipment.
     */
    for (
      const entry
      of eligible
    ) {
      try {
        const shipment =
          await db
            .courierShipment
            .create({
              data: {
                orderId:
                  entry.order.id,

                provider:
                  STEADFAST_PROVIDER,

                status:
                  "booking",

                codAmount:
                  entry.parcel
                    .cod_amount,
              },
            });

        reserved.push({
          orderId:
            entry.order.id,

          orderNumber:
            entry.order
              .number,

          shipmentId:
            shipment.id,

          parcel:
            entry.parcel,
        });
      } catch {
        skipped.push({
          orderId:
            entry.order.id,

          orderNumber:
            entry.order
              .number,

          reason:
            "Courier booking already exists or is being processed.",
        });
      }
    }

    if (
      reserved.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No selected orders could be reserved for courier booking.",

          skipped,
        },
        {
          status:
            409,
        },
      );
    }

    /*
     * This is the actual bulk request.
     *
     * Multiple GOG orders:
     * one API request,
     * separate Steadfast parcels.
     */
    const rawResponse =
      await steadfast
        .createBulkOrders(
          reserved.map(
            (
              item,
            ) =>
              item.parcel,
          ),
        );

    const parsed =
      parseBulkResult(
        rawResponse,
      );

    const parsedByInvoice =
      new Map(
        parsed.map(
          (
            item,
          ) => [
            item.invoice,
            item,
          ],
        ),
      );

    const now =
      new Date();

    const successful: {
      orderId:
        string;

      orderNumber:
        string;

      consignmentId:
        string |
        null;

      trackingId:
        string |
        null;

      status:
        string;
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
     * A Steadfast bulk HTTP 200 does NOT
     * mean every parcel succeeded.
     *
     * Evaluate each invoice separately.
     */
    for (
      const item
      of reserved
    ) {
      const result =
        parsedByInvoice.get(
          item.orderNumber,
        );

      if (
        !result ||
        !result.success
      ) {
        const reason =
          result?.message ??
          "Steadfast did not confirm this parcel in the bulk response.";

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
                      item.shipmentId,
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
                      item.shipmentId,

                    status:
                      "booking_failed",

                    message:
                      reason,

                    source:
                      "API",
                  },
                });
            },
          );

        failed.push({
          orderId:
            item.orderId,

          orderNumber:
            item.orderNumber,

          reason,
        });

        continue;
      }

      const status =
        result.status ||
        "in_review";

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
                    item.shipmentId,
                },

                data: {
                  consignmentId:
                    result
                      .consignmentId,

                  trackingId:
                    result
                      .trackingId,

                  status,

                  codAmount:
                    item.parcel
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
                    item.shipmentId,

                  status,

                  message:
                    "Parcel created in Steadfast via bulk booking.",

                  source:
                    "API",

                  externalAt:
                    now,
                },
              });
          },
        );

      successful.push({
        orderId:
          item.orderId,

        orderNumber:
          item.orderNumber,

        consignmentId:
          result
            .consignmentId,

        trackingId:
          result
            .trackingId,

        status,
      });
    }

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "STEADFAST_BULK_SHIPMENT_CREATED",

          entityType:
            "Order",

          metadata: {
            selected:
              uniqueIds.length,

            reserved:
              reserved.length,

            successful:
              successful.length,

            failed:
              failed.length,

            skipped:
              skipped.length,

            orderNumbers:
              successful.map(
                (
                  item,
                ) =>
                  item.orderNumber,
              ),
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

    return NextResponse.json({
      message:
        `${successful.length} order${
          successful.length ===
          1
            ? ""
            : "s"
        } sent to Steadfast${
          skipped.length >
          0
            ? ` · ${skipped.length} skipped`
            : ""
        }${
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
    console.error(
      "Steadfast bulk booking error:",
      error,
    );

    /*
     * Do not delete reservations after a
     * provider/network failure.
     *
     * The provider may have accepted the
     * parcels before the response failed.
     */
    if (
      reserved.length >
      0
    ) {
      for (
        const item
        of reserved
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
                        item.shipmentId,
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
                        item.shipmentId,

                      status:
                        "booking_failed",

                      message:
                        error instanceof
                          Error
                          ? error.message
                          : "Steadfast bulk booking failed.",

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
            "Unable to mark bulk shipment failure:",
            updateError,
          );
        }
      }
    }

    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            error.issues[0]
              ?.message ??
            "Invalid bulk courier request.",
        },
        {
          status:
            400,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to send selected orders to Steadfast.",
      },
      {
        status:
          400,
      },
    );
  }
}