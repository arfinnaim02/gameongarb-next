import {
  NextResponse,
} from "next/server";

import {
  getBkashAccessToken,
} from "@/lib/payments/bkash/client";

export const dynamic =
  "force-dynamic";

export async function GET() {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    return NextResponse.json(
      {
        error:
          "Not available in production.",
      },
      {
        status:
          404,
      },
    );
  }

  try {
    const token =
      await getBkashAccessToken();

    return NextResponse.json({
      ok:
        true,

      tokenReceived:
        Boolean(
          token,
        ),

      /*
       * Never return the actual token.
       */
      message:
        "bKash Grant Token received successfully.",
    });
  } catch (
    error
  ) {
    console.error(
      "bKash token test failed:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "bKash token test failed.",
      },
      {
        status:
          500,
      },
    );
  }
}