import {
  NextResponse,
} from "next/server";

import type {
  UploadApiResponse,
} from "cloudinary";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  cloudinary,
} from "@/lib/cloudinary";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);

type RouteContext = {
  params: Promise<{
    type: string;
  }>;
};

function normalizeType(
  value: string,
) {
  const normalized =
    value.toLowerCase();

  if (
    normalized ===
      "sports" ||
    normalized ===
      "polo"
  ) {
    return normalized;
  }

  return null;
}

export async function POST(
  request: Request,
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

    const campaign =
      normalizeType(type);

    if (!campaign) {
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

    const formData =
      await request.formData();

    const file =
      formData.get(
        "file",
      );

    const variant =
      formData.get(
        "variant",
      ) === "mobile"
        ? "mobile"
        : "desktop";

    if (
      !(file instanceof File)
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
            "Only JPG, PNG, WebP and AVIF images are allowed.",
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
            "Image must be 8MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    const buffer =
      Buffer.from(
        await file.arrayBuffer(),
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
                  `game-on-garb/homepage/${campaign}/${variant}`,

                resource_type:
                  "image",

                overwrite:
                  false,

                unique_filename:
                  true,

                use_filename:
                  false,

                transformation:
                  [
                    {
                      quality:
                        "auto",

                      fetch_format:
                        "auto",
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

          width:
            uploaded.width,

          height:
            uploaded.height,

          format:
            uploaded.format,

          bytes:
            uploaded.bytes,

          variant,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Homepage campaign upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload campaign image.",
      },
      {
        status: 500,
      },
    );
  }
}