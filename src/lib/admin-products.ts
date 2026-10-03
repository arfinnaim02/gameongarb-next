import {
  Prisma,
} from "@prisma/client";

import {
  z,
} from "zod";

import type {
  AdminProductRecord,
} from "@/lib/admin-product-types";

/* =========================================================
   PRISMA INCLUDE
   ========================================================= */

export const adminProductInclude =
  Prisma.validator<Prisma.ProductInclude>()({
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

    sizeChart: {
      select: {
        id:
          true,

        name:
          true,

        active:
          true,
      },
    },
  });

export type AdminProductDatabaseRecord =
  Prisma.ProductGetPayload<{
    include:
      typeof adminProductInclude;
  }>;

/* =========================================================
   NORMALIZERS
   ========================================================= */

const nullablePositiveMoney =
  z.preprocess(
    (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return null;
      }

      if (
        typeof value ===
        "string"
      ) {
        return Number(
          value,
        );
      }

      return value;
    },

    z
      .number()
      .positive()
      .nullable(),
  );

const nullableHex =
  z.preprocess(
    (value) => {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return value;
    },

    z
      .string()
      .regex(
        /^#[0-9a-fA-F]{6}$/,
        "Color HEX must use #RRGGBB format.",
      )
      .nullable(),
  );

/* =========================================================
   EDITOR SCHEMA
   ========================================================= */

export const productEditorSchema =
  z
    .object({
      name:
        z
          .string()
          .trim()
          .min(2)
          .max(160),

      slug:
        z
          .string()
          .trim()
          .min(2)
          .max(180)
          .regex(
            /^[a-z0-9-]+$/,
            "Slug may contain lowercase letters, numbers and hyphens only.",
          ),

      shortDescription:
        z
          .string()
          .trim()
          .max(500)
          .default(""),

      description:
        z
          .string()
          .trim()
          .max(10000)
          .default(""),

      brand:
        z
          .string()
          .trim()
          .max(120)
          .default(
            "Game On Garb",
          ),

      regularPrice:
        z
          .coerce
          .number()
          .positive(),

      salePrice:
        nullablePositiveMoney,

      status:
        z.enum([
          "DRAFT",
          "ACTIVE",
          "INACTIVE",
          "ARCHIVED",
        ]),

      featured:
        z.boolean(),

      newArrival:
        z.boolean(),

      trending:
        z.boolean(),

      categoryId:
        z
          .string()
          .trim()
          .default(""),

      sizeChartId:
        z
          .string()
          .trim()
          .default(""),

      seoTitle:
        z
          .string()
          .trim()
          .max(200)
          .default(""),

      seoDescription:
        z
          .string()
          .trim()
          .max(500)
          .default(""),

      images:
        z
          .array(
            z.object({
              id:
                z
                  .string()
                  .nullable()
                  .optional(),

              url:
                z
                  .string()
                  .min(1),

              publicId:
                z
                  .string()
                  .nullable()
                  .optional(),

              alt:
                z
                  .string()
                  .max(250)
                  .default(
                    "",
                  ),

              sortOrder:
                z
                  .number()
                  .int()
                  .min(0),

              primary:
                z.boolean(),
            }),
          )
          .max(12),

      variants:
        z
          .array(
            z.object({
              id:
                z
                  .string()
                  .nullable()
                  .optional(),

              sku:
                z
                  .string()
                  .trim()
                  .min(2)
                  .max(120),

              size:
                z
                  .string()
                  .trim()
                  .max(80)
                  .default(
                    "",
                  ),

              color:
                z
                  .string()
                  .trim()
                  .max(120)
                  .default(
                    "",
                  ),

              colorHex:
                nullableHex,

              priceOverride:
                nullablePositiveMoney,

              stock:
                z
                  .coerce
                  .number()
                  .int()
                  .min(0),

              lowStockThreshold:
                z
                  .coerce
                  .number()
                  .int()
                  .min(0),

              active:
                z.boolean(),
            }),
          )
          .min(
            1,
            "At least one product variant is required.",
          )
          .max(100),
    })
    .superRefine(
      (
        data,
        context,
      ) => {
        if (
          data.salePrice !==
            null &&
          data.salePrice >=
            data.regularPrice
        ) {
          context.addIssue({
            code:
              "custom",

            path: [
              "salePrice",
            ],

            message:
              "Sale price must be lower than the regular price.",
          });
        }

        const skuSet =
          new Set<string>();

        const combinationSet =
          new Set<string>();

        data.variants.forEach(
          (
            variant,
            index,
          ) => {
            const sku =
              variant.sku
                .trim()
                .toLowerCase();

            if (
              skuSet.has(
                sku,
              )
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "variants",
                  index,
                  "sku",
                ],

                message:
                  "Variant SKUs must be unique.",
              });
            }

            skuSet.add(
              sku,
            );

            const combination =
              `${variant.color.trim().toLowerCase()}::${variant.size
                .trim()
                .toLowerCase()}`;

            if (
              combinationSet.has(
                combination,
              )
            ) {
              context.addIssue({
                code:
                  "custom",

                path: [
                  "variants",
                  index,
                ],

                message:
                  "Duplicate size/color combinations are not allowed.",
              });
            }

            combinationSet.add(
              combination,
            );
          },
        );
      },
    );

