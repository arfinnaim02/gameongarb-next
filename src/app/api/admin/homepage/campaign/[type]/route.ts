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
  cloudinary,
} from "@/lib/cloudinary";

import {
  db,
} from "@/lib/db";

import {
  homepageCampaignUpdateSchema,
} from "@/lib/homepage-campaign-validation";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    type: string;
  }>;
};

type CampaignType =
  | "SPORTS"
  | "POLO";

type CampaignDefinition = {
  type: CampaignType;
  name: string;
  heading: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  sortOrder: number;
};

function getCampaignDefinition(
  value: string,
): CampaignDefinition | null {
  const normalized =
    value.toLowerCase();

  if (
    normalized ===
    "sports"
  ) {
    return {
      type: "SPORTS",
      name: "Sports",
      heading:
        "Built to move.",
      subtitle:
        "Performance for every day.",
      ctaLabel:
        "Explore Sports",
      ctaLink:
        "/shop?category=sports",
      sortOrder: 2,
    };
  }

  if (
    normalized ===
    "polo"
  ) {
    return {
      type: "POLO",
      name: "Polo",
      heading:
        "Made for every day.",
      subtitle:
        "Polished, relaxed and ready.",
      ctaLabel:
        "Explore Polo",
      ctaLink:
        "/shop?category=polo",
      sortOrder: 3,
    };
  }

  return null;
}

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

async function getCampaignSection(
  definition:
    CampaignDefinition,
) {
  let section =
    await db.homepageSection.findFirst({
      where: {
        type:
          definition.type,
      },
    });

  if (!section) {
    section =
      await db.homepageSection.create({
        data: {
          type:
            definition.type,

          name:
            definition.name,

          heading:
            definition.heading,

          subtitle:
            definition.subtitle,

          ctaLabel:
            definition.ctaLabel,

          ctaLink:
            definition.ctaLink,

          enabled: true,

          sortOrder:
            definition.sortOrder,
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
      "Homepage campaign image cleanup failed:",
      publicId,
      error,
    );
  }
}

export async function GET(
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

    const {
      type,
    } =
      await context.params;

    const definition =
      getCampaignDefinition(
        type,
      );

    if (!definition) {
      return NextResponse.json(
        {
          error:
            "Invalid homepage campaign.",
        },
        {
          status: 404,
        },
      );
    }

    const section =
      await getCampaignSection(
        definition,
      );

    return NextResponse.json({
      section,
    });
  } catch (error) {
    console.error(
      "Homepage campaign GET error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to load homepage campaign.",
      },
      {
        status: 500,
      },
    );
  }
}

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

    const {
      type,
    } =
      await context.params;

    const definition =
      getCampaignDefinition(
        type,
      );

    if (!definition) {
      return NextResponse.json(
        {
          error:
            "Invalid homepage campaign.",
        },
        {
          status: 404,
        },
      );
    }

    const current =
      await getCampaignSection(
        definition,
      );

    const parsed =
      homepageCampaignUpdateSchema.safeParse(
        await request.json(),
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign settings.",

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

                ...(input.mobileImage !==
                undefined
                  ? {
                      mobileImage:
                        input.mobileImage,
                    }
                  : {}),

                ...(input.mobileImagePublicId !==
                undefined
                  ? {
                      mobileImagePublicId:
                        nullable(
                          input.mobileImagePublicId,
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
                `HOMEPAGE_${definition.type}_UPDATED`,

              entityType:
                "HomepageSection",

              entityId:
                section.id,

              metadata: {
                type:
                  definition.type,

                heading:
                  section.heading,
              },
            },
          });

          return section;
        },
      );

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

    if (
      input.mobileImagePublicId !==
        undefined &&
      current.mobileImagePublicId &&
      current.mobileImagePublicId !==
        updated.mobileImagePublicId
    ) {
      await safelyDelete(
        current.mobileImagePublicId,
      );
    }

    revalidatePath("/");

    return NextResponse.json({
      section:
        updated,
    });
  } catch (error) {
    console.error(
      "Homepage campaign PATCH error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to save homepage campaign.",
      },
      {
        status: 500,
      },
    );
  }
}