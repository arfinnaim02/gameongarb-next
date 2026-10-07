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
  cloudinary,
} from "@/lib/cloudinary";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

const SETTING_KEY =
  "homepage_promotion_popup";

const DEFAULT_VALUE = {
  enabled: false,
  image: null,
  imagePublicId: null,
  redirectLink: "/shop",
  delayMs: 1400,
};

const updateSchema =
  z.object({
    enabled:
      z.boolean(),

    image:
      z
        .string()
        .nullable(),

    imagePublicId:
      z
        .string()
        .nullable(),

    redirectLink:
      z
        .string()
        .max(
          500,
        )
        .nullable(),

    delayMs:
      z
        .number()
        .int()
        .min(
          0,
        )
        .max(
          15_000,
        ),
  });

type PopupValue =
  z.infer<
    typeof updateSchema
  >;

function readValue(
  value:
    unknown,
):
  PopupValue {
  const parsed =
    updateSchema.safeParse(
      value,
    );

  if (
    parsed.success
  ) {
    return parsed.data;
  }

  return {
    ...DEFAULT_VALUE,
  };
}

async function safelyDelete(
  publicId:
    string |
    null |
    undefined,
) {
  if (
    !publicId
  ) {
    return;
  }

  try {
    await cloudinary
      .uploader
      .destroy(
        publicId,
        {
          resource_type:
            "image",

          invalidate:
            true,
        },
      );
  } catch (
    error
  ) {
    console.error(
      "Promotion popup Cloudinary cleanup failed:",
      publicId,
      error,
    );
  }
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
      popup:
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
      "Promotion popup GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load promotion popup settings.",
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

    const body =
      await request.json();

    const parsed =
      updateSchema
        .safeParse(
          body,
        );

    if (
      !parsed.success
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid promotion popup settings.",

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

    const current =
      await db.storeSetting
        .findUnique({
          where: {
            key:
              SETTING_KEY,
          },
        });

    const currentValue =
      current
        ? readValue(
            current.value,
          )
        : {
            ...DEFAULT_VALUE,
          };

    const updated =
      await db.$transaction(
        async (
          tx,
        ) => {
          const setting =
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
                  "HOMEPAGE_PROMOTION_POPUP_UPDATED",

                entityType:
                  "StoreSetting",

                entityId:
                  setting.id,

                metadata: {
                  enabled:
                    input.enabled,

                  redirectLink:
                    input.redirectLink,

                  delayMs:
                    input.delayMs,
                },
              },
            });

          return setting;
        },
      );

    if (
      currentValue
        .imagePublicId &&
      currentValue
        .imagePublicId !==
        input.imagePublicId
    ) {
      await safelyDelete(
        currentValue
          .imagePublicId,
      );
    }

    revalidatePath(
      "/",
    );

    return NextResponse.json({
      message:
        "Promotion popup updated successfully.",

      popup:
        readValue(
          updated.value,
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Promotion popup PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save promotion popup settings.",
      },
      {
        status:
          500,
      },
    );
  }
}