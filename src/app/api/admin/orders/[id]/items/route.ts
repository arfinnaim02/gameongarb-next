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
  couponDiscount,
  hasPermission,
  orderTotal,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  refreshTelegramOrderMessage,
} from "@/lib/telegram";

export const dynamic =
  "force-dynamic";

const EDITABLE_STATUSES =
  new Set([
    "NEW",
    "CONFIRMED",
    "PACKING",
    "READY_TO_SHIP",
  ]);

const schema =
  z.object({
    items:
      z
        .array(
          z.object({
            orderItemId:
              z
                .string()
                .nullable()
                .optional(),

            variantId:
              z.string(),

            quantity:
              z
                .number()
                .int()
                .min(1)
                .max(50),
          }),
        )
        .min(
          1,
          "An order must contain at least one item.",
        )
        .max(30),
  });

export async function PATCH(
  request:
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
  try {
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

    const input =
      schema.parse(
        await request.json(),
      );

    const variantIds =
      input.items.map(
        (
          item,
        ) =>
          item.variantId,
      );

    if (
      new Set(
        variantIds,
      ).size !==
      variantIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "The same product variant cannot appear twice in one order.",
        },
        {
          status:
            400,
        },
      );
    }

    const result =
      await db.$transaction(
        async (
          tx,
        ) => {
          const order =
            await tx.order.findUnique({
              where: {
                id,
              },

              include: {
                items:
                  true,

                shipment:
                  true,

                couponUsage: {
                  include: {
                    coupon: {
                      include: {
                        products:
                          true,

                        categories:
                          true,
                      },
                    },
                  },
                },
              },
            });

          if (!order) {
            throw new Error(
              "Order not found.",
            );
          }

          if (
            !EDITABLE_STATUSES.has(
              order.status,
            )
          ) {
            throw new Error(
              "Order items can only be edited before the order is shipped or completed.",
            );
          }

          if (
            order.shipment
              ?.consignmentId ||
            order.shipment
              ?.trackingId
          ) {
            throw new Error(
              "Order items are locked because this order has already been sent to the courier.",
            );
          }

          if (
            order.paymentStatus ===
            "PAID"
          ) {
            throw new Error(
              "Paid orders cannot be edited because the captured payment amount must remain unchanged.",
            );
          }

          const existingById =
            new Map(
              order.items.map(
                (
                  item,
                ) => [
                  item.id,
                  item,
                ],
              ),
            );

          for (
            const item
            of input.items
          ) {
            if (
              item.orderItemId &&
              !existingById.has(
                item.orderItemId,
              )
            ) {
              throw new Error(
                "One of the selected order items no longer exists.",
              );
            }
          }

          const variants =
            await tx.productVariant.findMany({
              where: {
                id: {
                  in:
                    variantIds,
                },

                active:
                  true,

                product: {
                  status:
                    "ACTIVE",
                },
              },

              include: {
                product: {
                  include: {
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
                    },

                    categories: {
                      select: {
                        categoryId:
                          true,
                      },
                    },
                  },
                },
              },
            });

          if (
            variants.length !==
            variantIds.length
          ) {
            throw new Error(
              "One or more selected product variants are unavailable.",
            );
          }

          const variantById =
            new Map(
              variants.map(
                (
                  variant,
                ) => [
                  variant.id,
                  variant,
                ],
              ),
            );

          const oldQuantityByVariant =
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

            oldQuantityByVariant.set(
              item.variantId,
              (
                oldQuantityByVariant.get(
                  item.variantId,
                ) ??
                0
              ) +
                item.quantity,
            );
          }

          const newQuantityByVariant =
            new Map<
              string,
              number
            >();

          for (
            const item
            of input.items
          ) {
            newQuantityByVariant.set(
              item.variantId,
              (
                newQuantityByVariant.get(
                  item.variantId,
                ) ??
                0
              ) +
                item.quantity,
            );
          }

          const allVariantIds =
            new Set([
              ...oldQuantityByVariant.keys(),
              ...newQuantityByVariant.keys(),
            ]);

          for (
            const variantId
            of allVariantIds
          ) {
            const oldQuantity =
              oldQuantityByVariant.get(
                variantId,
              ) ??
              0;

            const newQuantity =
              newQuantityByVariant.get(
                variantId,
              ) ??
              0;

            const stockChange =
              oldQuantity -
              newQuantity;

            if (
              stockChange ===
              0
            ) {
              continue;
            }

            const currentVariant =
              await tx.productVariant.findUnique({
                where: {
                  id:
                    variantId,
                },

                select: {
                  stock:
                    true,
                },
              });

            if (
              !currentVariant
            ) {
              throw new Error(
                "A product variant used by this order no longer exists.",
              );
            }

            const beforeQuantity =
              currentVariant.stock;

            if (
              stockChange <
              0
            ) {
              const required =
                Math.abs(
                  stockChange,
                );

              const updated =
                await tx.productVariant.updateMany({
                  where: {
                    id:
                      variantId,

                    stock: {
                      gte:
                        required,
                    },
                  },

                  data: {
                    stock: {
                      decrement:
                        required,
                    },
                  },
                });

              if (
                updated.count !==
                1
              ) {
                throw new Error(
                  "Not enough stock is available for one of the selected variants.",
                );
              }
            } else {
              await tx.productVariant.update({
                where: {
                  id:
                    variantId,
                },

                data: {
                  stock: {
                    increment:
                      stockChange,
                  },
                },
              });
            }

            await tx.inventoryTransaction.create({
              data: {
                variantId,

                quantityChange:
                  stockChange,

                beforeQuantity,

                afterQuantity:
                  beforeQuantity +
                  stockChange,

                type:
                  "CORRECTION",

                reference:
                  order.number,

                reason:
                  "Admin order item edit",

                createdById:
                  admin.id,
              },
            });
          }

          const nextItems =
            input.items.map(
              (
                item,
              ) => {
                const variant =
                  variantById.get(
                    item.variantId,
                  )!;

                const existing =
                  item.orderItemId
                    ? existingById.get(
                        item.orderItemId,
                      )
                    : null;

                const sameVariant =
                  Boolean(
                    existing &&
                    existing.variantId ===
                      variant.id,
                  );

                const unitPrice =
                  sameVariant
                    ? Number(
                        existing!
                          .unitPrice,
                      )
                    : Number(
                        variant.priceOverride ??
                          variant.product
                            .salePrice ??
                          variant.product
                            .regularPrice,
                      );

                const name =
                  sameVariant
                    ? existing!
                        .name
                    : variant.product
                        .name;

                return {
                  orderItemId:
                    existing?.id ??
                    null,

                  productId:
                    variant.productId,

                  variantId:
                    variant.id,

                  name,

                  sku:
                    variant.sku,

                  size:
                    variant.size,

                  color:
                    variant.color,

                  image:
                    variant.product
                      .images[0]
                      ?.url ??
                    "/images/products/tshirt.svg",

                  unitPrice,

                  quantity:
                    item.quantity,

                  lineTotal:
                    unitPrice *
                    item.quantity,

                  categoryIds:
                    variant.product
                      .categories.map(
                        (
                          category,
                        ) =>
                          category.categoryId,
                      ),
                };
              },
            );

          const subtotal =
            nextItems.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.lineTotal,

              0,
            );

          const deliveryCharge =
            Number(
              order.deliveryCharge,
            );

          let discount =
            0;

          const coupon =
            order.couponUsage
              ?.coupon ??
            null;

          if (
            coupon
          ) {
            const minimumOrder =
              coupon.minimumOrder
                ? Number(
                    coupon.minimumOrder,
                  )
                : 0;

            if (
              subtotal >=
              minimumOrder
            ) {
              const scopedProductIds =
                new Set(
                  coupon.products.map(
                    (
                      item,
                    ) =>
                      item.productId,
                  ),
                );

              const scopedCategoryIds =
                new Set(
                  coupon.categories.map(
                    (
                      item,
                    ) =>
                      item.categoryId,
                  ),
                );

              const scoped =
                scopedProductIds.size >
                  0 ||
                scopedCategoryIds.size >
                  0;

              const eligibleSubtotal =
                nextItems
                  .filter(
                    (
                      item,
                    ) =>
                      !scoped ||
                      scopedProductIds.has(
                        item.productId,
                      ) ||
                      item.categoryIds.some(
                        (
                          categoryId,
                        ) =>
                          scopedCategoryIds.has(
                            categoryId,
                          ),
                      ),
                  )
                  .reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.lineTotal,

                    0,
                  );

              if (
                !scoped ||
                eligibleSubtotal >
                  0
              ) {
                discount =
                  couponDiscount(
                    eligibleSubtotal,
                    deliveryCharge,
                    {
                      type:
                        coupon.type ===
                        "FIXED"
                          ? "FIXED"
                          : coupon.type ===
                              "FREE_SHIPPING"
                            ? "FREE_SHIPPING"
                            : "PERCENTAGE",

                      value:
                        Number(
                          coupon.value,
                        ),

                      maximum:
                        coupon.maximumDiscount
                          ? Number(
                              coupon.maximumDiscount,
                            )
                          : undefined,
                    },
                  );
              }
            }
          } else {
            /*
             * Legacy orders may contain a manually stored
             * discount without a CouponUsage relation.
             * Preserve it, but never allow the discount to
             * exceed the updated subtotal + delivery.
             */
            discount =
              Math.min(
                Number(
                  order.discount,
                ),
                subtotal +
                  deliveryCharge,
              );
          }

          const total =
            orderTotal(
              subtotal,
              deliveryCharge,
              discount,
            );

          if (
            Number(
              order.deliveryAdvancePaid,
            ) >
            total
          ) {
            throw new Error(
              "The updated order total would be lower than the delivery advance already paid.",
            );
          }

          await tx.orderItem.deleteMany({
            where: {
              orderId:
                order.id,
            },
          });

          await tx.orderItem.createMany({
            data:
              nextItems.map(
                (
                  item,
                ) => ({
                  orderId:
                    order.id,

                  productId:
                    item.productId,

                  variantId:
                    item.variantId,

                  name:
                    item.name,

                  sku:
                    item.sku,

                  size:
                    item.size,

                  color:
                    item.color,

                  image:
                    item.image,

                  unitPrice:
                    item.unitPrice,

                  quantity:
                    item.quantity,

                  lineTotal:
                    item.lineTotal,
                }),
              ),
          });

          await tx.order.update({
            where: {
              id:
                order.id,
            },

            data: {
              subtotal,

              discount,

              total,
            },
          });

          if (
            order.couponUsage
          ) {
            await tx.couponUsage.update({
              where: {
                orderId:
                  order.id,
              },

              data: {
                amount:
                  discount,
              },
            });
          }

          await tx.payment.updateMany({
            where: {
              orderId:
                order.id,

              status: {
                in: [
                  "PENDING",
                  "PROCESSING",
                ],
              },
            },

            data: {
              amount:
                total,
            },
          });

          if (
            order.shipment &&
            !order.shipment
              .consignmentId &&
            !order.shipment
              .trackingId
          ) {
            await tx.courierShipment.update({
              where: {
                id:
                  order.shipment.id,
              },

              data: {
                codAmount:
                  order.paymentMethod ===
                  "COD"
                    ? Math.max(
                        0,
                        total -
                          Number(
                            order.deliveryAdvancePaid,
                          ),
                      )
                    : 0,
              },
            });
          }

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "ORDER_ITEMS_UPDATED",

              entityType:
                "Order",

              entityId:
                order.id,

              metadata: {
                orderNumber:
                  order.number,

                previousSubtotal:
                  Number(
                    order.subtotal,
                  ),

                previousDiscount:
                  Number(
                    order.discount,
                  ),

                previousTotal:
                  Number(
                    order.total,
                  ),

                subtotal,

                discount,

                total,

                itemCount:
                  nextItems.reduce(
                    (
                      count,
                      item,
                    ) =>
                      count +
                      item.quantity,

                    0,
                  ),
              },
            },
          });

          return {
            orderNumber:
              order.number,

            subtotal,

            discount,

            deliveryCharge,

            total,
          };
        },

        {
          isolationLevel:
            "Serializable",

          maxWait:
            10_000,

          timeout:
            20_000,
        },
      );

    revalidatePath(
      `/admin/orders/${id}`,
    );

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      "/account/orders",
    );

    revalidatePath(
      `/account/orders/${id}`,
    );

    revalidatePath(
      "/track-order",
    );

    try {
      await refreshTelegramOrderMessage(
        id,
      );
    } catch (
      telegramError
    ) {
      console.error(
        "Unable to refresh Telegram after order item edit:",
        telegramError,
      );
    }

    return NextResponse.json({
      message:
        "Order items and bill updated successfully.",

      totals: {
        subtotal:
          result.subtotal,

        discount:
          result.discount,

        deliveryCharge:
          result.deliveryCharge,

        total:
          result.total,
      },
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
            "Invalid order items.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Order items PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to update order items.",
      },
      {
        status:
          400,
      },
    );
  }
}
