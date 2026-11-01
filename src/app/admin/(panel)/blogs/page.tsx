import {
  notFound,
} from "next/navigation";

import {
  BlogManager,
} from "@/components/admin/blog-manager";

import {
  serializeBlogPost,
} from "@/lib/blog";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function BlogsAdminPage() {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "blogs",
    )
  ) {
    notFound();
  }

  const posts =
    await db.blogPost.findMany({
      orderBy: {
        updatedAt:
          "desc",
      },
    });

  return (
    <BlogManager
      initialPosts={
        posts.map(
          serializeBlogPost,
        )
      }
    />
  );
}
