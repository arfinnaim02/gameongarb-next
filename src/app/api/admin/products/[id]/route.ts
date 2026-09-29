import {
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

import {
  cloudinary,
} from "@/lib/cloudinary";

import {
  db,
} from "@/lib/db";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  adminProductInclude,
  normalizeProductImages,
  productEditorSchema,
  serializeAdminProduct,
} from "@/lib/admin-products";

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id: string;
      }>;
  },
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
    const {
      id,
    } =
      await params;

    const input =
      productEditorSchema.parse(
        await request.json(),
      );

    const existing =
      await db.product.findUniqueOrThrow({
        where: {
          id,
        },

        include: {
          images:
            true,

          variants: {
            include: {
              _count: {
                select: {
                  inventoryTransactions:
                    true,

                  orderItems:
                    true,

                  cartItems:
                    true,

                  returnItems:
                    true,
                },
              },
            },
          },
        },
      });

    const existingVariantIds =
      new Set(
        existing.variants.map(
          (
            variant,
          ) =>
            variant.id,
        ),
      );

    for (
      const variant
      of input.variants
    ) {
      if (
        variant.id &&
        !existingVariantIds.has(
          variant.id,
        )
      ) {
        throw new Error(
          "A submitted variant does not belong to this product.",
        );
      }
    }

    const normalizedImages =
      normalizeProductImages(
        input.images,
        input.name,
      );

    const retainedPublicIds =
      new Set(
        normalizedImages
          .map(
            (
              image,
            ) =>
              image.publicId,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      );

    const removedPublicIds =
      existing.images
        .map(
          (
            image,
          ) =>
            image.publicId,
        )
        .filter(
          (
            value,
          ): value is string =>
            typeof value ===
              "string" &&
            value.length >
              0 &&
            !retainedPublicIds.has(
              value,
            ),
        );

    const oldSlug =
      existing.slug;

    const product =
      await db.$transaction(
        async (
          tx,
        ) => {
          await tx.product.update({
            where: {
              id,
            },

            data: {
              name:
                input.name,

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
            },
          });

          /* ===============================================
             CATEGORY
             =============================================== */

          await tx.productCategory.deleteMany({
            where: {
              productId:
                id,
            },
          });

          if (
            input.categoryId
          ) {
            await tx.productCategory.create({
              data: {
                productId:
                  id,

                categoryId:
                  input.categoryId,

                primary:
                  true,
              },
            });
          }

          /* ===============================================
             IMAGES
             =============================================== */

          await tx.productImage.deleteMany({
            where: {
              productId:
                id,
            },
          });

          await tx.productImage.createMany({
            data:
              normalizedImages.map(
                (
                  image,
                ) => ({
                  productId:
                    id,

                  ...image,
                }),
              ),
          });

          /* ===============================================
             PREPARE SKU CHANGES
             =============================================== */

          for (
            const current
            of existing.variants
          ) {
            const incoming =
              input.variants.find(
                (
                  variant,
                ) =>
                  variant.id ===
                  current.id,
              );

            if (
              incoming &&
              incoming.sku !==
                current.sku
            ) {
              await tx.productVariant.update({
                where: {
                  id:
                    current.id,
                },

                data: {
                  sku:
                    `__TEMP__${current.id}__${Date.now()}`,
                },
              });
            }
          }

          /* ===============================================
             EXISTING VARIANTS
             =============================================== */

          for (
            const current
            of existing.variants
          ) {
            const incoming =
              input.variants.find(
                (
                  variant,
                ) =>
                  variant.id ===
                  current.id,
              );

            if (
              !incoming
            ) {
              const hasDependencies =
                current._count
                  .inventoryTransactions >
                  0 ||
                current._count
                  .orderItems >
                  0 ||
                current._count
                  .cartItems >
                  0 ||
                current._count
                  .returnItems >
                  0;

              if (
                hasDependencies
              ) {
                await tx.productVariant.update({
                  where: {
                    id:
                      current.id,
                  },

                  data: {
                    active:
                      false,
                  },
                });
              } else {
                await tx.productVariant.delete({
                  where: {
                    id:
                      current.id,
                  },
                });
              }

              continue;
            }

            if (
              incoming.stock !==
              current.stock
            ) {
              await tx.inventoryTransaction.create({
                data: {
                  variantId:
                    current.id,

                  quantityChange:
                    incoming.stock -
                    current.stock,

                  beforeQuantity:
                    current.stock,

                  afterQuantity:
                    incoming.stock,

                  type:
                    "MANUAL_ADJUSTMENT",

                  reference:
                    id,

                  reason:
                    "Stock changed from product editor",

                  createdById:
                    admin.id,
                },
              });
            }

            await tx.productVariant.update({
              where: {
                id:
                  current.id,
              },

              data: {
                sku:
                  incoming.sku,

                size:
                  incoming.size ||
                  null,

                color:
                  incoming.color ||
                  null,

                colorHex:
                  incoming.colorHex,

                priceOverride:
                  incoming.priceOverride,

                stock:
                  incoming.stock,

                lowStockThreshold:
                  incoming.lowStockThreshold,

                active:
                  incoming.active,
              },
            });
          }

          /* ===============================================
             NEW VARIANTS
             =============================================== */

          const newVariants =
            input.variants.filter(
              (
                variant,
              ) =>
                !variant.id,
            );

          for (
            const variant
            of newVariants
          ) {
            const createdVariant =
              await tx.productVariant.create({
                data: {
                  productId:
                    id,

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
                },
              });

            if (
              variant.stock >
              0
            ) {
              await tx.inventoryTransaction.create({
                data: {
                  variantId:
                    createdVariant.id,

                  quantityChange:
                    variant.stock,

                  beforeQuantity:
                    0,

                  afterQuantity:
                    variant.stock,

                  type:
                    "CORRECTION",

                  reference:
                    id,

                  reason:
                    "Opening stock for new variant",

                  createdById:
                    admin.id,
                },
              });
            }
          }

          return tx.product.findUniqueOrThrow({
            where: {
              id,
            },

            include:
              adminProductInclude,
          });
        },

        {
          maxWait:
            10_000,

          timeout:
            30_000,
        },
      );
    /*
     * Database commit succeeds first.
     * Cloudinary cleanup is best-effort.
     */
    await Promise.allSettled(
      removedPublicIds.map(
        (
          publicId,
        ) =>
          cloudinary.uploader.destroy(
            publicId,
            {
              invalidate:
                true,
            },
          ),
      ),
    );

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "PRODUCT_UPDATED",

        entityType:
          "Product",

        entityId:
          id,

        metadata: {
          variants:
            product.variants.length,

          images:
            product.images.length,
        },
      },
    });

    revalidateProduct(
      oldSlug,
    );

    revalidateProduct(
      product.slug,
    );

    return NextResponse.json({
      product:
        serializeAdminProduct(
          product,
        ),

      message:
        "Product updated successfully.",
    });
  } catch (error) {
    return productError(
      error,
    );
  }
}

