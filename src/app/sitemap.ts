import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  const staticRoutes = [
    "",
    "/shop",
    "/categories",
    "/track-order",
    "/about",
    "/contact",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
    "/faq",
  ];
  return [
    ...staticRoutes.map((url) => ({
      url: `${base}${url}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
    })),
    ...categories.map((c) => ({
      url: `${base}/shop?category=${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
    })),
  ];
}