export type ProductEditorInput =
  z.infer<
    typeof productEditorSchema
  >;

/* =========================================================
   IMAGE NORMALIZATION
   ========================================================= */

export function normalizeProductImages(
  images:
    ProductEditorInput["images"],

  productName:
    string,
) {
  if (
    images.length ===
    0
  ) {
    return [
      {
        url:
          "/images/products/tshirt.svg",

        publicId:
          null,

        alt:
          productName,

        sortOrder:
          0,

        primary:
          true,
      },
    ];
  }

  const primaryIndex =
    images.findIndex(
      (image) =>
        image.primary,
    );

  const finalPrimary =
    primaryIndex >= 0
      ? primaryIndex
      : 0;

  return images.map(
    (
      image,
      index,
    ) => ({
      url:
        image.url,

      publicId:
        image.publicId ??
        null,

      alt:
        image.alt.trim() ||
        productName,

      sortOrder:
        index,

      primary:
        index ===
        finalPrimary,
    }),
  );
}

/* =========================================================
   SERIALIZER
   ========================================================= */

export function serializeAdminProduct(
  product:
    AdminProductDatabaseRecord,
): AdminProductRecord {
  const primaryCategory =
    product.categories.find(
      (item) =>
        item.primary,
    ) ??
    product.categories[0];

  const activeVariants =
    product.variants.filter(
      (variant) =>
        variant.active,
    );

  const stock =
    activeVariants.reduce(
      (
        total,
        variant,
      ) =>
        total +
        variant.stock,

      0,
    );

  const lowStock =
    activeVariants.some(
      (variant) =>
        variant.stock >
          0 &&
        variant.stock <=
          variant.lowStockThreshold,
    );

  const outOfStock =
    activeVariants.length ===
      0 ||
    activeVariants.every(
      (variant) =>
        variant.stock <=
        0,
    );

  const primaryImage =
    product.images.find(
      (image) =>
        image.primary,
    ) ??
    product.images[0];

  return {
    id:
      product.id,

    name:
      product.name,

    slug:
      product.slug,

    shortDescription:
      product.shortDescription ??
      "",

    description:
      product.description ??
      "",

    brand:
      product.brand ??
      "Game On Garb",

    regularPrice:
      Number(
        product.regularPrice,
      ),

    salePrice:
      product.salePrice
        ? Number(
            product.salePrice,
          )
        : null,

    status:
      product.status,

    featured:
      product.featured,

    newArrival:
      product.newArrival,

    trending:
      product.trending,

    seoTitle:
      product.seoTitle ??
      "",

    seoDescription:
      product.seoDescription ??
      "",

    categoryId:
      primaryCategory
        ?.categoryId ??
      "",

    category:
      primaryCategory
        ?.category
        .name ??
      "Uncategorized",

    sizeChartId:
      product.sizeChartId ??
      "",

    sizeChartName:
      product.sizeChart
        ?.name ??
      "",

    image:
      primaryImage?.url ??
      "/images/products/tshirt.svg",

    images:
      product.images.map(
        (image) => ({
          id:
            image.id,

          url:
            image.url,

          publicId:
            image.publicId,

          alt:
            image.alt,

          sortOrder:
            image.sortOrder,

          primary:
            image.primary,
        }),
      ),

    variants:
      product.variants.map(
        (variant) => ({
          id:
            variant.id,

          sku:
            variant.sku,

          size:
            variant.size ??
            "",

          color:
            variant.color ??
            "",

          colorHex:
            variant.colorHex ??
            "",

          priceOverride:
            variant.priceOverride
              ? Number(
                  variant.priceOverride,
                )
              : null,

          stock:
            variant.stock,

          lowStockThreshold:
            variant.lowStockThreshold,

          active:
            variant.active,
        }),
      ),

    stock,

    activeVariantCount:
      activeVariants.length,

    lowStock,

    outOfStock,

    createdAt:
      product.createdAt.toISOString(),

    updatedAt:
      product.updatedAt.toISOString(),
  };
}