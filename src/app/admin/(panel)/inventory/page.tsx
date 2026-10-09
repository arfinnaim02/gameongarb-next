import {
  notFound,
} from "next/navigation";

import {
  InventoryManager,
} from "@/components/admin/inventory-manager";

import {
  db,
} from "@/lib/db";

import {
  hasPermission,
} from "@/lib/business";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function InventoryPage() {
  const user =
    await requireAdmin();

  if (
    !hasPermission(
      user.role,
      "inventory",
    )
  ) {
    notFound();
  }

  const [
    variants,
    history,
  ] =
    await Promise.all([
      db.productVariant.findMany({
        include: {
          product: {
            select: {
              id:
                true,

              name:
                true,

              status:
                true,

              images: {
                orderBy: [
                  {
                    primary:
                      "desc",
                  },

                  {
                    sortOrder:
                      "asc",
                  },
                ],

                take:
                  1,

                select: {
                  url:
                    true,

                  alt:
                    true,
                },
              },

              categories: {
                where: {
                  primary:
                    true,
                },

                take:
                  1,

                select: {
                  category: {
                    select: {
                      name:
                        true,
                    },
                  },
                },
              },
            },
          },
        },

        orderBy: [
          {
            product: {
              name:
                "asc",
            },
          },

          {
            sku:
              "asc",
          },
        ],
      }),

      db.inventoryTransaction.findMany({
        include: {
          variant: {
            select: {
              sku:
                true,

              size:
                true,

              color:
                true,

              product: {
                select: {
                  name:
                    true,
                },
              },
            },
          },

          createdBy: {
            select: {
              name:
                true,

              email:
                true,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          500,
      }),
    ]);

  return (
    <InventoryManager
      initialVariants={
        variants.map(
          (
            variant,
          ) => ({
            id:
              variant.id,

            productId:
              variant.productId,

            product:
              variant.product.name,

            productStatus:
              variant.product.status,

            category:
              variant.product
                .categories[0]
                ?.category
                .name ??
              "Uncategorized",

            image:
              variant.product
                .images[0]
                ?.url ??
              null,

            imageAlt:
              variant.product
                .images[0]
                ?.alt ??
              variant.product.name,

            sku:
              variant.sku,

            size:
              variant.size,

            color:
              variant.color,

            colorHex:
              variant.colorHex,

            stock:
              variant.stock,

            lowStockThreshold:
              variant.lowStockThreshold,

            active:
              variant.active,
          }),
        )
      }
      initialHistory={
        history.map(
          (
            transaction,
          ) => ({
            id:
              transaction.id,

            variantId:
              transaction.variantId,

            product:
              transaction.variant
                .product.name,

            sku:
              transaction.variant
                .sku,

            size:
              transaction.variant
                .size,

            color:
              transaction.variant
                .color,

            quantityChange:
              transaction.quantityChange,

            beforeQuantity:
              transaction.beforeQuantity,

            afterQuantity:
              transaction.afterQuantity,

            type:
              transaction.type,

            reference:
              transaction.reference,

            reason:
              transaction.reason,

            actor:
              transaction.createdBy
                ?.name ??
              "System",

            actorEmail:
              transaction.createdBy
                ?.email ??
              null,

            createdAt:
              transaction.createdAt.toISOString(),
          }),
        )
      }
    />
  );
}