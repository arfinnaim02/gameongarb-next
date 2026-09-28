import {
  revalidatePath,
} from "next/cache";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  brandStoryUpdateSchema,
} from "@/lib/brand-story-validation";

import {
  cloudinary,
} from "@/lib/cloudinary";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

/* =========================================================
   HELPERS
   ========================================================= */

function nullable(
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

async function getBrandStorySection() {
  let section =
    await db.homepageSection.findFirst({
      where: {
        type:
          "BRAND_STORY",
      },
    });

  if (!section) {
    section =
      await db.homepageSection.create({
        data: {
          type:
            "BRAND_STORY",

          name:
            "Brand Story",

          heading:
            "Experience the thrill.",

          subtitle:
            "More than what you wear. It’s a movement. It’s a mindset.",

          ctaLabel:
            "Our Story",

          ctaLink:
            "/shop",

          enabled: true,

          sortOrder: 6,
        },
      });
  }

  return section;
}

async function safelyDelete(
  publicId:
    | string
    | null
    | undefined,
) {
  if (!publicId) {
    return;
  }

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
    console.error(
      "Brand Story Cloudinary cleanup failed:",
      publicId,
      error,
    );
  }
}

/* =========================================================
   GET
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

    const section =
      await getBrandStorySection();

    return NextResponse.json({
      section,
    });
  } catch (error) {
    console.error(
      "Brand Story GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load Brand Story.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: NextRequest,
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

    const current =
      await getBrandStorySection();

    const body =
      await request.json();

    const parsed =
      brandStoryUpdateSchema.safeParse(
        body,
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid Brand Story settings.",

          issues:
            parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const input =
      parsed.data;

    const updated =
      await db.$transaction(
        async (tx) => {
          const section =
            await tx.homepageSection.update({
              where: {
                id:
                  current.id,
              },

              data: {
                ...(input.heading !==
                undefined
                  ? {
                      heading:
                        nullable(
                          input.heading,
                        ),
                    }
                  : {}),

                ...(input.subtitle !==
                undefined
                  ? {
                      subtitle:
                        nullable(
                          input.subtitle,
                        ),
                    }
                  : {}),

                ...(input.image !==
                undefined
                  ? {
                      image:
                        input.image,
                    }
                  : {}),

                ...(input.imagePublicId !==
                undefined
                  ? {
                      imagePublicId:
                        nullable(
                          input.imagePublicId,
                        ),
                    }
                  : {}),

                ...(input.ctaLabel !==
                undefined
                  ? {
                      ctaLabel:
                        nullable(
                          input.ctaLabel,
                        ),
                    }
                  : {}),

                ...(input.ctaLink !==
                undefined
                  ? {
                      ctaLink:
                        nullable(
                          input.ctaLink,
                        ),
                    }
                  : {}),

                ...(input.enabled !==
                undefined
                  ? {
                      enabled:
                        input.enabled,
                    }
                  : {}),
              },
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "BRAND_STORY_UPDATED",

              entityType:
                "HomepageSection",

              entityId:
                section.id,

              metadata: {
                heading:
                  section.heading,
              },
            },
          });

          return section;
        },
      );

    /*
     * Delete old Cloudinary image only
     * after the DB update succeeds.
     */
    if (
      input.imagePublicId !==
        undefined &&
      current.imagePublicId &&
      current.imagePublicId !==
        updated.imagePublicId
    ) {
      await safelyDelete(
        current.imagePublicId,
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      section: updated,
    });
  } catch (error) {
    console.error(
      "Brand Story PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save Brand Story.",
      },
      {
        status: 500,
      },
    );
  }
}