import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getApiAdmin } from "@/lib/session";
import {
  canTransition,
  categoryMoveIsValid,
  hasPermission,
  stockAfterAdjustment,
} from "@/lib/business";

const permissionsByResource: Record<string, string> = {
  products: "products",
  categories: "products",
  orders: "orders",
  customers: "customers",
  coupons: "coupons",
  inventory: "inventory",
  homepage: "homepage",
  settings: "settings",
  integrations: "integrations",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = (await params).resource;
  const auth = await authorize(request, resource);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    if (resource === "products") {
      if (typeof body.duplicateId === "string") {
        const source = await db.product.findUniqueOrThrow({
          where: { id: body.duplicateId },
          include: { images: true, variants: true, categories: true },
        });
        const stamp = Date.now().toString().slice(-8);
        const product = await db.product.create({
          data: {
            name: `${source.name} Copy`,
            slug: `${source.slug}-copy-${stamp}`,
            shortDescription: source.shortDescription,
            description: source.description,
            brand: source.brand,
            regularPrice: source.regularPrice,
            salePrice: source.salePrice,
            status: "DRAFT",
            featured: false,
            newArrival: false,
            trending: false,
            seoTitle: source.seoTitle,
            seoDescription: source.seoDescription,
            images: {
              create: source.images.map((image) => ({
                url: image.url,
                alt: image.alt,
                sortOrder: image.sortOrder,
                primary: image.primary,
              })),
            },
            variants: {
              create: source.variants.map((variant, index) => ({
                sku: `${variant.sku}-COPY-${stamp}-${index + 1}`,
                size: variant.size,
                color: variant.color,
                attributes: variant.attributes ?? undefined,
                priceOverride: variant.priceOverride,
                stock: 0,
                lowStockThreshold: variant.lowStockThreshold,
                active: variant.active,
              })),
            },
            categories: {
              create: source.categories.map((category) => ({
                categoryId: category.categoryId,
                primary: category.primary,
              })),
            },
          },
        });
        await audit(auth.id, "PRODUCT_DUPLICATED", "Product", product.id, {
          sourceId: source.id,
        });
        return ok("Product duplicated as a draft");
      }
      const input = z
        .object({
          name: z.string().min(2),
          slug: z
            .string()
            .min(2)
            .regex(/^[a-z0-9-]+$/),
          regularPrice: z.coerce.number().positive(),
          salePrice: optionalNumber,
          shortDescription: z.string().optional(),
          description: z.string().optional(),
          categoryId: z.string().optional(),
          sku: z.string().min(2),
          stock: z.coerce.number().int().min(0),
          size: z.string().optional(),
          color: z.string().optional(),
          image: z.string().optional(),
          status: z
            .enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"])
            .default("ACTIVE"),
          featured: z.union([z.boolean(), z.string()]).optional(),
          newArrival: z.union([z.boolean(), z.string()]).optional(),
          trending: z.union([z.boolean(), z.string()]).optional(),
          variantSku: z.string().optional(),
          variantStock: z.coerce.number().int().min(0).optional(),
          variantSize: z.string().optional(),
          variantColor: z.string().optional(),
          newImage: z.string().optional(),
        })
        .parse(body);
      const product = await db.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          shortDescription: input.shortDescription || null,
          description: input.description || null,
          regularPrice: input.regularPrice,
          salePrice: input.salePrice,
          status: input.status,
          featured: input.featured === true || input.featured === "true",
          newArrival: input.newArrival === true || input.newArrival === "true",
          trending: input.trending === true || input.trending === "true",
          images: {
            create: {
              url: input.image || "/images/products/tshirt.svg",
              alt: input.name,
              primary: true,
            },
          },
          variants: {
            create: {
              sku: input.sku,
              stock: input.stock,
              size: input.size || null,
              color: input.color || null,
              lowStockThreshold: 5,
            },
          },
          categories: input.categoryId
            ? { create: { categoryId: input.categoryId, primary: true } }
            : undefined,
        },
      });
      await audit(auth.id, "PRODUCT_CREATED", "Product", product.id, {
        name: product.name,
      });
      revalidateStore();
      return ok("Product created");
    }
    if (resource === "categories") {
      const input = z
        .object({
          name: z.string().min(2),
          slug: z
            .string()
            .min(2)
            .regex(/^[a-z0-9-]+$/),
          parentId: z.string().optional(),
          description:
            z
              .string()
              .optional(),

          image:
            z
              .union([
                z
                  .string()
                  .url(),

                z.null(),
              ])
              .optional(),

          sortOrder:
            z
              .coerce
              .number()
              .int()
              .min(0)
              .default(0),

          showInNavigation:
            z
              .union([
                z.boolean(),
                z.string(),
              ])
              .optional(),

          showOnHomepage:
            z
              .union([
                z.boolean(),
                z.string(),
              ])
              .optional(),

          active:
            z
              .union([
                z.boolean(),
                z.string(),
              ])
              .optional(),
        })
        .parse(body);
      if (input.parentId) await assertCategoryDepth(input.parentId);
      const category = await db.category.create({
        data: {
          name: input.name,
          slug: input.slug,
          parentId: input.parentId || null,
          description:
            input.description ||
            null,

          image:
            input.image ||
            null,

          sortOrder:
            input.sortOrder,

          showInNavigation:
            input.showInNavigation === true ||
            input.showInNavigation === "true",
          showOnHomepage:
            input.showOnHomepage ===
              true ||
            input.showOnHomepage ===
              "true",

          active:
            input.active ===
              undefined
              ? true
              : input.active ===
                    true ||
                  input.active ===
                    "true",
        },
      });
      await audit(auth.id, "CATEGORY_CREATED", "Category", category.id, {
        name: category.name,
      });
      revalidateStore();
      return ok("Category created");
    }
    if (resource === "coupons") {
      const input = z
        .object({
          title: z.string().min(2),
          kind: z.enum(["CODE", "AUTOMATIC"]).default("CODE"),
          code: z.string().optional(),
          type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
          value: z.coerce.number().min(0),
          minimumOrder: optionalNumber,
          maximumDiscount: optionalNumber,
          usageLimit: optionalPositiveInt,
          perCustomerLimit: optionalPositiveInt,
          validUntil: z.string().optional(),
          productIds: z.string().optional(),
          categoryIds: z.string().optional(),
        })
        .parse(body);
      if (input.kind === "CODE" && (!input.code || input.code.length < 2))
        throw new Error("Discount codes require a code.");
      const coupon = await db.coupon.create({
        data: {
          title: input.title,
          kind: input.kind,
          code: input.kind === "CODE" ? input.code!.toUpperCase() : null,
          type: input.type,
          value: input.value,
          minimumOrder: input.minimumOrder,
          maximumDiscount: input.maximumDiscount,
          usageLimit: input.usageLimit,
          perCustomerLimit: input.perCustomerLimit,
          validFrom: new Date(),
          validUntil: input.validUntil
            ? new Date(`${input.validUntil}T23:59:59Z`)
            : null,
          active: true,
          products: input.productIds
            ? {
                create: input.productIds
                  .split(",")
                  .map((productId) => productId.trim())
                  .filter(Boolean)
                  .map((productId) => ({ productId })),
              }
            : undefined,
          categories: input.categoryIds
            ? {
                create: input.categoryIds
                  .split(",")
                  .map((categoryId) => categoryId.trim())
                  .filter(Boolean)
                  .map((categoryId) => ({ categoryId })),
              }
            : undefined,
        },
      });
      await audit(auth.id, "COUPON_CREATED", "Coupon", coupon.id, {
        code: coupon.code,
      });
      return ok("Coupon created");
    }
    if (resource === "inventory") {
      const input = z
        .object({
          variantId: z.string(),
          quantityChange: z.coerce
            .number()
            .int()
            .refine((v) => v !== 0),
          reason: z.string().min(3),
        })
        .parse(body);
      await db.$transaction(async (tx) => {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: input.variantId },
        });
        const after = stockAfterAdjustment(variant.stock, input.quantityChange);
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: after },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: variant.id,
            quantityChange: input.quantityChange,
            beforeQuantity: variant.stock,
            afterQuantity: after,
            type: "MANUAL_ADJUSTMENT",
            reason: input.reason,
            createdById: auth.id,
          },
        });
      });
      await audit(
        auth.id,
        "INVENTORY_ADJUSTED",
        "ProductVariant",
        input.variantId,
        { change: input.quantityChange, reason: input.reason },
      );
      revalidateStore();
      return ok("Stock adjusted");
    }
    if (resource === "integrations") {
      const input = z
        .object({
          service: z.enum(["SMS", "BKASH", "COURIER"]),
          provider: z.string().min(2),
          mode: z.enum(["mock", "sandbox", "production"]),
        })
        .parse(body);
      const integration = await db.integration.upsert({
        where: {
          service_provider: {
            service: input.service,
            provider: input.provider,
          },
        },
        update: { mode: input.mode },
        create: {
          service: input.service,
          provider: input.provider,
          mode: input.mode,
          enabled: false,
          config: {},
        },
      });
      await audit(
        auth.id,
        "INTEGRATION_CREATED",
        "Integration",
        integration.id,
        { service: input.service, provider: input.provider },
      );
      return ok("Integration saved");
    }
    if (resource === "homepage") {
      const input = z
        .object({
          sectionId: z.string(),
          title: z.string().min(2),
          subtitle: z.string().optional(),
          image: z.string().min(1),
          ctaLabel: z.string().optional(),
          ctaLink: z.string().optional(),
        })
        .parse(body);
      const last = await db.heroSlide.aggregate({
        where: { sectionId: input.sectionId },
        _max: { sortOrder: true },
      });
      const slide = await db.heroSlide.create({
        data: {
          sectionId: input.sectionId,
          title: input.title,
          subtitle: input.subtitle || null,
          image: input.image,
          ctaLabel: input.ctaLabel || null,
          ctaLink: input.ctaLink || null,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
      await audit(auth.id, "HERO_SLIDE_CREATED", "HeroSlide", slide.id, {
        sectionId: input.sectionId,
      });
      revalidatePath("/");
      return ok("Hero slide created");
    }
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = (await params).resource;
  const auth = await authorize(request, resource);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const id = z.string().parse(body.id);
    if (resource === "homepage" && typeof body.slideId === "string") {
      const input = z
        .object({
          slideId: z.string(),
          title: z.string().min(2).optional(),
          subtitle: z.string().optional(),
          image: z.string().min(1).optional(),
          ctaLabel: z.string().optional(),
          ctaLink: z.string().optional(),
          enabled: z.boolean().optional(),
        })
        .parse(body);
      await db.heroSlide.update({
        where: { id: input.slideId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.subtitle !== undefined && {
            subtitle: input.subtitle || null,
          }),
          ...(input.image !== undefined && { image: input.image }),
          ...(input.ctaLabel !== undefined && {
            ctaLabel: input.ctaLabel || null,
          }),
          ...(input.ctaLink !== undefined && {
            ctaLink: input.ctaLink || null,
          }),
          ...(input.enabled !== undefined && { enabled: input.enabled }),
        },
      });
      await audit(auth.id, "HERO_SLIDE_CHANGED", "HeroSlide", input.slideId, {
        fields: Object.keys(body).filter(
          (key) => key !== "id" && key !== "slideId",
        ),
      });
      revalidatePath("/");
      return ok("Hero slide updated");
    }
    if (resource === "products") {
      const input = z
        .object({
          id: z.string(),
          name: z.string().min(2).optional(),
          slug: z
            .string()
            .min(2)
            .regex(/^[a-z0-9-]+$/)
            .optional(),
          shortDescription: z.string().optional(),
          description: z.string().optional(),
          regularPrice: z.coerce.number().positive().optional(),
          salePrice: optionalNumber.optional(),
          categoryId: z.string().optional(),
          status: z
            .enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"])
            .optional(),
          featured: z.union([z.boolean(), z.string()]).optional(),
          newArrival: z.union([z.boolean(), z.string()]).optional(),
          trending: z.union([z.boolean(), z.string()]).optional(),
          variantSku: z.string().optional(),
          variantStock: z.coerce.number().int().min(0).optional(),
          variantSize: z.string().optional(),
          variantColor: z.string().optional(),
          newImage: z.string().optional(),
        })
        .parse(body);
      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.shortDescription !== undefined && {
              shortDescription: input.shortDescription || null,
            }),
            ...(input.description !== undefined && {
              description: input.description || null,
            }),
            ...(input.regularPrice !== undefined && {
              regularPrice: input.regularPrice,
            }),
            ...(input.salePrice !== undefined && {
              salePrice: input.salePrice,
            }),
            ...(input.status !== undefined && { status: input.status }),
            ...(Object.hasOwn(body, "featured") && {
              featured: input.featured === true || input.featured === "true",
            }),
            ...(Object.hasOwn(body, "newArrival") && {
              newArrival:
                input.newArrival === true || input.newArrival === "true",
            }),
            ...(Object.hasOwn(body, "trending") && {
              trending: input.trending === true || input.trending === "true",
            }),
          },
        });
        if (Object.hasOwn(body, "categoryId")) {
          await tx.productCategory.deleteMany({ where: { productId: id } });
          if (input.categoryId)
            await tx.productCategory.create({
              data: {
                productId: id,
                categoryId: input.categoryId,
                primary: true,
              },
            });
        }
        if (input.variantSku)
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: input.variantSku,
              stock: input.variantStock ?? 0,
              size: input.variantSize || null,
              color: input.variantColor || null,
              lowStockThreshold: 5,
            },
          });
        if (input.newImage) {
          const imageCount = await tx.productImage.count({
            where: { productId: id },
          });
          await tx.productImage.create({
            data: {
              productId: id,
              url: input.newImage,
              alt: input.name ?? "Product image",
              sortOrder: imageCount,
              primary: imageCount === 0,
            },
          });
        }
      });
      await audit(auth.id, "PRODUCT_UPDATED", "Product", id, {
        fields: Object.keys(body).filter((key) => key !== "id"),
      });
      revalidateStore();
      return ok("Product updated");
    }
    if (resource === "categories") {
      const input = z
        .object({
          id: z.string(),
          name: z.string().min(2).optional(),
          slug: z
            .string()
            .min(2)
            .regex(/^[a-z0-9-]+$/)
            .optional(),
          description:
            z
              .string()
              .optional(),

          image:
            z
              .union([
                z
                  .string()
                  .url(),

                z.null(),
              ])
              .optional(),

          sortOrder:
            z
              .coerce
              .number()
              .int()
              .min(0)
              .optional(),

          parentId:
            z
              .string()
              .optional(),

          active:
            z
              .boolean()
              .optional(),
          showInNavigation: z.union([z.boolean(), z.string()]).optional(),
          showOnHomepage: z.union([z.boolean(), z.string()]).optional(),
        })
        .parse(body);
      if (input.parentId) {
        if (input.parentId === id)
          throw new Error("A category cannot be its own parent.");
        await assertCategoryDepth(input.parentId);
        await assertNotDescendant(id, input.parentId);
      }
      await db.category.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.slug !== undefined && { slug: input.slug }),
          ...(input.description !==
            undefined && {
            description:
              input.description ||
              null,
          }),

          ...(Object.hasOwn(
            body,
            "image",
          ) && {
            image:
              input.image ||
              null,
          }),

          ...(input.sortOrder !==
            undefined && {
            sortOrder:
              input.sortOrder,
          }),

          ...(Object.hasOwn(
            body,
            "parentId",
          ) && {
            parentId: input.parentId || null,
          }),
          ...(input.active !== undefined && { active: input.active }),
          ...(Object.hasOwn(body, "showInNavigation") && {
            showInNavigation:
              input.showInNavigation === true ||
              input.showInNavigation === "true",
          }),
          ...(Object.hasOwn(body, "showOnHomepage") && {
            showOnHomepage:
              input.showOnHomepage === true || input.showOnHomepage === "true",
          }),
        },
      });
      await audit(auth.id, "CATEGORY_UPDATED", "Category", id, {
        fields: Object.keys(body).filter((key) => key !== "id"),
      });
      revalidateStore();
      return ok("Category updated");
    }
    if (resource === "customers") {
      const input = z
        .object({
          id:
            z.string(),

          status:
            z
              .enum([
                "ACTIVE",
                "BLOCKED",
                "PENDING",
              ])
              .optional(),

          notes:
            z
              .string()
              .max(
                2000,
              )
              .optional(),
        })
        .parse(
          body,
        );

      await db.$transaction(
        async (
          tx,
        ) => {
          const customer =
            await tx.customer.update({
              where: {
                id:
                  input.id,
              },

              data: {
                ...(input.status !==
                  undefined && {
                  status:
                    input.status,
                }),

                ...(input.notes !==
                  undefined && {
                  notes:
                    input.notes.trim() ||
                    null,
                }),
              },

              select: {
                userId:
                  true,
              },
            });

          if (
            customer.userId &&
            input.status !==
              undefined
          ) {
            await tx.user.update({
              where: {
                id:
                  customer.userId,
              },

              data: {
                status:
                  input.status,
              },
            });
          }
        },
      );

      await audit(
        auth.id,
        "CUSTOMER_UPDATED",
        "Customer",
        input.id,
        {
          fields:
            Object.keys(
              body,
            ).filter(
              (
                key,
              ) =>
                key !==
                "id",
            ),
        },
      );

      return ok(
        "Customer updated",
      );
    }
    if (resource === "coupons") {
      const input = z
        .object({
          id: z.string(),
          active: z.boolean().optional(),
          kind: z.enum(["CODE", "AUTOMATIC"]).optional(),
          title: z.string().min(2).optional(),
          code: z.union([z.string().min(2), z.literal("")]).optional(),
          type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).optional(),
          value: z.coerce.number().min(0).optional(),
          minimumOrder: optionalNumber.optional(),
          maximumDiscount: optionalNumber.optional(),
          usageLimit: optionalPositiveInt.optional(),
          perCustomerLimit: optionalPositiveInt.optional(),
          validUntil: z.string().optional(),
          productIds: z.string().optional(),
          categoryIds: z.string().optional(),
        })
        .parse(body);
      if (input.kind === "CODE" && !input.code)
        throw new Error("Discount codes require a code.");
      await db.coupon.update({
        where: { id },
        data: {
          ...(input.active !== undefined && { active: input.active }),
          ...(input.kind !== undefined && {
            kind: input.kind,
            ...(input.kind === "AUTOMATIC" ? { code: null } : {}),
          }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.code && { code: input.code.toUpperCase() }),
          ...(input.type !== undefined && { type: input.type }),
          ...(input.value !== undefined && { value: input.value }),
          ...(input.minimumOrder !== undefined && {
            minimumOrder: input.minimumOrder,
          }),
          ...(input.maximumDiscount !== undefined && {
            maximumDiscount: input.maximumDiscount,
          }),
          ...(input.usageLimit !== undefined && {
            usageLimit: input.usageLimit,
          }),
          ...(input.perCustomerLimit !== undefined && {
            perCustomerLimit: input.perCustomerLimit,
          }),
          ...(input.validUntil !== undefined && {
            validUntil: input.validUntil
              ? new Date(`${input.validUntil.slice(0, 10)}T23:59:59Z`)
              : null,
          }),
        },
      });
      if (input.productIds !== undefined || input.categoryIds !== undefined)
        await db.$transaction(async (tx) => {
          if (input.productIds !== undefined) {
            await tx.couponProduct.deleteMany({ where: { couponId: id } });
            const productIds = input.productIds
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean);
            if (productIds.length)
              await tx.couponProduct.createMany({
                data: productIds.map((productId) => ({
                  couponId: id,
                  productId,
                })),
              });
          }
          if (input.categoryIds !== undefined) {
            await tx.couponCategory.deleteMany({ where: { couponId: id } });
            const categoryIds = input.categoryIds
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean);
            if (categoryIds.length)
              await tx.couponCategory.createMany({
                data: categoryIds.map((categoryId) => ({
                  couponId: id,
                  categoryId,
                })),
              });
          }
        });
      await audit(auth.id, "COUPON_UPDATED", "Coupon", id, {
        fields: Object.keys(body).filter((key) => key !== "id"),
      });
      return ok("Coupon updated");
    }
    if (resource === "integrations") {
      const enabled = z.boolean().parse(body.enabled);
      await db.integration.update({ where: { id }, data: { enabled } });
      await audit(auth.id, "INTEGRATION_STATUS_CHANGED", "Integration", id, {
        enabled,
      });
      return ok("Integration updated");
    }
    if (resource === "homepage") {
      const input = z
        .object({
          id: z.string(),
          enabled: z.boolean().optional(),
          name: z.string().min(2).optional(),
          heading: z.string().optional(),
          subtitle: z.string().optional(),
          image: z.string().optional(),
          ctaLabel: z.string().optional(),
          ctaLink: z.string().optional(),
          productIds: z.string().optional(),
          categoryIds: z.string().optional(),
        })
        .parse(body);
      const existingSection = await db.homepageSection.findUniqueOrThrow({
        where: { id },
        select: { config: true },
      });
      const previousConfig =
        existingSection.config &&
        typeof existingSection.config === "object" &&
        !Array.isArray(existingSection.config)
          ? (existingSection.config as Prisma.JsonObject)
          : {};
      const nextConfig: Prisma.InputJsonObject = {
        ...previousConfig,
        ...(input.productIds !== undefined && {
          productIds: input.productIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
        ...(input.categoryIds !== undefined && {
          categoryIds: input.categoryIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      };
      await db.homepageSection.update({
        where: { id },
        data: {
          ...(input.enabled !== undefined && { enabled: input.enabled }),
          ...(input.name !== undefined && { name: input.name }),
          ...(input.heading !== undefined && {
            heading: input.heading || null,
          }),
          ...(input.subtitle !== undefined && {
            subtitle: input.subtitle || null,
          }),
          ...(input.image !== undefined && { image: input.image || null }),
          ...(input.ctaLabel !== undefined && {
            ctaLabel: input.ctaLabel || null,
          }),
          ...(input.ctaLink !== undefined && {
            ctaLink: input.ctaLink || null,
          }),
          ...(input.productIds !== undefined || input.categoryIds !== undefined
            ? { config: nextConfig }
            : {}),
        },
      });
      await audit(auth.id, "HOMEPAGE_SECTION_CHANGED", "HomepageSection", id, {
        fields: Object.keys(body).filter((key) => key !== "id"),
      });
      revalidatePath("/");
      return ok("Homepage updated");
    }
if (resource === "orders") {
  const nextStatus = z
    .enum([
      "NEW",
      "CONFIRMED",
      "PACKING",
      "READY_TO_SHIP",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "FAILED_DELIVERY",
    ])
    .parse(body.status);

  await db.$transaction(
    async (tx) => {
      const order =
        await tx.order.findUniqueOrThrow({
          where: {
            id,
          },

          include: {
            items: true,
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
         RESTORE INVENTORY ON CANCELLATION
         =================================================== */

        if (
          nextStatus ===
            "CANCELLED" &&
          order.status !==
            "CANCELLED"
        ) {
        /*
         * Combine quantities by variant.
         *
         * This also protects us if the same
         * variant somehow appears more than
         * once in an historical order.
         */
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
            await tx.productVariant.findUniqueOrThrow(
              {
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
              },
            );

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
                auth.id,
            },
          });
        }
      }


      /* ===================================================
   RE-DEDUCT INVENTORY WHEN REOPENING CANCELLED ORDER
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
      await tx.productVariant.findUniqueOrThrow(
        {
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
        },
      );

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
          auth.id,
      },
    });
  }
}


      /* ===================================================
         UPDATE ORDER + HISTORY
         =================================================== */

      await tx.order.update({
        where: {
          id,
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

              changedBy:
                auth.id,

              source:
                "ADMIN",
            },
          },
        },
      });
    },

    {
      /*
       * Neon/database latency can make
       * cancellation transactions take
       * longer than Prisma's default 5s.
       */
      maxWait:
        10_000,

      timeout:
        20_000,
    },
  );

  await audit(
    auth.id,
    "ORDER_STATUS_CHANGED",
    "Order",
    id,
    {
      status:
        nextStatus,
    },
  );

  revalidatePath(
    "/admin/orders",
  );

  revalidatePath(
    `/admin/orders/${id}`,
  );

  revalidatePath(
    "/account/orders",
  );

return ok(
  "Order status updated",
);
}

return NextResponse.json(
  {
    error:
      "Unsupported resource",
  },
  {
    status:
      404,
  },
);
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = (await params).resource;
  const auth = await authorize(request, resource);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    if (resource === "settings") {
      const input = z
        .object({
          shipping: z.object({
            insideDhaka: z.number().nonnegative(),
            outsideDhaka: z.number().nonnegative(),
            insideEstimate: z.string(),
            outsideEstimate: z.string(),
          }),
          payments: z
            .object({ codEnabled: z.boolean(), bkashEnabled: z.boolean() })
            .refine(
              (x) => x.codEnabled || x.bkashEnabled,
              "At least one payment method must remain enabled",
            ),
          general: z.record(z.string(), z.unknown()),
          contact: z.record(z.string(), z.unknown()).optional(),
          social: z.record(z.string(), z.unknown()).optional(),
          other: z.record(z.string(), z.unknown()).optional(),
        })
        .parse(body);
      await db.$transaction(
        Object.entries(input).map(([key, value]) =>
          db.storeSetting.upsert({
            where: { key },
            update: { value: value as never },
            create: { key, value: value as never },
          }),
        ),
      );
      await audit(auth.id, "SETTINGS_CHANGED", "StoreSetting", null, {
        keys: Object.keys(input),
      });
      revalidateStore();
      return ok("Settings saved");
    }

    if (resource === "categories") {
      const order = z
        .array(
          z.object({
            id:
              z.string(),

            sortOrder:
              z
                .number()
                .int()
                .nonnegative(),
          }),
        )
        .min(1)
        .parse(
          body.order,
        );

      const ids =
        order.map(
          (
            item,
          ) =>
            item.id,
        );

      const categories =
        await db.category.findMany({
          where: {
            id: {
              in:
                ids,
            },
          },

          select: {
            id:
              true,

            parentId:
              true,
          },
        });

      if (
        categories.length !==
        order.length
      ) {
        throw new Error(
          "One or more categories were not found.",
        );
      }

      const parentIds =
        new Set(
          categories.map(
            (
              category,
            ) =>
              category.parentId ??
              "__ROOT__",
          ),
        );

      if (
        parentIds.size !==
        1
      ) {
        throw new Error(
          "Categories can only be reordered within the same parent.",
        );
      }

      await db.$transaction(
        order.map(
          (
            item,
          ) =>
            db.category.update({
              where: {
                id:
                  item.id,
              },

              data: {
                sortOrder:
                  item.sortOrder,
              },
            }),
        ),
      );

      await audit(
        auth.id,
        "CATEGORIES_REORDERED",
        "Category",
        null,
        {
          count:
            order.length,

          parentId:
            categories[0]
              ?.parentId ??
            null,
        },
      );

      revalidateStore();

      return ok(
        "Category order updated",
      );
    }

    if (resource === "homepage") {
      if (Array.isArray(body.slideOrder)) {
        const slideOrder = z
          .array(
            z.object({
              id: z.string(),
              sortOrder: z.number().int().nonnegative(),
            }),
          )
          .parse(body.slideOrder);
        await db.$transaction(
          slideOrder.map((slide) =>
            db.heroSlide.update({
              where: { id: slide.id },
              data: { sortOrder: slide.sortOrder },
            }),
          ),
        );
        await audit(auth.id, "HERO_SLIDES_REORDERED", "HeroSlide", null, {
          count: slideOrder.length,
        });
        revalidatePath("/");
        return ok("Hero slides reordered");
      }
      const order = z
        .array(
          z.object({
            id: z.string(),
            sortOrder: z.number().int().nonnegative(),
          }),
        )
        .parse(body.order);
      await db.$transaction(
        order.map((x) =>
          db.homepageSection.update({
            where: { id: x.id },
            data: { sortOrder: x.sortOrder },
          }),
        ),
      );
      await audit(auth.id, "HOMEPAGE_REORDERED", "HomepageSection", null, {
        count: order.length,
      });
      revalidatePath("/");
      return ok("Homepage order saved");
    }
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = (await params).resource;
  const auth = await authorize(request, resource);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = z.object({ id: z.string() }).parse(await request.json());
    if (resource === "products") {
      const dependencies = await db.product.findUniqueOrThrow({
        where: { id },
        select: {
          _count: { select: { orderItems: true } },
          variants: {
            select: { _count: { select: { inventoryTransactions: true } } },
          },
        },
      });
      const hasHistory =
        dependencies._count.orderItems > 0 ||
        dependencies.variants.some(
          (variant) => variant._count.inventoryTransactions > 0,
        );
      if (hasHistory)
        await db.product.update({
          where: { id },
          data: { status: "ARCHIVED" },
        });
      else await db.product.delete({ where: { id } });
      await audit(
        auth.id,
        hasHistory ? "PRODUCT_ARCHIVED" : "PRODUCT_DELETED",
        "Product",
        id,
        {},
      );
      revalidateStore();
      return ok(
        hasHistory ? "Product archived to preserve history" : "Product deleted",
      );
    }
    if (resource === "categories") {
      const category = await db.category.findUniqueOrThrow({
        where: { id },
        select: { _count: { select: { products: true, children: true } } },
      });
      if (category._count.products || category._count.children)
        throw new Error(
          "Reassign products and child categories before deleting this category.",
        );
      await db.category.delete({ where: { id } });
      await audit(auth.id, "CATEGORY_DELETED", "Category", id, {});
      revalidateStore();
      return ok("Category deleted");
    }
    if (resource === "coupons") {
      const usage = await db.couponUsage.count({ where: { couponId: id } });
      if (usage)
        await db.coupon.update({ where: { id }, data: { active: false } });
      else await db.coupon.delete({ where: { id } });
      await audit(
        auth.id,
        usage ? "COUPON_ARCHIVED" : "COUPON_DELETED",
        "Coupon",
        id,
        {},
      );
      return ok(
        usage ? "Coupon disabled to preserve usage history" : "Coupon deleted",
      );
    }
    return NextResponse.json(
      { error: "Unsupported resource" },
      { status: 404 },
    );
  } catch (error) {
    return fail(error);
  }
}

