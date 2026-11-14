import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "https://www.gameongarb.com";
  const [
    products,
    blogPosts,
  ] = await Promise.all([
    db.product.findMany({
      where: {
        status: "ACTIVE",
        slug: {
          not: "test-product",
        },
      },
      select: { slug: true, updatedAt: true },
    }),
    db.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          lte: new Date(),
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
  ]);
  const staticRoutes = [
    "",
    "/shop",
    "/categories",
    "/about",
    "/contact",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
    "/faq",
    "/blog",
    "/reviews",
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
    ...blogPosts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
    })),
  ];
}
