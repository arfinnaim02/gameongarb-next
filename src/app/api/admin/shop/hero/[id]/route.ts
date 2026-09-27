import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";
import { requireAdminApi } from "@/lib/admin-api-auth";

import {
  shopHeroSlideUpdateSchema,
} from "@/lib/shop-hero-validation";

export const dynamic = "force-dynamic";

function nullable(
  value?: string | null,
) {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
}

async function safelyDelete(
  publicId?: string | null,
) {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      publicId,
    );
  } catch (error) {
    console.error(
      "Cloudinary delete failed:",
      error,
    );
  }
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const {
    id,
  } = await context.params;

  try {
    const existing =
      await db.shopHeroSlide.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Slide not found.",
        },
        {
          status: 404,
        },
      );
    }

    const input =
      shopHeroSlideUpdateSchema.parse(
        await request.json(),
      );

    const data = {
      ...(input.title !== undefined
        ? {
            title:
              input.title,
          }
        : {}),

      ...(input.subtitle !== undefined
        ? {
            subtitle:
              nullable(
                input.subtitle,
              ),
          }
        : {}),

      ...(input.image !== undefined
        ? {
            image:
              input.image,
          }
        : {}),

      ...(input.imagePublicId !== undefined
        ? {
            imagePublicId:
              nullable(
                input.imagePublicId,
              ),
          }
        : {}),

      ...(input.mobileImage !== undefined
        ? {
            mobileImage:
              nullable(
                input.mobileImage,
              ),
          }
        : {}),

      ...(input.mobileImagePublicId !== undefined
        ? {
            mobileImagePublicId:
              nullable(
                input.mobileImagePublicId,
              ),
          }
        : {}),

      ...(input.ctaLabel !== undefined
        ? {
            ctaLabel:
              nullable(
                input.ctaLabel,
              ),
          }
        : {}),

      ...(input.ctaLink !== undefined
        ? {
            ctaLink:
              nullable(
                input.ctaLink,
              ),
          }
        : {}),

      ...(input.enabled !== undefined
        ? {
            enabled:
              input.enabled,
          }
        : {}),
    };

    const slide =
      await db.$transaction(
        async (tx) => {
          const updated =
            await tx.shopHeroSlide.update({
              where: {
                id,
              },

              data,
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "UPDATE",

              entityType:
                "ShopHeroSlide",

              entityId:
                id,

              metadata: {
                title:
                  updated.title,
              },
            },
          });

          return updated;
        },
      );

    if (
      input.imagePublicId !==
        undefined &&
      existing.imagePublicId &&
      existing.imagePublicId !==
        slide.imagePublicId
    ) {
      await safelyDelete(
        existing.imagePublicId,
      );
    }

    if (
      input.mobileImagePublicId !==
        undefined &&
      existing.mobileImagePublicId &&
      existing.mobileImagePublicId !==
        slide.mobileImagePublicId
    ) {
      await safelyDelete(
        existing.mobileImagePublicId,
      );
    }

    revalidatePath("/shop");

    return NextResponse.json({
      slide,
    });
  } catch (error) {
    console.error(
      "Update shop hero error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update Shop hero slide.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const {
    id,
  } = await context.params;

  try {
    const existing =
      await db.shopHeroSlide.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Slide not found.",
        },
        {
          status: 404,
        },
      );
    }

    await db.$transaction(
      async (tx) => {
        await tx.shopHeroSlide.delete({
          where: {
            id,
          },
        });

        await tx.activityLog.create({
          data: {
            actorId:
              admin.id,

            action:
              "DELETE",

            entityType:
              "ShopHeroSlide",

            entityId:
              id,

            metadata: {
              title:
                existing.title,
            },
          },
        });
      },
    );

    await Promise.all([
      safelyDelete(
        existing.imagePublicId,
      ),

      safelyDelete(
        existing.mobileImagePublicId,
      ),
    ]);

    revalidatePath("/shop");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete shop hero error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete Shop hero slide.",
      },
      {
        status: 400,
      },
    );
  }
}