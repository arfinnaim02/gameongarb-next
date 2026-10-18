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

const SETTING_KEY =
  "global_announcement_bar";

const itemSchema =
  z.object({
    id:
      z
        .string()
        .min(
          1,
        )
        .max(
          100,
        ),

    badge:
      z
        .string()
        .max(
          50,
        ),

    text:
      z
        .string()
        .min(
          1,
        )
        .max(
          180,
        ),

    ctaLabel:
      z
        .string()
        .max(
          50,
        ),

    href:
      z
        .string()
        .min(
          1,
        )
        .max(
          500,
        ),

    enabled:
      z.boolean(),
  });

const updateSchema =
  z.object({
    enabled:
      z.boolean(),

    speedSeconds:
      z
        .number()
        .int()
        .min(
          8,
        )
        .max(
          90,
        ),

    items:
      z
        .array(
          itemSchema,
        )
        .max(
          20,
        ),
  });

type AnnouncementValue =
  z.infer<
    typeof updateSchema
  >;

const DEFAULT_VALUE:
  AnnouncementValue = {
  enabled:
    false,

  speedSeconds:
    28,

  items: [
    {
      id:
        "welcome-offer",

      badge:
        "Offers",

      text:
        "Up to 30% discount on selected products",

      ctaLabel:
        "Shop Now",

      href:
        "/shop?offers=1",

      enabled:
        true,
    },

    {
      id:
        "new-arrivals",

      badge:
        "New Drop",

      text:
        "Fresh arrivals are now live",

      ctaLabel:
        "Explore",

      href:
        "/shop?sort=newest",

      enabled:
        true,
    },

    {
      id:
        "delivery",

      badge:
        "Delivery",

      text:
        "Inside Dhaka delivery ৳80",

      ctaLabel:
        "Shop Now",

      href:
        "/shop",

      enabled:
        true,
    },
  ],
};

function readValue(
  value:
    unknown,
):
  AnnouncementValue {
  const parsed =
    updateSchema.safeParse(
      value,
    );

  return parsed.success
    ? parsed.data
    : {
        ...DEFAULT_VALUE,
      };
}

export async function GET() {
  try {
    const admin =
      await requireAdminApi();

    if (
      !admin
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status:
            401,
        },
      );
    }

    const setting =
      await db.storeSetting
        .findUnique({
          where: {
            key:
              SETTING_KEY,
          },
        });

    return NextResponse.json({
      announcement:
        setting
          ? readValue(
              setting.value,
            )
          : {
              ...DEFAULT_VALUE,
            },
    });
  } catch (
    error
  ) {
    console.error(
      "Announcement bar GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load announcement bar.",
      },
      {
        status:
          500,
      },
    );
  }
}

export async function PATCH(
  request:
    Request,
) {
  try {
    const admin =
      await requireAdminApi();

    if (
      !admin
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized.",
        },
        {
          status:
            401,
        },
      );
    }

    const parsed =
      updateSchema.safeParse(
        await request.json(),
      );

    if (
      !parsed.success
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid announcement bar settings.",

          issues:
            parsed.error
              .flatten(),
        },
        {
          status:
            400,
        },
      );
    }

    const input =
      parsed.data;

    const setting =
      await db.$transaction(
        async (
          tx,
        ) => {
          const updated =
            await tx.storeSetting
              .upsert({
                where: {
                  key:
                    SETTING_KEY,
                },

                create: {
                  key:
                    SETTING_KEY,

                  value:
                    input,

                  isSecret:
                    false,
                },

                update: {
                  value:
                    input,

                  isSecret:
                    false,
                },
              });

          await tx.activityLog
            .create({
              data: {
                actorId:
                  admin.id,

                action:
                  "GLOBAL_ANNOUNCEMENT_BAR_UPDATED",

                entityType:
                  "StoreSetting",

                entityId:
                  updated.id,

                metadata: {
                  enabled:
                    input.enabled,

                  speedSeconds:
                    input.speedSeconds,

                  itemCount:
                    input.items.length,
                },
              },
            });

          return updated;
        },
      );

    revalidatePath(
      "/",
      "layout",
    );

    return NextResponse.json({
      message:
        "Announcement bar updated successfully.",

      announcement:
        readValue(
          setting.value,
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Announcement bar PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save announcement bar.",
      },
      {
        status:
          500,
      },
    );
  }
}