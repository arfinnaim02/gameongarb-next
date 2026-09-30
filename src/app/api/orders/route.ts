import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  couponDiscount,
  deliveryFee,
  detectDeliveryZone,
  inferDistrictFromAddress,
  orderTotal,
} from "@/lib/business";

import {
  createOrderAccessToken,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  fromPaisa,
  toPaisa,
} from "@/lib/money";

import {
  getApiUser,
} from "@/lib/session";

/* =========================================================
   VALIDATION
   ========================================================= */

const schema =
  z.object({
    fullName:
      z
        .string()
        .trim()
        .min(
          2,
          "Full name is required.",
        )
        .max(100),

    phone:
      z
        .string()
        .trim()
        .regex(
          /^01\d{9}$/,
          "Enter a valid Bangladeshi phone number.",
        ),

    email:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email address.",
        )
        .optional(),

    address:
      z
        .string()
        .trim()
        .min(
          10,
          "Enter your complete delivery address.",
        )
        .max(500),

    paymentMethod:
      z.enum([
        "COD",
        "BKASH",
      ]),

    couponCode:
      z
        .string()
        .max(40)
        .optional(),

    automaticCouponId:
      z
        .string()
        .optional(),

    items:
      z
        .array(
          z.object({
            productId:
              z.string(),

            size:
              z.string(),

            color:
              z.string(),

            quantity:
              z
                .number()
                .int()
                .min(1)
                .max(10),
          }),
        )
        .min(1)
        .max(30),
  });

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  req: Request,
) {
  try {
    const input =
      schema.parse(
        await req.json(),
      );

    const sessionUser =
      await getApiUser(
        req,
      );

    /* =====================================================
       STORE SETTINGS
       ===================================================== */

    const settings =
      await db.storeSetting.findMany({
        where: {
          key: {
            in: [
              "shipping",
              "payments",
              "general",
            ],
          },
        },
      });

    const general =
      (
        settings.find(
          (
            item,
          ) =>
            item.key ===
            "general",
        )?.value ??
        {}
      ) as {
        storeLive?:
          boolean;

        maintenanceMode?:
          boolean;
      };

    if (
      general.storeLive ===
        false ||
      general.maintenanceMode ===
        true
    ) {
      return NextResponse.json(
        {
          error:
            "The store is temporarily unavailable.",
        },
        {
          status: 503,
        },
      );
    }

    const shipping =
      (
        settings.find(
          (
            item,
          ) =>
            item.key ===
            "shipping",
        )?.value ??
        {
          insideDhaka:
            80,

          outsideDhaka:
            150,
        }
      ) as {
        insideDhaka:
          number;

        outsideDhaka:
          number;
      };

    const payments =
      (
        settings.find(
          (
            item,
          ) =>
            item.key ===
            "payments",
        )?.value ??
        {
          codEnabled:
            true,

          bkashEnabled:
            true,
        }
      ) as {
        codEnabled:
          boolean;

        bkashEnabled:
          boolean;
      };

    if (
      (
        input.paymentMethod ===
          "COD" &&
        !payments.codEnabled
      ) ||
      (
        input.paymentMethod ===
          "BKASH" &&
        !payments.bkashEnabled
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Selected payment method is unavailable.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DELIVERY LOCATION
       ===================================================== */

    const deliveryZone =
      detectDeliveryZone(
        input.address,
      );

    if (
      !deliveryZone
    ) {
      return NextResponse.json(
        {
          error:
            "Enter your complete delivery address.",
        },
        {
          status: 400,
        },
      );
    }

    const district =
      inferDistrictFromAddress(
        input.address,
      );

    /*
     * Legacy DB fields remain populated
     * for compatibility with the current
     * Orders/Admin system.
     *
     * The customer only enters one
     * address field on checkout.
     */
    const legacyDivision =
      deliveryZone ===
      "INSIDE_DHAKA"
        ? "Dhaka"
        : "Bangladesh";

    const legacyThana =
      "Not provided";

    /* =====================================================
       VARIANTS
       ===================================================== */

    const variants =
      await db.productVariant.findMany({
        where: {
          OR:
            input.items.map(
              (
                item,
              ) => ({
                productId:
                  item.productId,

                size:
                  item.size,

                color:
                  item.color,

                active:
                  true,
              }),
            ),
        },

        include: {
          product: {
            include: {
              images: {
                orderBy: {
                  sortOrder:
                    "asc",
                },

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

    const verified =
      input.items.map(
        (
          item,
        ) => {
          const variant =
            variants.find(
              (
                candidate,
              ) =>
                candidate.productId ===
                  item.productId &&
                candidate.size ===
                  item.size &&
                candidate.color ===
                  item.color,
            );

          if (
            !variant ||
            variant.stock <
              item.quantity ||
            variant.product.status !==
              "ACTIVE"
          ) {
            throw new Error(
              "Insufficient stock for a selected item.",
            );
          }

          return {
            item,
            variant,

            pricePaisa:
              toPaisa(
                Number(
                  variant.priceOverride ??
                    variant.product
                      .salePrice ??
                    variant.product
                      .regularPrice,
                ),
              ),
          };
        },
      );

    /* =====================================================
       TOTALS
       ===================================================== */

    const subtotalPaisa =
      verified.reduce(
        (
          total,
          entry,
        ) =>
          total +
          entry.pricePaisa *
            entry.item.quantity,

        0,
      );

    const shippingPaisa =
      toPaisa(
        deliveryFee(
          input.address,
          shipping,
        ),
      );

    /* =====================================================
       COUPON
       ===================================================== */

    let coupon =
      null;

    let discountPaisa =
      0;

    if (
      input.couponCode ||
      input.automaticCouponId
    ) {
      coupon =
        await db.coupon.findFirst({
          where: {
            ...(input.couponCode
              ? {
                  code:
                    input.couponCode,

                  kind:
                    "CODE" as const,
                }
              : {
                  id:
                    input.automaticCouponId,

                  kind:
                    "AUTOMATIC" as const,
                }),

            active:
              true,

            validFrom: {
              lte:
                new Date(),
            },

            OR: [
              {
                validUntil:
                  null,
              },

              {
                validUntil: {
                  gte:
                    new Date(),
                },
              },
            ],
          },

          include: {
            _count: {
              select: {
                usage:
                  true,
              },
            },

            products: {
              select: {
                productId:
                  true,
              },
            },

            categories: {
              select: {
                categoryId:
                  true,
              },
            },
          },
        });

      if (!coupon) {
        return NextResponse.json(
          {
            error:
              "Coupon is invalid or expired.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        coupon.usageLimit &&
        coupon._count.usage >=
          coupon.usageLimit
      ) {
        return NextResponse.json(
          {
            error:
              "Coupon usage limit has been reached.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        coupon.minimumOrder &&
        fromPaisa(
          subtotalPaisa,
        ) <
          Number(
            coupon.minimumOrder,
          )
      ) {
        return NextResponse.json(
          {
            error:
              "This order does not meet the coupon minimum.",
          },
          {
            status: 400,
          },
        );
      }

      const scoped =
        coupon.products.length >
          0 ||
        coupon.categories.length >
          0;

      const eligiblePaisa =
        verified
          .filter(
            ({
              variant,
            }) =>
              !scoped ||
              coupon!.products.some(
                (
                  scope: {
                    productId:
                      string;
                  },
                ) =>
                  scope.productId ===
                  variant.productId,
              ) ||
              variant.product.categories.some(
                (
                  category,
                ) =>
                  coupon!.categories.some(
                    (
                      scope: {
                        categoryId:
                          string;
                      },
                    ) =>
                      scope.categoryId ===
                      category.categoryId,
                  ),
              ),
          )
          .reduce(
            (
              total,
              item,
            ) =>
              total +
              item.pricePaisa *
                item.item.quantity,

            0,
          );

      if (
        scoped &&
        eligiblePaisa ===
          0
      ) {
        return NextResponse.json(
          {
            error:
              "This coupon does not apply to the selected products.",
          },
          {
            status: 400,
          },
        );
      }

      discountPaisa =
        toPaisa(
          couponDiscount(
            fromPaisa(
              eligiblePaisa,
            ),

            fromPaisa(
              shippingPaisa,
            ),

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
          ),
        );
    }

    const totalPaisa =
      toPaisa(
        orderTotal(
          fromPaisa(
            subtotalPaisa,
          ),

          fromPaisa(
            shippingPaisa,
          ),

          fromPaisa(
            discountPaisa,
          ),
        ),
      );

    /* =====================================================
       ORDER TRANSACTION
       ===================================================== */

    const order =
      await db.$transaction(
        async (
          tx,
        ) => {
          const day =
            new Date()
              .toISOString()
              .slice(
                0,
                10,
              )
              .replaceAll(
                "-",
                "",
              );

          const today =
            new Date();

          today.setHours(
            0,
            0,
            0,
            0,
          );

          const count =
            await tx.order.count({
              where: {
                createdAt: {
                  gte:
                    today,
                },
              },
            });

          const number =
            `GOG-${day}-${String(
              count +
                1,
            ).padStart(
              3,
              "0",
            )}`;

          /* ===============================================
             CUSTOMER
             =============================================== */

          /*
           * Guest checkout customers are
           * identified by phone number.
           *
           * IMPORTANT:
           * Customer.email is unique in Prisma.
           * The checkout email belongs to the
           * ORDER and must never be allowed to
           * block order placement because the
           * same email already exists on another
           * Customer record.
           *
           * Account/customer email ownership can
           * be managed separately by the account
           * system.
           */
          const customer =
            sessionUser?.customer
              ? sessionUser.customer
              : await tx.customer.upsert({
                  where: {
                    phone:
                      input.phone,
                  },

                  update: {
                    name:
                      input.fullName,
                  },

                  create: {
                    name:
                      input.fullName,

                    phone:
                      input.phone,

                    email:
                      null,
                  },
                });

          /* ===============================================
             COUPON LIMIT
             =============================================== */

          if (
            coupon?.perCustomerLimit
          ) {
            const customerUsage =
              await tx.couponUsage.count({
                where: {
                  couponId:
                    coupon.id,

                  customerId:
                    customer.id,
                },
              });

            if (
              customerUsage >=
              coupon.perCustomerLimit
            ) {
              throw new Error(
                "You have already used this coupon the maximum number of times.",
              );
            }
          }

          /* ===============================================
             STOCK
             =============================================== */

          for (
            const entry
            of verified
          ) {
            const updated =
              await tx.productVariant.updateMany({
                where: {
                  id:
                    entry.variant.id,

                  stock: {
                    gte:
                      entry.item.quantity,
                  },
                },

                data: {
                  stock: {
                    decrement:
                      entry.item.quantity,
                  },
                },
              });

            if (
              updated.count !==
              1
            ) {
              throw new Error(
                "Stock changed while checking out. Please review your cart.",
              );
            }

            await tx.inventoryTransaction.create({
              data: {
                variantId:
                  entry.variant.id,

                quantityChange:
                  -entry.item.quantity,

                beforeQuantity:
                  entry.variant.stock,

                afterQuantity:
                  entry.variant.stock -
                  entry.item.quantity,

                type:
                  "SALE",

                reference:
                  number,

                reason:
                  "Order placed",
              },
            });
          }

          /* ===============================================
             CREATE ORDER
             =============================================== */

          return tx.order.create({
            data: {
              number,

              customerId:
                customer.id,

              customerName:
                input.fullName,

              phone:
                input.phone,

              email:
                input.email,

              /*
               * Retained for compatibility
               * with existing admin/order
               * database structure.
               */
              division:
                legacyDivision,

              district,

              thana:
                legacyThana,

              shippingAddress:
                input.address,

              subtotal:
                fromPaisa(
                  subtotalPaisa,
                ),

              discount:
                fromPaisa(
                  discountPaisa,
                ),

              deliveryCharge:
                fromPaisa(
                  shippingPaisa,
                ),

              total:
                fromPaisa(
                  totalPaisa,
                ),

              paymentMethod:
                input.paymentMethod,

              paymentStatus:
                input.paymentMethod ===
                "COD"
                  ? "PENDING"
                  : "PROCESSING",

              couponCode:
                coupon?.code,

              items: {
                create:
                  verified.map(
                    (
                      entry,
                    ) => ({
                      productId:
                        entry.variant
                          .productId,

                      variantId:
                        entry.variant
                          .id,

                      name:
                        entry.variant
                          .product
                          .name,

                      sku:
                        entry.variant
                          .sku,

                      size:
                        entry.variant
                          .size,

                      color:
                        entry.variant
                          .color,

                      image:
                        entry.variant
                          .product
                          .images[0]
                          ?.url ??
                        "/images/products/tshirt.svg",

                      unitPrice:
                        fromPaisa(
                          entry.pricePaisa,
                        ),

                      quantity:
                        entry.item
                          .quantity,

                      lineTotal:
                        fromPaisa(
                          entry.pricePaisa *
                            entry.item
                              .quantity,
                        ),
                    }),
                  ),
              },

              history: {
                create: {
                  newStatus:
                    "NEW",

                  note:
                    "Order placed",

                  source:
                    "STOREFRONT",
                },
              },

              payments: {
                create: {
                  method:
                    input.paymentMethod,

                  status:
                    input.paymentMethod ===
                    "COD"
                      ? "PENDING"
                      : "PROCESSING",

                  amount:
                    fromPaisa(
                      totalPaisa,
                    ),
                },
              },

              ...(coupon
                ? {
                    couponUsage: {
                      create: {
                        couponId:
                          coupon.id,

                        customerId:
                          customer.id,

                        amount:
                          fromPaisa(
                            discountPaisa,
                          ),
                      },
                    },
                  }
                : {}),
            },
          });
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

    /* =====================================================
       RESPONSE
       ===================================================== */

    const response =
      NextResponse.json(
        {
          orderNumber:
            order.number,

          paymentMode:
            input.paymentMethod ===
            "BKASH"
              ? (
                  process.env
                    .BKASH_MODE ??
                  "sandbox"
                )
              : "cod",

          deliveryZone,

          deliveryCharge:
            fromPaisa(
              shippingPaisa,
            ),
        },
        {
          status: 201,
        },
      );

    response.cookies.set(
      "gog_order_access",

      await createOrderAccessToken(
        order.number,
        input.phone,
      ),

      {
        httpOnly:
          true,

        secure:
          process.env
            .NODE_ENV ===
          "production",

        sameSite:
          "lax",

        path:
          "/",

        maxAge:
          60 *
          60 *
          2,
      },
    );

    return response;
  } catch (error) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete the required checkout fields.",

          fields:
            error.flatten()
              .fieldErrors,
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      "Order creation error:",
      error,
    );

    const prismaError =
      error &&
      typeof error ===
        "object" &&
      "code" in error
        ? (
            error as {
              code?: string;

              meta?: {
                target?:
                  unknown;
              };
            }
          )
        : null;

    if (
      prismaError?.code ===
      "P2002"
    ) {
      const target =
        prismaError.meta
          ?.target;

      const fields =
        Array.isArray(
          target,
        )
          ? target.map(
              String,
            )
          : [];

      if (
        fields.includes(
          "number",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Another order was placed at the same moment. Please press Place Order again.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            "We could not finalize the order because some customer information already exists. Please try again.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      prismaError?.code ===
      "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "Stock changed while your order was being processed. Please try placing the order again.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Order could not be placed. Please try again.",
      },
      {
        status: 400,
      },
    );
  }
}