import {
  NextResponse,
} from "next/server";

import {
  revalidatePath,
} from "next/cache";

import {
  z,
} from "zod";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

const adminReviewSchema =
  z.object({
    id:
      z.string().optional(),

    customerName:
      z.string().trim().min(2).max(100),

    customerEmail:
      z.string().trim().email().optional().or(z.literal("")),

    customerPhone:
      z.string().trim().max(30).optional().or(z.literal("")),

    rating:
      z.coerce.number().int().min(1).max(5),

    title:
      z.string().trim().max(120).optional().or(z.literal("")),

    body:
      z.string().trim().min(5).max(1500),

    productId:
      z.string().optional().or(z.literal("")),

    orderId:
      z.string().optional().or(z.literal("")),

    status:
      z.enum([
        "PENDING",
        "APPROVED",
        "REJECTED",
      ]),

    featured:
      z.boolean().default(false),

    verifiedPurchase:
      z.boolean().default(false),

    sortOrder:
      z.coerce.number().int().min(0).max(100000).default(0),

    images:
      z
        .array(
          z.object({
            url:
              z.string().url(),

            publicId:
              z.string().optional().nullable(),
          }),
        )
        .max(3)
        .default([]),
  });

function serialize(
  review:
    any,
) {
  return {
    id:
      review.id,

    customerName:
      review.customerName,

    customerEmail:
      review.customerEmail ??
      "",

    customerPhone:
      review.customerPhone ??
      "",

    rating:
      review.rating,

    title:
      review.title ??
      "",

    body:
      review.body ??
      "",

    productId:
      review.productId ??
      "",

    productName:
      review.product?.name ??
      "",

    orderId:
      review.orderId ??
      "",

    orderNumber:
      review.order?.number ??
      "",

    status:
      review.status,

    source:
      review.source,

    featured:
      review.featured,

    verifiedPurchase:
      review.verifiedPurchase,

    sortOrder:
      review.sortOrder,

    images:
      review.images.map(
        (
          image:
            any,
        ) => ({
          id:
            image.id,

          url:
            image.url,

          publicId:
            image.publicId,
        }),
      ),

    createdAt:
      review.createdAt.toISOString(),

    updatedAt:
      review.updatedAt.toISOString(),
  };
}

async function guard() {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "reviews",
    )
  ) {
    return null;
  }

  return admin;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/reviews");
}

export async function GET() {
  const admin =
    await guard();

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

  const reviews =
    await db.review.findMany({
      orderBy: [
        {
          createdAt:
            "desc",
        },
      ],

      include: {
        product: {
          select: {
            name:
              true,
          },
        },

        order: {
          select: {
            number:
              true,
          },
        },

        images: {
          orderBy: {
            sortOrder:
              "asc",
          },
        },
      },
    });

  return NextResponse.json({
    reviews:
      reviews.map(
        serialize,
      ),
  });
}

export async function POST(
  request:
    Request,
) {
  const admin =
    await guard();

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

  try {
    const input =
      adminReviewSchema.parse(
        await request.json(),
      );

    const review =
      await db.review.create({
        data: {
          customerName:
            input.customerName,

          customerEmail:
            input.customerEmail ||
            null,

          customerPhone:
            input.customerPhone ||
            null,

          rating:
            input.rating,

          title:
            input.title ||
            null,

          body:
            input.body,

          productId:
            input.productId ||
            null,

          orderId:
            input.orderId ||
            null,

          status:
            input.status,

          source:
            "ADMIN",

          approved:
            input.status ===
            "APPROVED",

          featured:
            input.featured,

          verifiedPurchase:
            input.verifiedPurchase,

          sortOrder:
            input.sortOrder,

          images: {
            create:
              input.images.map(
                (
                  image,
                  index,
                ) => ({
                  url:
                    image.url,

                  publicId:
                    image.publicId ??
                    null,

                  sortOrder:
                    index,
                }),
              ),
          },
        },

        include: {
          product: {
            select: {
              name:
                true,
            },
          },

          order: {
            select: {
              number:
                true,
            },
          },

          images:
            true,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "REVIEW_CREATED",

        entityType:
          "Review",

        entityId:
          review.id,
      },
    });

    refresh();

    return NextResponse.json(
      {
        review:
          serialize(
            review,
          ),
      },
      {
        status: 201,
      },
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to create review.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function PATCH(
  request:
    Request,
) {
  const admin =
    await guard();

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

  try {
    const input =
      adminReviewSchema
        .extend({
          id:
            z.string().min(1),
        })
        .parse(
          await request.json(),
        );

    const previous =
      await db.review.findUnique({
        where: {
          id:
            input.id,
        },

        include: {
          images:
            true,

          product: {
            select: {
              slug:
                true,
            },
          },
        },
      });

    if (!previous) {
      return NextResponse.json(
        {
          error:
            "Review not found.",
        },
        {
          status: 404,
        },
      );
    }

    await db.reviewImage.deleteMany({
      where: {
        reviewId:
          input.id,
      },
    });

    const review =
      await db.review.update({
        where: {
          id:
            input.id,
        },

        data: {
          customerName:
            input.customerName,

          customerEmail:
            input.customerEmail ||
            null,

          customerPhone:
            input.customerPhone ||
            null,

          rating:
            input.rating,

          title:
            input.title ||
            null,

          body:
            input.body,

          productId:
            input.productId ||
            null,

          orderId:
            input.orderId ||
            null,

          status:
            input.status,

          approved:
            input.status ===
            "APPROVED",

          featured:
            input.featured,

          verifiedPurchase:
            input.verifiedPurchase,

          sortOrder:
            input.sortOrder,

          images: {
            create:
              input.images.map(
                (
                  image,
                  index,
                ) => ({
                  url:
                    image.url,

                  publicId:
                    image.publicId ??
                    null,

                  sortOrder:
                    index,
                }),
              ),
          },
        },

        include: {
          product: {
            select: {
              name:
                true,
            },
          },

          order: {
            select: {
              number:
                true,
            },
          },

          images:
            true,
        },
      });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "REVIEW_UPDATED",

        entityType:
          "Review",

        entityId:
          review.id,

        metadata: {
          status:
            review.status,

          featured:
            review.featured,
        },
      },
    });

    refresh();

    if (
      previous.product?.slug
    ) {
      revalidatePath(
        `/product/${previous.product.slug}`,
      );
    }

    return NextResponse.json({
      review:
        serialize(
          review,
        ),
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to update review.",
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  request:
    Request,
) {
  const admin =
    await guard();

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

  try {
    const {
      id,
    } =
      z
        .object({
          id:
            z.string().min(1),
        })
        .parse(
          await request.json(),
        );

    await db.review.delete({
      where: {
        id,
      },
    });

    await db.activityLog.create({
      data: {
        actorId:
          admin.id,

        action:
          "REVIEW_DELETED",

        entityType:
          "Review",

        entityId:
          id,
      },
    });

    refresh();

    return NextResponse.json({
      message:
        "Review deleted.",
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to delete review.",
      },
      {
        status: 400,
      },
    );
  }
}
