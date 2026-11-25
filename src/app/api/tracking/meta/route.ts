import {
  NextResponse,
} from "next/server";

import {
  z,
} from "zod";

import {
  getMetaRequestContext,
  sendMetaServerEvent,
} from "@/lib/meta-capi";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const schema =
  z.object({
    pixelId:
      z
        .string()
        .regex(
          /^\d+$/,
        ),

    eventName:
      z.enum([
        "PageView",
        "ViewContent",
        "Search",
        "AddToCart",
        "InitiateCheckout",
      ]),

    eventId:
      z
        .string()
        .min(8)
        .max(200),

    eventSourceUrl:
      z
        .string()
        .url()
        .max(2000),

    customData:
      z
        .record(
          z.string(),
          z.unknown(),
        )
        .optional(),

    customerData:
      z
        .object({
          email:
            z
              .string()
              .max(320)
              .nullable()
              .optional(),

          phone:
            z
              .string()
              .max(50)
              .nullable()
              .optional(),

          firstName:
            z
              .string()
              .max(100)
              .nullable()
              .optional(),

          lastName:
            z
              .string()
              .max(100)
              .nullable()
              .optional(),

          city:
            z
              .string()
              .max(100)
              .nullable()
              .optional(),

          country:
            z
              .string()
              .max(10)
              .nullable()
              .optional(),

          externalId:
            z
              .string()
              .max(200)
              .nullable()
              .optional(),
        })
        .optional(),
  });

function isSameOrigin(
  request:
    Request,
) {
  const origin =
    request.headers.get(
      "origin",
    );

  if (
    !origin
  ) {
    return false;
  }

  const requestUrl =
    new URL(
      request.url,
    );

  try {
    const originUrl =
      new URL(
        origin,
      );

    return (
      originUrl.hostname ===
      requestUrl.hostname
    );
  } catch {
    return false;
  }
}

export async function POST(
  request:
    Request,
) {
  try {
    if (
      !isSameOrigin(
        request,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden.",
        },
        {
          status:
            403,
        },
      );
    }

    const input =
      schema.parse(
        await request.json(),
      );

    const configuredPixelId =
      process.env
        .META_CAPI_PIXEL_ID
        ?.trim() ??
      "";

    if (
      !configuredPixelId ||
      input.pixelId !==
        configuredPixelId
    ) {
      return NextResponse.json(
        {
          received:
            true,

          capi:
            false,
        },
        {
          status:
            202,
        },
      );
    }

    const result =
      await sendMetaServerEvent({
        eventName:
          input.eventName,

        eventId:
          input.eventId,

        eventSourceUrl:
          input.eventSourceUrl,

        customData:
          input.customData,

        customerData:
          input.customerData,

        context:
          getMetaRequestContext(
            request,
          ),
      });

    return NextResponse.json(
      {
        received:
          true,

        capi:
          result.sent,
      },
      {
        status:
          202,
      },
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid tracking event.",
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Meta tracking endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        received:
          true,

        capi:
          false,
      },
      {
        status:
          202,
      },
    );
  }
}
