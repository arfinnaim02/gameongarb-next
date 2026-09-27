import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-api-auth";

import {
  shopHeroSlideCreateSchema,
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

export async function GET() {
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

  const slides =
    await db.shopHeroSlide.findMany({
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

  return NextResponse.json({
    slides,
  });
}

export async function POST(
  request: Request,
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

  try {
    const input =
      shopHeroSlideCreateSchema.parse(
        await request.json(),
      );

    const last =
      await db.shopHeroSlide.findFirst({
        orderBy: {
          sortOrder: "desc",
        },

        select: {
          sortOrder: true,
        },
      });

    const slide =
      await db.$transaction(
        async (tx) => {
          const created =
            await tx.shopHeroSlide.create({
              data: {
                title:
                  input.title,

                subtitle:
                  nullable(
                    input.subtitle,
                  ),

                image:
                  input.image,

                imagePublicId:
                  nullable(
                    input.imagePublicId,
                  ),

                mobileImage:
                  nullable(
                    input.mobileImage,
                  ),

                mobileImagePublicId:
                  nullable(
                    input.mobileImagePublicId,
                  ),

                ctaLabel:
                  nullable(
                    input.ctaLabel,
                  ),

                ctaLink:
                  nullable(
                    input.ctaLink,
                  ),

                enabled:
                  input.enabled,

                sortOrder:
                  (last?.sortOrder ??
                    -1) + 1,
              },
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "CREATE",

              entityType:
                "ShopHeroSlide",

              entityId:
                created.id,

              metadata: {
                title:
                  created.title,
              },
            },
          });

          return created;
        },
      );

    revalidatePath("/shop");

    return NextResponse.json(
      {
        slide,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Create shop hero error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create Shop hero slide.",
      },
      {
        status: 400,
      },
    );
  }
}