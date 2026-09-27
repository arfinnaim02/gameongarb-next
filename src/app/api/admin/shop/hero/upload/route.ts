import { NextResponse } from "next/server";

import { cloudinary } from "@/lib/cloudinary";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE =
  8 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ]);

export async function POST(
  request: Request,
) {
  const admin =
    await requireAdminApi();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
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

    const variant =
      formData.get(
        "variant",
      ) === "mobile"
        ? "mobile"
        : "desktop";

    if (!(file instanceof File)) {
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
      MAX_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Image must be smaller than 8MB.",
        },
        {
          status: 400,
        },
      );
    }

    const bytes =
      Buffer.from(
        await file.arrayBuffer(),
      );

    const uploaded =
      await new Promise<{
        secure_url: string;
        public_id: string;
        width: number;
        height: number;
        format: string;
        bytes: number;
      }>(
        (
          resolve,
          reject,
        ) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder:
                  `game-on-garb/shop/hero/${variant}`,

                resource_type:
                  "image",

                overwrite:
                  false,
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
                  result as {
                    secure_url: string;
                    public_id: string;
                    width: number;
                    height: number;
                    format: string;
                    bytes: number;
                  },
                );
              },
            );

          stream.end(
            bytes,
          );
        },
      );

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    console.error(
      "Shop hero upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Image upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}