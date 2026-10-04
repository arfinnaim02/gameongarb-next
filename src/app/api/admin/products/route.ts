import {
  Prisma,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  ZodError,
} from "zod";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  adminProductInclude,
  normalizeProductImages,
  productEditorSchema,
  serializeAdminProduct,
} from "@/lib/admin-products";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

/* =========================================================
   TRANSACTION SETTINGS
   ========================================================= */

const PRODUCT_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request,
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "products",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json();

    /* =====================================================
       DUPLICATE EXISTING PRODUCT
       ===================================================== */

    if (
      typeof body.duplicateId ===
      "string"
    ) {
      const source =
        await db.product.findUniqueOrThrow({
          where: {
            id:
              body.duplicateId,
          },

          include:
            adminProductInclude,
        });

      const stamp =
        Date.now()
          .toString()
          .slice(-8);

      const duplicated =
        await db.product.create({
          data: {
            name:
              `${source.name} Copy`,

                          sizeChartId:
              source.sizeChartId,

            slug:
              `${source.slug}-copy-${stamp}`,

            shortDescription:
              source.shortDescription,

            description:
              source.description,

            brand:
              source.brand,

            regularPrice:
              source.regularPrice,

            salePrice:
              source.salePrice,

            status:
              "DRAFT",

            featured:
              false,

            newArrival:
              false,

            trending:
              false,

            seoTitle:
              source.seoTitle,

            seoDescription:
              source.seoDescription,

            images: {
              create:
                source.images.map(
                  (
                    image,
                  ) => ({
                    url:
                      image.url,

                    /*
                     * Duplicate products may reuse
                     * the same rendered URL, but
                     * must not claim ownership of
                     * the source Cloudinary asset.
                     */
                    publicId:
                      null,

                    alt:
                      image.alt,

                    color:
                      image.color,

                    sortOrder:
                      image.sortOrder,

                    primary:
                      image.primary,
                  }),
                ),
            },

            variants: {
              create:
                source.variants.map(
                  (
                    variant,
                    index,
                  ) => ({
                    sku:
                      `${variant.sku}-COPY-${stamp}-${index + 1}`,

                    size:
                      variant.size,

                    color:
                      variant.color,

                    colorHex:
                      variant.colorHex,

                    attributes:
                      variant.attributes ??
                      undefined,

                    priceOverride:
                      variant.priceOverride,

                    /*
                     * A duplicate starts with
                     * zero stock intentionally.
                     */
                    stock:
                      0,

                    lowStockThreshold:
                      variant.lowStockThreshold,

                    active:
                      variant.active,
                  }),
                ),
            },

            categories: {
              create:
                source.categories.map(
                  (
                    category,
                  ) => ({
                    categoryId:
                      category.categoryId,

                    primary:
                      category.primary,
                  }),
                ),
            },
          },

          include:
            adminProductInclude,
        });

      await db.activityLog.create({
        data: {
          actorId:
            admin.id,

          action:
            "PRODUCT_DUPLICATED",

          entityType:
            "Product",

          entityId:
            duplicated.id,

          metadata: {
            sourceId:
              source.id,
          },
        },
      });

      revalidateCatalog(
        duplicated.slug,
      );

      return NextResponse.json(
        {
          product:
            serializeAdminProduct(
              duplicated,
            ),

          message:
            "Product duplicated as draft.",
        },
        {
          status: 201,
        },
      );
    }

    /* =====================================================
       CREATE NEW PRODUCT
       ===================================================== */

    const input =
      productEditorSchema.parse(
        body,
      );

          if (
      input.sizeChartId
    ) {
      const sizeChart =
        await db.sizeChart.findUnique({
          where: {
            id:
              input.sizeChartId,
          },

          select: {
            id:
              true,

            active:
              true,
          },
        });

      if (
        !sizeChart ||
        !sizeChart.active
      ) {
        return NextResponse.json(
          {
            error:
              "The selected size chart is unavailable.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const images =
      normalizeProductImages(
        input.images,
        input.name,
      );

    /*
     * Product, images, category and
     * variants are created using one
     * nested Prisma write.
     *
     * This removes the previous loop
     * of network calls inside the
     * interactive transaction.
     */
    const product =
      await db.$transaction(
        async (
          tx,
        ) => {
          const created =
            await tx.product.create({
              data: {
                name:
                  input.name,               
                   sizeChartId:
                  input.sizeChartId ||
                  null,


                slug:
                  input.slug,

                shortDescription:
                  input.shortDescription ||
                  null,

                description:
                  input.description ||
                  null,

                brand:
                  input.brand ||
                  "Game On Garb",

                regularPrice:
                  input.regularPrice,

                salePrice:
                  input.salePrice,

                status:
                  input.status,

                featured:
                  input.featured,

                newArrival:
                  input.newArrival,

                trending:
                  input.trending,

                seoTitle:
                  input.seoTitle ||
                  null,

                seoDescription:
                  input.seoDescription ||
                  null,

                images: {
                  create:
                    images,
                },

                variants: {
                  create:
                    input.variants.map(
                      (
                        variant,
                      ) => ({
                        sku:
                          variant.sku,

                        size:
                          variant.size ||
                          null,

                        color:
                          variant.color ||
                          null,

                        colorHex:
                          variant.colorHex,

                        priceOverride:
                          variant.priceOverride,

                        stock:
                          variant.stock,

                        lowStockThreshold:
                          variant.lowStockThreshold,

                        active:
                          variant.active,
                      }),
                    ),
                },

                ...(input.categoryId
                  ? {
                      categories: {
                        create: {
                          categoryId:
                            input.categoryId,

                          primary:
                            true,
                        },
                      },
                    }
                  : {}),
              },

              include:
                adminProductInclude,
            });

          /*
           * Inventory history must reflect
           * opening stock, but this can be
           * one createMany instead of one
           * query for every variant.
           */
          const openingStock =
            created.variants
              .filter(
                (
                  variant,
                ) =>
                  variant.stock >
                  0,
              )
              .map(
                (
                  variant,
                ) => ({
                  variantId:
                    variant.id,

                  quantityChange:
                    variant.stock,

                  beforeQuantity:
                    0,

                  afterQuantity:
                    variant.stock,

                  type:
                    "CORRECTION" as const,

                  reference:
                    created.id,

                  reason:
                    "Opening stock from product editor",

                  createdById:
                    admin.id,
                }),
              );

          if (
            openingStock.length >
            0
          ) {
            await tx.inventoryTransaction.createMany({
              data:
                openingStock,
            });
          }

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "PRODUCT_CREATED",

              entityType:
                "Product",

              entityId:
                created.id,

              metadata: {
                variants:
                  created.variants.length,

                images:
                  created.images.length,
              },
            },
          });

          return created;
        },

        PRODUCT_TRANSACTION_OPTIONS,
      );

    revalidateCatalog(
      product.slug,
    );

    return NextResponse.json(
      {
        product:
          serializeAdminProduct(
            product,
          ),

        message:
          "Product created successfully.",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return productError(
      error,
    );
  }
}

/* =========================================================
   REVALIDATION
   ========================================================= */

function revalidateCatalog(
  slug: string,
) {
  revalidatePath(
    "/",
  );

  revalidatePath(
    "/shop",
  );

  revalidatePath(
    "/categories",
  );

  revalidatePath(
    `/product/${slug}`,
  );
}

/* =========================================================
   ERROR RESPONSE
   ========================================================= */

function productError(
  error: unknown,
) {
  console.error(
    "Admin product error:",
    error,
  );

  if (
    error instanceof
    ZodError
  ) {
    const issue =
      error.issues[0];

    return NextResponse.json(
      {
        error:
          issue?.message ??
          "Please check the product fields.",

        issues:
          error.issues,
      },
      {
        status: 400,
      },
    );
  }

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError
  ) {
    if (
      error.code ===
      "P2002"
    ) {
      const target =
        Array.isArray(
          error.meta
            ?.target,
        )
          ? error.meta?.target.join(
              ", ",
            )
          : String(
              error.meta
                ?.target ??
                "",
            );

      if (
        target.includes(
          "slug",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This product slug is already being used.",
          },
          {
            status: 409,
          },
        );
      }

      if (
        target.includes(
          "sku",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "One of the variant SKUs is already being used.",
          },
          {
            status: 409,
          },
        );
      }

      return NextResponse.json(
        {
          error:
            "A product with the same unique value already exists.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      error.code ===
      "P2028"
    ) {
      return NextResponse.json(
        {
          error:
            "The database transaction took too long. Please try again.",
        },
        {
          status: 503,
        },
      );
    }
  }

  return NextResponse.json(
    {
      error:
        error instanceof
        Error
          ? error.message
          : "Unable to save product.",
    },
    {
      status: 400,
    },
  );
}