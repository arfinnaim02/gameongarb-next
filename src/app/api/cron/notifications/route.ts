import {
  NextResponse,
} from "next/server";

import {
  getNotificationProviders,
} from "@/lib/notifications/runtime";

import {
  processNotificationBatch,
} from "@/lib/notifications/worker";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* =========================================================
   AUTH
   ========================================================= */

function authorized(
  request:
    Request,
) {
  const secret =
    process.env
      .CRON_SECRET;

  if (
    !secret
  ) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  return (
    authorization ===
    `Bearer ${secret}`
  );
}

/* =========================================================
   WORKER
   ========================================================= */

export async function GET(
  request:
    Request,
) {
  if (
    !authorized(
      request,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status:
          401,
      },
    );
  }

  /*
   * Keep production processing disabled
   * until real providers have been
   * configured and tested.
   */
  if (
    process.env.NODE_ENV ===
      "production" &&
    process.env
      .NOTIFICATION_WORKER_ENABLED !==
      "true"
  ) {
    return NextResponse.json({
      ok:
        true,

      enabled:
        false,

      message:
        "Notification worker is disabled.",
    });
  }

  try {
    const result =
      await processNotificationBatch({
        providers:
          getNotificationProviders(),

        batchSize:
          20,
      });

    return NextResponse.json({
      ok:
        true,

      enabled:
        true,

      ...result,
    });
  } catch (
    error
  ) {
    console.error(
      "Notification worker failed:",
      error,
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Notification worker failed.",
      },
      {
        status:
          500,
      },
    );
  }
}