import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  UploadApiResponse,
} from "cloudinary";

import { requireAdminApi } from "@/lib/admin-api-auth";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
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

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const variant =
      formData.get(
        "variant",
      );

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
            "Image must be 8MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    const bytes =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    const folder =
      variant === "mobile"
        ? "game-on-garb/homepage/hero/mobile"
        : "game-on-garb/homepage/hero/desktop";

    const result =
      await new Promise<UploadApiResponse>(
        (
          resolve,
          reject,
        ) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder,

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
                uploaded,
              ) => {
                if (
                  error ||
                  !uploaded
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
                  uploaded,
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
            result.secure_url,

          publicId:
            result.public_id,

          width:
            result.width,

          height:
            result.height,

          format:
            result.format,

          bytes:
            result.bytes,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Hero upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to upload hero image.",
      },
      {
        status: 500,
      },
    );
  }
}