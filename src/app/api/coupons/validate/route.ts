import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  db,
} from "@/lib/db";

import {
  couponDiscount,
  deliveryFee,
  detectDeliveryZone,
} from "@/lib/business";

/* =========================================================
   VALIDATION
   ========================================================= */

const schema =
  z.object({
    code:
      z
        .string()
        .trim()
        .min(2)
        .optional(),

    address:
      z
        .string()
        .trim()
        .min(5)
        .max(500),

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
                .positive(),
          }),
        )
        .min(1),
  });

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request,
) {
  try {
    const input =
      schema.parse(
        await request.json(),
      );

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
            "Enter your delivery address first.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      coupon,
      settings,
      variants,
    ] =
      await Promise.all([
        db.coupon.findFirst({
          where: {
            ...(input.code
              ? {
                  code:
                    input.code.toUpperCase(),

                  kind:
                    "CODE" as const,
                }
              : {
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
        }),

        db.storeSetting.findUnique({
          where: {
            key:
              "shipping",
          },
        }),

        db.productVariant.findMany({
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
                categories: {
                  select: {
                    categoryId:
                      true,
                  },
                },
              },
            },
          },
        }),
      ]);

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

    /* =====================================================
       VERIFIED CART PRICES
       ===================================================== */

    const pricedItems =
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

          if (!variant) {
            throw new Error(
              "A cart variant is unavailable.",
            );
          }

          const lineTotal =
            Number(
              variant.priceOverride ??
                variant.product
                  .salePrice ??
                variant.product
                  .regularPrice,
            ) *
            item.quantity;

          return {
            variant,
            lineTotal,
          };
        },
      );

    const subtotal =
      pricedItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.lineTotal,

        0,
      );

    if (
      coupon.minimumOrder &&
      subtotal <
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

    /* =====================================================
       COUPON SCOPE
       ===================================================== */

    const scoped =
      coupon.products.length >
        0 ||
      coupon.categories.length >
        0;

    const eligibleSubtotal =
      pricedItems
        .filter(
          ({
            variant,
          }) =>
            !scoped ||
            coupon.products.some(
              (
                scope,
              ) =>
                scope.productId ===
                variant.productId,
            ) ||
            variant.product.categories.some(
              (
                category,
              ) =>
                coupon.categories.some(
                  (
                    scope,
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
            item.lineTotal,

          0,
        );

    if (
      scoped &&
      eligibleSubtotal ===
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

    /* =====================================================
       SHIPPING
       ===================================================== */

    const shipping =
      (
        settings?.value ??
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

    const fee =
      deliveryFee(
        input.address,
        shipping,
      );

    const discount =
      couponDiscount(
        eligibleSubtotal,
        fee,
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

    if (!discount) {
      return NextResponse.json(
        {
          error:
            "This order does not meet the coupon requirements.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      code:
        coupon.code,

      couponId:
        coupon.kind ===
        "AUTOMATIC"
          ? coupon.id
          : undefined,

      title:
        coupon.title,

      discount,

      deliveryZone,

      deliveryCharge:
        fee,

      message:
        `${coupon.title} applied`,
    });
  } catch (error) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid coupon request.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Coupon could not be applied.",
      },
      {
        status: 400,
      },
    );
  }
}