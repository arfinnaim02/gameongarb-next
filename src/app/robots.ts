import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "https://www.gameongarb.com";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/account/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