const optionalNumber = z
  .union([
    z.coerce.number().nonnegative(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((v) => (v === "" || v == null ? null : v));
const optionalPositiveInt = z
  .union([
    z.coerce.number().int().positive(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .transform((value) => (value === "" || value == null ? null : value));
async function authorize(request: Request, resource: string) {
  const user = await getApiAdmin(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permission = permissionsByResource[resource];
  if (!permission || !hasPermission(user.role as never, permission))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return user;
}
async function assertCategoryDepth(parentId: string) {
  const parent = await db.category.findUnique({
    where: { id: parentId },
    include: { parent: true },
  });
  if (!parent) throw new Error("Parent category not found.");
  if (parent.parent?.parentId)
    throw new Error("Maximum category depth is three levels.");
}
async function assertNotDescendant(
  categoryId: string,
  candidateParentId: string,
) {
  let cursor: string | null = candidateParentId;
  const lineage: string[] = [];
  while (cursor) {
    lineage.push(cursor);
    const current: { parentId: string | null } | null =
      await db.category.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
    cursor = current?.parentId ?? null;
  }
  if (!categoryMoveIsValid(categoryId, lineage))
    throw new Error(
      lineage.includes(categoryId)
        ? "A category cannot be moved below one of its children."
        : "Maximum category depth is three levels.",
    );
}
async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>,
) {
  await db.activityLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata as Prisma.InputJsonObject,
    },
  });
}
function revalidateStore() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categories");
  revalidatePath("/checkout");
}
function ok(message: string) {
  return NextResponse.json({ ok: true, message });
}
function fail(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: "Please check the submitted fields.",
        fields: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  console.error(error);
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Request failed" },
    { status: 400 },
  );
}
