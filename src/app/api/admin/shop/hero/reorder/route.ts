import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-api-auth";

import {
  shopHeroReorderSchema,
} from "@/lib/shop-hero-validation";

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
      shopHeroReorderSchema.parse(
        await request.json(),
      );

    const ids =
      input.items.map(
        (item) => item.id,
      );

    const existing =
      await db.shopHeroSlide.findMany({
        where: {
          id: {
            in: ids,
          },
        },

        select: {
          id: true,
        },
      });

    if (
      existing.length !==
      ids.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more slides do not exist.",
        },
        {
          status: 400,
        },
      );
    }

    await db.$transaction([
      ...input.items.map(
        (item) =>
          db.shopHeroSlide.update({
            where: {
              id: item.id,
            },

            data: {
              sortOrder:
                item.sortOrder,
            },
          }),
      ),

      db.activityLog.create({
        data: {
          actorId:
            admin.id,

          action:
            "REORDER",

          entityType:
            "ShopHeroSlide",

          metadata: {
            count:
              input.items.length,
          },
        },
      }),
    ]);

    revalidatePath("/shop");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Shop hero reorder error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to reorder Shop hero slides.",
      },
      {
        status: 400,
      },
    );
  }
}