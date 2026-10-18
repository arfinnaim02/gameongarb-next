import type {
  OrderStatus,
} from "@prisma/client";

import {
  canTransition,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  notificationEventForOrderStatus,
  queueOrderNotifications,
} from "@/lib/notifications/events";

type ChangeOrderStatusInput = {
  orderId:
    string;

  nextStatus:
    OrderStatus;

  changedBy?:
    string |
    null;

  inventoryActorId?:
    string |
    null;

  source:
    "ADMIN" |
    "TELEGRAM" |
    "SYSTEM";

  note?:
    string |
    null;
};

export async function changeOrderStatus({
  orderId,
  nextStatus,
  changedBy = null,
  inventoryActorId = null,
  source,
  note = null,
}: ChangeOrderStatusInput) {
  const result =
    await db.$transaction(
      async (
        tx,
      ) => {
      const order =
        await tx.order.findUniqueOrThrow({
          where: {
            id:
              orderId,
          },

          include: {
            items:
              true,
          },
        });

      if (
        !canTransition(
          order.status,
          nextStatus,
        )
      ) {
        throw new Error(
          `Cannot move order from ${order.status} to ${nextStatus}.`,
        );
      }

      /* ===================================================
         CANCELLED → RESTORE INVENTORY
         =================================================== */

      if (
        nextStatus ===
          "CANCELLED" &&
        order.status !==
          "CANCELLED"
      ) {
        const quantityByVariant =
          new Map<
            string,
            number
          >();

        for (
          const item
          of order.items
        ) {
          if (
            !item.variantId
          ) {
            continue;
          }

          quantityByVariant.set(
            item.variantId,
            (
              quantityByVariant.get(
                item.variantId,
              ) ??
              0
            ) +
              item.quantity,
          );
        }

        for (
          const [
            variantId,
            quantity,
          ]
          of quantityByVariant
        ) {
          const variant =
            await tx.productVariant.findUniqueOrThrow({
              where: {
                id:
                  variantId,
              },

              select: {
                id:
                  true,

                stock:
                  true,
              },
            });

          const afterQuantity =
            variant.stock +
            quantity;

          await tx.productVariant.update({
            where: {
              id:
                variant.id,
            },

            data: {
              stock: {
                increment:
                  quantity,
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              variantId:
                variant.id,

              quantityChange:
                quantity,

              beforeQuantity:
                variant.stock,

              afterQuantity,

              type:
                "CANCELLATION_RESTORE",

              reference:
                order.number,

              reason:
                "Order cancelled",

              createdById:
                inventoryActorId,
            },
          });
        }
      }

      /* ===================================================
         REOPEN CANCELLED → RE-DEDUCT INVENTORY
         =================================================== */

      if (
        order.status ===
          "CANCELLED" &&
        nextStatus !==
          "CANCELLED"
      ) {
        const quantityByVariant =
          new Map<
            string,
            number
          >();

        for (
          const item
          of order.items
        ) {
          if (
            !item.variantId
          ) {
            continue;
          }

          quantityByVariant.set(
            item.variantId,
            (
              quantityByVariant.get(
                item.variantId,
              ) ??
              0
            ) +
              item.quantity,
          );
        }

        for (
          const [
            variantId,
            quantity,
          ]
          of quantityByVariant
        ) {
          const variant =
            await tx.productVariant.findUniqueOrThrow({
              where: {
                id:
                  variantId,
              },

              select: {
                id:
                  true,

                stock:
                  true,
              },
            });

          if (
            variant.stock <
            quantity
          ) {
            throw new Error(
              `Cannot reopen ${order.number}. Not enough stock is available.`,
            );
          }

          const afterQuantity =
            variant.stock -
            quantity;

          await tx.productVariant.update({
            where: {
              id:
                variant.id,
            },

            data: {
              stock: {
                decrement:
                  quantity,
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              variantId:
                variant.id,

              quantityChange:
                -quantity,

              beforeQuantity:
                variant.stock,

              afterQuantity,

              type:
                "CORRECTION",

              reference:
                order.number,

              reason:
                `Order reopened from CANCELLED to ${nextStatus}`,

              createdById:
                inventoryActorId,
            },
          });
        }
      }

      /* ===================================================
         STATUS HISTORY
         =================================================== */

      const history =
        await tx.orderStatusHistory.create({
          data: {
            orderId:
              order.id,

            oldStatus:
              order.status,

            newStatus:
              nextStatus,

            changedBy,

            source,

            note,
          },
        });

      /* ===================================================
         UPDATE ORDER
         =================================================== */

      const updatedOrder =
        await tx.order.update({
          where: {
            id:
              order.id,
          },

          data: {
            status:
              nextStatus,
          },

          include: {
            items:
              true,

            shipment:
              true,
          },
        });

      return {
        order:
          updatedOrder,

        historyId:
          history.id,
      };
    },
    {
      maxWait:
        10_000,

      timeout:
        20_000,
    },
  );

  /* =======================================================
     CUSTOMER NOTIFICATION OUTBOX

     Runs only after the order transaction has committed.

     A notification failure must never roll back
     inventory or the order status change.
     ======================================================= */

  const notificationEvent =
    notificationEventForOrderStatus(
      nextStatus,
    );

  if (
    notificationEvent
  ) {
    try {
      await queueOrderNotifications({
        orderId:
          result.order.id,

        event:
          notificationEvent,

        occurrenceKey:
          result.historyId,
      });
    } catch (
      error
    ) {
      console.error(
        "Order notification queue failed:",
        {
          orderId:
            result.order.id,

          status:
            nextStatus,

          historyId:
            result.historyId,

          error,
        },
      );
    }
  }

  return result.order;
}