/* =========================================================
   DELETE / ARCHIVE
   ========================================================= */

export async function DELETE(
  _request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id: string;
      }>;
  },
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
    const {
      id,
    } =
      await params;

    const product =
      await db.product.findUniqueOrThrow({
        where: {
          id,
        },

        include: {
          images:
            true,

          variants: {
            include: {
              _count: {
                select: {
                  inventoryTransactions:
                    true,
                },
              },
            },
          },

          _count: {
            select: {
              orderItems:
                true,
            },
          },
        },
      });

    const hasHistory =
      product._count
        .orderItems >
        0 ||
      product.variants.some(
        (
          variant,
        ) =>
          variant._count
            .inventoryTransactions >
          0,
      );

    if (
      hasHistory
    ) {
      const archived =
        await db.product.update({
          where: {
            id,
          },

          data: {
            status:
              "ARCHIVED",
          },

          include:
            adminProductInclude,
        });

      await db.activityLog.create({
        data: {
          actorId:
            admin.id,

          action:
            "PRODUCT_ARCHIVED",

          entityType:
            "Product",

          entityId:
            id,
        },
      });

      revalidateProduct(
        product.slug,
      );

      return NextResponse.json({
        mode:
          "archived",

        product:
          serializeAdminProduct(
            archived,
          ),

        message:
          "Product archived because it has inventory or order history.",
      });
    }

    await db.product.delete({
      where: {
        id,
      },
    });

    await Promise.allSettled(
      product.images
        .map(
          (
            image,
          ) =>
            image.publicId,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(
              value,
            ),
        )
        .map(
          (
            publicId,
          ) =>
            cloudinary.uploader.destroy(
              publicId,
              {
                invalidate:
                  true,
              },
            ),
        ),
    );

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "PRODUCT_DELETED",

        entityType:
          "Product",

        entityId:
          id,
      },
    });

    revalidateProduct(
      product.slug,
    );

    return NextResponse.json({
      mode:
        "deleted",

      message:
        "Product deleted.",
    });
  } catch (error) {
    return productError(
      error,
    );
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function revalidateProduct(
  slug:
    string,
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

function productError(
  error:
    unknown,
) {
  console.error(
    "Admin product mutation error:",
    error,
  );

  return NextResponse.json(
    {
      error:
        error instanceof
        Error
          ? error.message
          : "Unable to update product.",
    },
    {
      status: 400,
    },
  );
}