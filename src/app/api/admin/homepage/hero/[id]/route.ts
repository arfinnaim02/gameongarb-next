import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

import { requireAdminApi } from "@/lib/admin-api-auth";
import { cloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/db";

import {
  heroSlideUpdateSchema,
} from "@/lib/hero-validation";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   UPDATE
   ========================================================= */

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
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

    const { id } =
      await context.params;

    const current =
      await db.heroSlide.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Hero slide not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body =
      await request.json();

    const parsed =
      heroSlideUpdateSchema.safeParse(
        body,
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid hero slide.",
          issues:
            parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const data =
      parsed.data;

    const updated =
      await db.$transaction(
        async (tx) => {
          const slide =
            await tx.heroSlide.update({
              where: {
                id,
              },

              data: {
                ...(data.title !==
                undefined
                  ? {
                      title:
                        data.title,
                    }
                  : {}),

                ...(data.subtitle !==
                undefined
                  ? {
                      subtitle:
                        normalizeNullable(
                          data.subtitle,
                        ),
                    }
                  : {}),

                ...(data.image !==
                undefined
                  ? {
                      image:
                        data.image,
                    }
                  : {}),

                ...(data.imagePublicId !==
                undefined
                  ? {
                      imagePublicId:
                        normalizeNullable(
                          data.imagePublicId,
                        ),
                    }
                  : {}),

                ...(data.mobileImage !==
                undefined
                  ? {
                      mobileImage:
                        normalizeNullable(
                          data.mobileImage,
                        ),
                    }
                  : {}),

                ...(data.mobileImagePublicId !==
                undefined
                  ? {
                      mobileImagePublicId:
                        normalizeNullable(
                          data.mobileImagePublicId,
                        ),
                    }
                  : {}),

                ...(data.ctaLabel !==
                undefined
                  ? {
                      ctaLabel:
                        normalizeNullable(
                          data.ctaLabel,
                        ),
                    }
                  : {}),

                ...(data.ctaLink !==
                undefined
                  ? {
                      ctaLink:
                        normalizeNullable(
                          data.ctaLink,
                        ),
                    }
                  : {}),

                ...(data.enabled !==
                undefined
                  ? {
                      enabled:
                        data.enabled,
                    }
                  : {}),
              },
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "HERO_SLIDE_UPDATED",

              entityType:
                "HeroSlide",

              entityId:
                slide.id,

              metadata: {
                title:
                  slide.title,
              },
            },
          });

          return slide;
        },
      );

    /*
     * Delete replaced assets only AFTER
     * the database update succeeds.
     */

    if (
      data.imagePublicId &&
      current.imagePublicId &&
      data.imagePublicId !==
        current.imagePublicId
    ) {
      await safelyDeleteCloudinary(
        current.imagePublicId,
      );
    }

    if (
      data.mobileImagePublicId !==
        undefined &&
      current.mobileImagePublicId &&
      data.mobileImagePublicId !==
        current.mobileImagePublicId
    ) {
      await safelyDeleteCloudinary(
        current.mobileImagePublicId,
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      slide: updated,
    });
  } catch (error) {
    console.error(
      "Hero PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update hero slide.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE
   ========================================================= */

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
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

    const { id } =
      await context.params;

    const current =
      await db.heroSlide.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          error:
            "Hero slide not found.",
        },
        {
          status: 404,
        },
      );
    }

    await db.$transaction(
      async (tx) => {
        await tx.heroSlide.delete({
          where: {
            id,
          },
        });

        await tx.activityLog.create({
          data: {
            actorId:
              admin.id,

            action:
              "HERO_SLIDE_DELETED",

            entityType:
              "HeroSlide",

            entityId:
              id,

            metadata: {
              title:
                current.title,
            },
          },
        });
      },
    );

    if (
      current.imagePublicId
    ) {
      await safelyDeleteCloudinary(
        current.imagePublicId,
      );
    }

    if (
      current.mobileImagePublicId
    ) {
      await safelyDeleteCloudinary(
        current.mobileImagePublicId,
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Hero DELETE error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete hero slide.",
      },
      {
        status: 500,
      },
    );
  }
}

async function safelyDeleteCloudinary(
  publicId: string,
) {
  try {
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type:
          "image",
        invalidate: true,
      },
    );
  } catch (error) {
    /*
     * Asset cleanup should not turn an
     * already successful DB change into
     * a failed user request.
     */
    console.error(
      "Cloudinary cleanup failed:",
      publicId,
      error,
    );
  }
}

function normalizeNullable(
  value:
    | string
    | null
    | undefined,
) {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
}