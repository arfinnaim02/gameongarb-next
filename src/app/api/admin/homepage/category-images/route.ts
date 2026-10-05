import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

const categoryImageSchema =
  z.object({
    categoryId:
      z
        .string()
        .min(1),

    image:
      z
        .union([
          z
            .string()
            .url(),

          z
            .string()
            .regex(
              /^\/[^\s]*$/,
              "Invalid local image path.",
            ),

          z.null(),
        ]),
  });

/* =========================================================
   GET CATEGORY IMAGES
   ========================================================= */

export async function GET() {
  try {
    const admin =
      await requireAdminApi();

    if (!admin) {
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

    const categories =
      await db.category.findMany(
        {
          orderBy: [
            {
              sortOrder:
                "asc",
            },

            {
              name:
                "asc",
            },
          ],

          select: {
            id:
              true,

            name:
              true,

            slug:
              true,

            image:
              true,

            parentId:
              true,

            active:
              true,

            showOnHomepage:
              true,

            parent: {
              select: {
                id:
                  true,

                name:
                  true,

                slug:
                  true,
              },
            },
          },
        },
      );

    return NextResponse.json(
      {
        categories,
      },
    );
  } catch (error) {
    console.error(
      "Category images GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load category images.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   UPDATE CATEGORY IMAGE
   ========================================================= */

export async function PATCH(
  request: Request,
) {
  try {
    const admin =
      await requireAdminApi();

    if (!admin) {
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

    const input =
      categoryImageSchema.parse(
        await request.json(),
      );

    const category =
      await db.category.update({
        where: {
          id:
            input.categoryId,
        },

        data: {
          image:
            input.image ||
            null,
        },

        select: {
          id:
            true,

          name:
            true,

          slug:
            true,

          image:
            true,

          parentId:
            true,

          active:
            true,

          showOnHomepage:
            true,

          parent: {
            select: {
              id:
                true,

              name:
                true,

              slug:
                true,
            },
          },
        },
      });

    await db.activityLog.create(
      {
        data: {
          actorId:
            admin.id,

          action:
            "CATEGORY_IMAGE_UPDATED",

          entityType:
            "Category",

          entityId:
            category.id,

          metadata: {
            category:
              category.name,

            hasImage:
              Boolean(
                category.image,
              ),
          },
        },
      },
    );

    revalidatePath("/");
    revalidatePath(
      "/categories",
    );
    revalidatePath(
      "/shop",
    );

    return NextResponse.json(
      {
        category,

        message:
          "Category image updated successfully.",
      },
    );
  } catch (error) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid category image data.",
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      "Category images PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update category image.",
      },
      {
        status: 400,
      },
    );
  }
}