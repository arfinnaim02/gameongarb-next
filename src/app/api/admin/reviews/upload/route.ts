import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  UploadApiResponse,
} from "cloudinary";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  cloudinary,
} from "@/lib/cloudinary";

export const runtime =
  "nodejs";

const MAX_FILE_SIZE =
  6 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);

export async function POST(
  request:
    NextRequest,
) {
  const admin =
    await requireAdminApi();

  if (
    !admin ||
    !hasPermission(
      admin.role,
      "reviews",
    )
  ) {
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
    const formData =
      await request.formData();

    const file =
      formData.get(
        "file",
      );

    if (
      !(file instanceof
        File)
    ) {
      return NextResponse.json(
        {
          error:
            "Image file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_TYPES.has(
        file.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WEBP and AVIF images are allowed.",
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
            "Image must be 6MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    const bytes =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(
        bytes,
      );

    const uploaded =
      await new Promise<UploadApiResponse>(
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
                        "Upload failed.",
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

    return NextResponse.json(
      {
        image: {
          url:
            uploaded.secure_url,

          publicId:
            uploaded.public_id,
        },
      },
      {
        status: 201,
      },
    );
  } catch (
    error
  ) {
    console.error(
      "Review image upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to upload review image.",
      },
      {
        status: 500,
      },
    );
  }
}
