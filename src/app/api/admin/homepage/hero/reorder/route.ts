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
  heroReorderSchema,
} from "@/lib/hero-validation";

export const dynamic =
  "force-dynamic";

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
      heroReorderSchema.safeParse(
        body,
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid slide order.",
          issues:
            parsed.error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const ids =
      parsed.data.items.map(
        (item) => item.id,
      );

    /*
     * Ensure the user cannot reorder
     * arbitrary HeroSlide IDs belonging
     * to another section.
     */

    const slides =
      await db.heroSlide.findMany({
        where: {
          id: {
            in: ids,
          },

          section: {
            type: "HERO",
          },
        },

        select: {
          id: true,
        },
      });

    if (
      slides.length !==
      ids.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more hero slides are invalid.",
        },
        {
          status: 400,
        },
      );
    }

    await db.$transaction(
      async (tx) => {
        for (
          const item of
          parsed.data.items
        ) {
          await tx.heroSlide.update({
            where: {
              id: item.id,
            },

            data: {
              sortOrder:
                item.sortOrder,
            },
          });
        }

        await tx.activityLog.create({
          data: {
            actorId:
              admin.id,

            action:
              "HERO_SLIDES_REORDERED",

            entityType:
              "HeroSlide",

            metadata: {
              count:
                parsed.data
                  .items.length,
            },
          },
        });
      },
    );

    revalidatePath("/");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Hero reorder error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to reorder hero slides.",
      },
      {
        status: 500,
      },
    );
  }
}