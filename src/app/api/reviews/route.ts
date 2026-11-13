import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  UploadApiResponse,
} from "cloudinary";

import {
  revalidatePath,
} from "next/cache";

import {
  cloudinary,
} from "@/lib/cloudinary";

import {
  db,
} from "@/lib/db";

import {
  reviewInputSchema,
  serializePublicReview,
} from "@/lib/reviews";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_IMAGES =
  3;

const MAX_FILE_SIZE =
  6 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);

const submissions =
  new Map<
    string,
    number[]
  >();

function requestIp(
  request:
    NextRequest,
) {
  return (
    request.headers
      .get(
        "x-forwarded-for",
      )
      ?.split(
        ",",
      )[0]
      ?.trim() ||
    request.headers.get(
      "x-real-ip",
    ) ||
    "unknown"
  );
}

function rateLimited(
  key:
    string,
) {
  const now =
    Date.now();

  const windowMs =
    60 *
    60 *
    1000;

  const recent =
    (
      submissions.get(
        key,
      ) ??
      []
    ).filter(
      (
        timestamp,
      ) =>
        now -
          timestamp <
        windowMs,
    );

  if (
    recent.length >=
    4
  ) {
    submissions.set(
      key,
      recent,
    );

    return true;
  }

  recent.push(
    now,
  );

  submissions.set(
    key,
    recent,
  );

  return false;
}

async function uploadImage(
  file:
    File,
) {
  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(
      bytes,
    );

  return new Promise<UploadApiResponse>(
    (
      resolve,
      reject,
    ) => {
      const stream =
        cloudinary.uploader.upload_stream(
          {
            folder:
              "game-on-garb/reviews",

            resource_type:
              "image",

            overwrite:
              false,

            unique_filename:
              true,

            use_filename:
              false,

            transformation: [
              {
                quality:
                  "auto",

                fetch_format:
                  "auto",

                width:
                  1400,

                height:
                  1400,

                crop:
                  "limit",
              },
            ],
          },

          (
            error,
            result,
          ) => {
            if (
              error ||
              !result
            ) {
              reject(
                error ??
                  new Error(
                    "Review image upload failed.",
                  ),
              );

              return;
            }

            resolve(
              result,
            );
          },
        );

      stream.end(
        buffer,
      );
    },
  );
}

export async function GET(
  request:
    NextRequest,
) {
  const productId =
    request.nextUrl.searchParams.get(
      "productId",
    );

  const reviews =
    await db.review.findMany({
      where: {
        status:
          "APPROVED",

        approved:
          true,

        ...(productId
          ? {
              productId,
            }
          : {}),
      },

      orderBy: [
        {
          featured:
            "desc",
        },

        {
          sortOrder:
            "asc",
        },

        {
          createdAt:
            "desc",
        },
      ],

      take:
        50,

      include: {
        product: {
          select: {
            name:
              true,

            slug:
              true,
          },
        },

        images: {
          orderBy: {
            sortOrder:
              "asc",
          },

          select: {
            id:
              true,

            url:
              true,
          },
        },
      },
    });

  return NextResponse.json({
    reviews:
      reviews.map(
        serializePublicReview,
      ),
  });
}

export async function POST(
  request:
    NextRequest,
) {
  try {
    const ip =
      requestIp(
        request,
      );

    if (
      rateLimited(
        ip,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Too many review submissions. Please try again later.",
        },
        {
          status: 429,
        },
      );
    }

    const formData =
      await request.formData();

    const input =
      reviewInputSchema.parse({
        customerName:
          formData.get(
            "customerName",
          ),

        customerEmail:
          formData.get(
            "customerEmail",
          ) ??
          "",

        customerPhone:
          formData.get(
            "customerPhone",
          ) ??
          "",

        rating:
          formData.get(
            "rating",
          ),

        title:
          formData.get(
            "title",
          ) ??
          "",

        body:
          formData.get(
            "body",
          ),

        productId:
          formData.get(
            "productId",
          ) ??
          "",

        orderNumber:
          formData.get(
            "orderNumber",
          ) ??
          "",
      });

    const files =
      formData
        .getAll(
          "images",
        )
        .filter(
          (
            item,
          ): item is File =>
            item instanceof
              File &&
            item.size >
              0,
        );

    if (
      files.length >
      MAX_IMAGES
    ) {
      return NextResponse.json(
        {
          error:
            "You can upload up to 3 review images.",
        },
        {
          status: 400,
        },
      );
    }

    for (
      const file
      of files
    ) {
      if (
        !ALLOWED_TYPES.has(
          file.type,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Review images must be JPG, PNG, WEBP or AVIF.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error:
              "Each review image must be 6MB or smaller.",
          },
          {
            status: 400,
          },
        );
      }
    }

    let product =
      null as
        | {
            id:
              string;
          }
        | null;

    if (
      input.productId
    ) {
      product =
        await db.product.findFirst({
          where: {
            id:
              input.productId,

            status:
              "ACTIVE",
          },

          select: {
            id:
              true,
          },
        });

      if (
        !product
      ) {
        return NextResponse.json(
          {
            error:
              "Selected product is unavailable.",
          },
          {
            status: 400,
          },
        );
      }
    }

    let order =
      null as
        | {
            id:
              string;
          }
        | null;

    let verifiedPurchase =
      false;

    if (
      input.orderNumber &&
      input.customerPhone
    ) {
      const matchedOrder =
        await db.order.findFirst({
          where: {
            number:
              input.orderNumber,

            phone:
              input.customerPhone,

            status: {
              in: [
                "CONFIRMED",
                "PACKING",
                "READY_TO_SHIP",
                "SHIPPED",
                "DELIVERED",
              ],
            },
          },

          select: {
            id:
              true,

            items: {
              select: {
                productId:
                  true,
              },
            },
          },
        });

      if (
        matchedOrder &&
        (
          !product ||
          matchedOrder.items.some(
            (
              item,
            ) =>
              item.productId ===
              product.id,
          )
        )
      ) {
        order = {
          id:
            matchedOrder.id,
        };

        verifiedPurchase =
          true;
      }
    }

    const uploads =
      await Promise.all(
        files.map(
          uploadImage,
        ),
      );

    const review =
      await db.review.create({
        data: {
          productId:
            product?.id ??
            null,

          orderId:
            order?.id ??
            null,

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

          status:
            "PENDING",

          source:
            "WEBSITE",

          approved:
            false,

          featured:
            false,

          verifiedPurchase,

          images: {
            create:
              uploads.map(
                (
                  upload,
                  index,
                ) => ({
                  url:
                    upload.secure_url,

                  publicId:
                    upload.public_id,

                  sortOrder:
                    index,
                }),
              ),
          },
        },

        include: {
          images:
            true,
        },
      });

    revalidatePath(
      "/",
    );

    revalidatePath(
      "/reviews",
    );

    if (
      input.productId
    ) {
      const linked =
        await db.product.findUnique({
          where: {
            id:
              input.productId,
          },

          select: {
            slug:
              true,
          },
        });

      if (
        linked
      ) {
        revalidatePath(
          `/product/${linked.slug}`,
        );
      }
    }

    return NextResponse.json(
      {
        id:
          review.id,

        message:
          "Thank you. Your review has been submitted for approval.",
      },
      {
        status: 201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Review submission error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to submit review.",
      },
      {
        status: 400,
      },
    );
  }
}
