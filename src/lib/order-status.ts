import type {
  OrderStatus,
} from "@prisma/client";

import {
  canTransition,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

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
  return db.$transaction(
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
         STATUS + HISTORY
         =================================================== */

      return tx.order.update({
        where: {
          id:
            order.id,
        },

        data: {
          status:
            nextStatus,

          history: {
            create: {
              oldStatus:
                order.status,

              newStatus:
                nextStatus,

              changedBy,

              source,

              note,
            },
          },
        },

        include: {
          items:
            true,

          shipment:
            true,
        },
      });
    },
    {
      maxWait:
        10_000,

      timeout:
        20_000,
    },
  );
}