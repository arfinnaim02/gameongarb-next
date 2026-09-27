import { db } from "@/lib/db";
import type { Product as StoreProduct } from "@/lib/data";

type DbProduct = Awaited<ReturnType<typeof db.product.findMany>>[number];

export function toStoreProduct(
  product: DbProduct & {
    images?: {
      url: string;
      alt: string;
      primary: boolean;
      sortOrder: number;
    }[];
    variants?: {
      id: string;
      sku: string;
      size: string | null;
      color: string | null;
      stock: number;
      active: boolean;
      priceOverride?: unknown;
    }[];
    categories?: { primary: boolean; category: { name: string } }[];
    reviews?: { rating: number }[];
  },
): StoreProduct {
  const images = product.images ?? [];
  const variants = (product.variants ?? []).filter((v) => v.active);
  const primaryCategory =
    product.categories?.find((x) => x.primary)?.category.name ??
    product.categories?.[0]?.category.name ??
    "Lifestyle";
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: primaryCategory,
    price: Number(product.salePrice ?? product.regularPrice),
    oldPrice: product.salePrice ? Number(product.regularPrice) : undefined,
    image:
      images.find((x) => x.primary)?.url ??
      images.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ??
      "/images/products/tshirt.svg",
    images: images.map((image) => ({ url: image.url, alt: image.alt })),
    alt: images.find((x) => x.primary)?.alt ?? product.name,
    colors: [
      ...new Set(variants.map((x) => x.color).filter(Boolean)),
    ] as string[],
    sizes: [
      ...new Set(variants.map((x) => x.size).filter(Boolean)),
    ] as string[],
    stock: variants.reduce((sum, x) => sum + x.stock, 0),
    variants: variants.map((x) => ({
      id: x.id,
      sku: x.sku,
      size: x.size ?? "One Size",
      color: x.color ?? "Default",
      stock: x.stock,
      price: Number(
        x.priceOverride ?? product.salePrice ?? product.regularPrice,
      ),
    })),
    badge: product.featured
      ? "FEATURED"
      : product.newArrival
        ? "NEW"
        : undefined,
    reviewCount: product.reviews?.length ?? 0,
    rating: product.reviews?.length
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
        product.reviews.length
      : undefined,
  };
}

export async function getProducts(options?: {
  featured?: boolean;
  newArrival?: boolean;
  trending?: boolean;
  take?: number;
}) {
  const rows = await db.product.findMany({
    where: {
      status: "ACTIVE",
      ...(options?.featured ? { featured: true } : {}),
      ...(options?.newArrival ? { newArrival: true } : {}),
      ...(options?.trending ? { trending: true } : {}),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      categories: { include: { category: true } },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options?.take,
  });
  return rows.map(toStoreProduct);
}

export async function getProduct(slug: string) {
  const row = await db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      categories: { include: { category: true } },
      reviews: { where: { approved: true }, select: { rating: true } },
    },
  });
  return row?.status === "ACTIVE"
    ? { raw: row, product: toStoreProduct(row) }
    : null;
}

export async function getNavigationCategories() {
  return db.category.findMany({
    where: { active: true, showInNavigation: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getCategoryTree(options?: { homepageOnly?: boolean }) {
  return db.category.findMany({
    where: {
      active: true,
      parentId: null,
      ...(options?.homepageOnly ? { showOnHomepage: true } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          children: { where: { active: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
}
