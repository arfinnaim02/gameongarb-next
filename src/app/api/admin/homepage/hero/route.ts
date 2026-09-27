import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";

import {
  heroSlideCreateSchema,
} from "@/lib/hero-validation";

export const dynamic =
  "force-dynamic";

async function getHeroSection() {
  let section =
    await db.homepageSection.findFirst({
      where: {
        type: "HERO",
      },
    });

  if (!section) {
    section =
      await db.homepageSection.create({
        data: {
          type: "HERO",
          name: "Hero",
          heading:
            "Game on. Every day.",
          subtitle:
            "Sports. Style. Everything between.",
          enabled: true,
          sortOrder: 0,
        },
      });
  }

  return section;
}

/* =========================================================
   GET ALL HERO SLIDES
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
      await getHeroSection();

    const slides =
      await db.heroSlide.findMany({
        where: {
          sectionId:
            section.id,
        },

        orderBy: [
          {
            sortOrder:
              "asc",
          },

          {
            createdAt:
              "asc",
          },
        ],
      });

    return NextResponse.json({
      section,
      slides,
    });
  } catch (error) {
    console.error(
      "Hero GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load hero slides.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE HERO SLIDE
   ========================================================= */

export async function POST(
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

    const body =
      await request.json();

    const parsed =
      heroSlideCreateSchema.safeParse(
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

    const section =
      await getHeroSection();

    const lastSlide =
      await db.heroSlide.findFirst({
        where: {
          sectionId:
            section.id,
        },

        orderBy: {
          sortOrder:
            "desc",
        },

        select: {
          sortOrder: true,
        },
      });

    const slide =
      await db.$transaction(
        async (tx) => {
          const created =
            await tx.heroSlide.create({
              data: {
                sectionId:
                  section.id,

                title:
                  parsed.data
                    .title,

                subtitle:
                  normalizeNullable(
                    parsed.data
                      .subtitle,
                  ),

                image:
                  parsed.data
                    .image,

                imagePublicId:
                  normalizeNullable(
                    parsed.data
                      .imagePublicId,
                  ),

                mobileImage:
                  normalizeNullable(
                    parsed.data
                      .mobileImage,
                  ),

                mobileImagePublicId:
                  normalizeNullable(
                    parsed.data
                      .mobileImagePublicId,
                  ),

                ctaLabel:
                  normalizeNullable(
                    parsed.data
                      .ctaLabel,
                  ),

                ctaLink:
                  normalizeNullable(
                    parsed.data
                      .ctaLink,
                  ),

                enabled:
                  parsed.data
                    .enabled,

                sortOrder:
                  (lastSlide
                    ?.sortOrder ??
                    -1) + 1,
              },
            });

          await tx.activityLog.create({
            data: {
              actorId:
                admin.id,

              action:
                "HERO_SLIDE_CREATED",

              entityType:
                "HeroSlide",

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

    revalidatePath("/");

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
      "Hero POST error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create hero slide.",
      },
      {
        status: 500,
      },
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