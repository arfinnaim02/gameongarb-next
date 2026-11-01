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
  z,
} from "zod";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  blogPostSchema,
  serializeBlogPost,
} from "@/lib/blog";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

const deleteSchema =
  z.object({
    id:
      z.string().min(1),
  });

function revalidateBlog(
  slug?:
    string,
) {
  revalidatePath(
    "/blog",
  );

  revalidatePath(
    "/sitemap.xml",
  );

  if (
    slug
  ) {
    revalidatePath(
      `/blog/${slug}`,
    );
  }
}

function blogError(
  error:
    unknown,
) {
  console.error(
    "Admin blog error:",
    error,
  );

  if (
    error instanceof
    ZodError
  ) {
    return NextResponse.json(
      {
        error:
          error.issues[0]
            ?.message ??
          "Please check the blog fields.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    error instanceof
    Prisma.PrismaClientKnownRequestError &&
    error.code ===
      "P2002"
  ) {
    return NextResponse.json(
      {
        error:
          "This blog slug is already being used.",
      },
      {
        status: 409,
      },
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof
          Error
          ? error.message
          : "Unable to save blog post.",
    },
    {
      status: 400,
    },
  );
}

export async function POST(
  request:
    Request,
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "blogs",
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
    const input =
      blogPostSchema.parse(
        await request.json(),
      );

    const now =
      new Date();

    const post =
      await db.blogPost.create({
        data: {
          title:
            input.title,

          slug:
            input.slug,

          excerpt:
            input.excerpt ||
            null,

          content:
            input.content,

          featuredImage:
            input.featuredImage ||
            null,

          featuredImageId:
            input.featuredImageId ||
            null,

          featuredImageAlt:
            input.featuredImageAlt ||
            null,

          category:
            input.category ||
            null,

          status:
            input.status,

          featured:
            input.featured,

          seoTitle:
            input.seoTitle ||
            null,

          seoDescription:
            input.seoDescription ||
            null,

          publishedAt:
            input.status ===
              "PUBLISHED"
              ? now
              : null,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "BLOG_CREATED",

        entityType:
          "BlogPost",

        entityId:
          post.id,

        metadata: {
          slug:
            post.slug,

          status:
            post.status,
        },
      },
    });

    revalidateBlog(
      post.slug,
    );

    return NextResponse.json(
      {
        post:
          serializeBlogPost(
            post,
          ),

        message:
          input.status ===
            "PUBLISHED"
            ? "Blog published."
            : "Blog saved.",
      },
      {
        status: 201,
      },
    );
  } catch (
    error
  ) {
    return blogError(
      error,
    );
  }
}

export async function PATCH(
  request:
    Request,
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "blogs",
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
    const input =
      blogPostSchema
        .extend({
          id:
            z.string().min(
              1,
            ),
        })
        .parse(
          await request.json(),
        );

    const existing =
      await db.blogPost.findUniqueOrThrow({
        where: {
          id:
            input.id,
        },
      });

    const publishedAt =
      input.status ===
        "PUBLISHED"
        ? (
            existing.publishedAt ??
            new Date()
          )
        : input.status ===
            "DRAFT"
          ? null
          : existing.publishedAt;

    const post =
      await db.blogPost.update({
        where: {
          id:
            input.id,
        },

        data: {
          title:
            input.title,

          slug:
            input.slug,

          excerpt:
            input.excerpt ||
            null,

          content:
            input.content,

          featuredImage:
            input.featuredImage ||
            null,

          featuredImageId:
            input.featuredImageId ||
            null,

          featuredImageAlt:
            input.featuredImageAlt ||
            null,

          category:
            input.category ||
            null,

          status:
            input.status,

          featured:
            input.featured,

          seoTitle:
            input.seoTitle ||
            null,

          seoDescription:
            input.seoDescription ||
            null,

          publishedAt,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "BLOG_UPDATED",

        entityType:
          "BlogPost",

        entityId:
          post.id,

        metadata: {
          oldSlug:
            existing.slug,

          slug:
            post.slug,

          status:
            post.status,
        },
      },
    });

    revalidateBlog(
      existing.slug,
    );

    revalidateBlog(
      post.slug,
    );

    return NextResponse.json({
      post:
        serializeBlogPost(
          post,
        ),

      message:
        input.status ===
          "PUBLISHED"
          ? "Blog published successfully."
          : "Blog updated successfully.",
    });
  } catch (
    error
  ) {
    return blogError(
      error,
    );
  }
}

export async function DELETE(
  request:
    Request,
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "blogs",
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
      deleteSchema.parse(
        await request.json(),
      );

    const post =
      await db.blogPost.delete({
        where: {
          id,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "BLOG_DELETED",

        entityType:
          "BlogPost",

        entityId:
          post.id,

        metadata: {
          slug:
            post.slug,
        },
      },
    });

    revalidateBlog(
      post.slug,
    );

    return NextResponse.json({
      message:
        "Blog deleted.",
    });
  } catch (
    error
  ) {
    return blogError(
      error,
    );
  }
}
