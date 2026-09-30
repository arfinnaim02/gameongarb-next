import {
  db,
} from "@/lib/db";

import type {
  Product as StoreProduct,
} from "@/lib/data";

type DbProduct =
  Awaited<
    ReturnType<
      typeof db.product.findMany
    >
  >[number];

export function toStoreProduct(
  product:
    DbProduct & {
      images?: {
        url: string;
        alt: string;
        primary: boolean;
        sortOrder: number;
      }[];

      variants?: {
        id: string;
        sku: string;

        size:
          string | null;

        color:
          string | null;

        colorHex?:
          string | null;

        stock: number;
        active: boolean;

        priceOverride?:
          unknown;
      }[];

      categories?: {
        primary: boolean;

        category: {
          name: string;
        };
      }[];

      reviews?: {
        rating: number;
      }[];
    },
): StoreProduct {
  const images = [
    ...(product.images ??
      []),
  ].sort(
    (
      first,
      second,
    ) =>
      first.sortOrder -
      second.sortOrder,
  );

  const variants =
    (
      product.variants ??
      []
    ).filter(
      (
        variant,
      ) =>
        variant.active,
    );

  const primaryCategory =
    product.categories?.find(
      (
        item,
      ) =>
        item.primary,
    )?.category.name ??
    product.categories?.[0]
      ?.category.name ??
    "Lifestyle";

  const basePrice =
    Number(
      product.salePrice ??
        product.regularPrice,
    );

  const storeVariants =
    variants.map(
      (
        variant,
      ) => ({
        id:
          variant.id,

        sku:
          variant.sku,

        size:
          variant.size ??
          "One Size",

        color:
          variant.color ??
          "Default",

        colorHex:
          variant.colorHex ??
          undefined,

        stock:
          variant.stock,

        price:
          Number(
            variant.priceOverride ??
              product.salePrice ??
              product.regularPrice,
          ),
      }),
    );

  /*
   * Prefer prices from purchasable
   * variants. If everything is sold
   * out, continue showing catalog
   * pricing rather than 0.
   */
  const pricedVariants =
    storeVariants.filter(
      (
        variant,
      ) =>
        variant.stock >
        0,
    );

  const priceSource =
    pricedVariants.length >
    0
      ? pricedVariants
      : storeVariants;

  const variantPrices =
    priceSource.map(
      (
        variant,
      ) =>
        variant.price,
    );

  const storefrontPrice =
    variantPrices.length >
    0
      ? Math.min(
          ...variantPrices,
        )
      : basePrice;

  const uniquePrices =
    new Set(
      variantPrices.map(
        (
          price,
        ) =>
          price.toFixed(
            2,
          ),
      ),
    );

  const priceVaries =
    uniquePrices.size >
    1;

  const primaryImage =
    images.find(
      (
        image,
      ) =>
        image.primary,
    ) ??
    images[0];

  return {
    id:
      product.id,

    slug:
      product.slug,

    name:
      product.name,

    category:
      primaryCategory,

    price:
      storefrontPrice,

    oldPrice:
      product.salePrice &&
      !priceVaries
        ? Number(
            product.regularPrice,
          )
        : undefined,

    priceVaries,

    image:
      primaryImage?.url ??
      "/images/products/tshirt.svg",

    images:
      images.map(
        (
          image,
        ) => ({
          url:
            image.url,

          alt:
            image.alt,
        }),
      ),

    alt:
      primaryImage?.alt ??
      product.name,

    colors: [
      ...new Set(
        variants
          .map(
            (
              variant,
            ) =>
              variant.color,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ],

    sizes: [
      ...new Set(
        variants
          .map(
            (
              variant,
            ) =>
              variant.size,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ],

    stock:
      variants.reduce(
        (
          total,
          variant,
        ) =>
          total +
          variant.stock,

        0,
      ),

    variants:
      storeVariants,

    badge:
      product.featured
        ? "FEATURED"
        : product.newArrival
          ? "NEW"
          : undefined,

    reviewCount:
      product.reviews
        ?.length ??
      0,

    rating:
      product.reviews
        ?.length
        ? product.reviews.reduce(
            (
              total,
              review,
            ) =>
              total +
              review.rating,

            0,
          ) /
          product.reviews
            .length
        : undefined,
  };
}

/* =========================================================
   PRODUCTS
   ========================================================= */

export async function getProducts(
  options?: {
    featured?: boolean;
    newArrival?: boolean;
    trending?: boolean;
    take?: number;
  },
) {
  const rows =
    await db.product.findMany({
      where: {
        status:
          "ACTIVE",

        ...(options?.featured
          ? {
              featured:
                true,
            }
          : {}),

        ...(options?.newArrival
          ? {
              newArrival:
                true,
            }
          : {}),

        ...(options?.trending
          ? {
              trending:
                true,
            }
          : {}),
      },

      include: {
        sizeChart:
          true,

        images: {
          orderBy: {
            sortOrder:
              "asc",
          },
        },

        variants: {
          orderBy: {
            sku:
              "asc",
          },
        },

        categories: {
          include: {
            category:
              true,
          },
        },

        reviews: {
          where: {
            approved:
              true,
          },

          select: {
            rating:
              true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take:
        options?.take,
    });

  return rows.map(
    toStoreProduct,
  );
}

/* =========================================================
   PRODUCT
   ========================================================= */

export async function getProduct(
  slug: string,
) {
  const row =
    await db.product.findUnique({
      where: {
        slug,
      },

      include: {
        sizeChart:
          true,

        images: {
          orderBy: {
            sortOrder:
              "asc",
          },
        },

        variants: {
          orderBy: {
            sku:
              "asc",
          },
        },

        categories: {
          include: {
            category:
              true,
          },
        },

        reviews: {
          where: {
            approved:
              true,
          },

          select: {
            rating:
              true,
          },
        },
      },
    });

  return row?.status ===
    "ACTIVE"
    ? {
        raw:
          row,

        product:
          toStoreProduct(
            row,
          ),
      }
    : null;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

export async function getNavigationCategories() {
  return db.category.findMany({
    where: {
      active:
        true,

      showInNavigation:
        true,
    },

    orderBy: {
      sortOrder:
        "asc",
    },

    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

/* =========================================================
   CATEGORY TREE
   ========================================================= */

export async function getCategoryTree(
  options?: {
    homepageOnly?:
      boolean;
  },
) {
  return db.category.findMany({
    where: {
      active:
        true,

      parentId:
        null,

      ...(options?.homepageOnly
        ? {
            showOnHomepage:
              true,
          }
        : {}),
    },

    orderBy: {
      sortOrder:
        "asc",
    },

    include: {
      children: {
        where: {
          active:
            true,
        },

        orderBy: {
          sortOrder:
            "asc",
        },

        include: {
          children: {
            where: {
              active:
                true,
            },

            orderBy: {
              sortOrder:
                "asc",
            },
          },
        },
      },
    },
  });
}