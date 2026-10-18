import {
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  processNotificationDelivery,
} from "@/lib/notifications/service";

import type {
  NotificationProviders,
} from "@/lib/notifications/providers";

/* =========================================================
   WORKER CONFIG
   ========================================================= */

const DEFAULT_BATCH_SIZE =
  20;

const MAX_BATCH_SIZE =
  50;

const STALE_PROCESSING_MS =
  10 * 60_000;

/* =========================================================
   RECOVER STALE PROCESSING JOBS
   ========================================================= */

async function recoverStaleProcessingJobs() {
  const staleBefore =
    new Date(
      Date.now() -
        STALE_PROCESSING_MS,
    );

  const staleJobs =
    await db.notificationDelivery.findMany({
      where: {
        status:
          NotificationStatus.PROCESSING,

        lastAttemptAt: {
          lte:
            staleBefore,
        },
      },

      select: {
        id:
          true,

        attempts:
          true,

        maxAttempts:
          true,
      },

      take:
        MAX_BATCH_SIZE,
    });

  let recovered =
    0;

  let exhausted =
    0;

  for (
    const job
    of staleJobs
  ) {
    if (
      job.attempts >=
      job.maxAttempts
    ) {
      await db.notificationDelivery.updateMany({
        where: {
          id:
            job.id,

          status:
            NotificationStatus.PROCESSING,
        },

        data: {
          status:
            NotificationStatus.FAILED,

          nextAttemptAt:
            null,

          lastError:
            "Notification processing was interrupted and the maximum number of attempts has been reached.",
        },
      });

      exhausted +=
        1;

      continue;
    }

    const result =
      await db.notificationDelivery.updateMany({
        where: {
          id:
            job.id,

          status:
            NotificationStatus.PROCESSING,
        },

        data: {
          status:
            NotificationStatus.FAILED,

          nextAttemptAt:
            new Date(),

          lastError:
            "Recovered after an interrupted notification processing attempt.",
        },
      });

    recovered +=
      result.count;
  }

  return {
    recovered,
    exhausted,
  };
}

/* =========================================================
   FIND DUE JOBS
   ========================================================= */

async function findDueNotificationIds(
  batchSize:
    number,

  providers:
    NotificationProviders,
) {
  const now =
    new Date();

  const channels: NotificationChannel[] =
    [];

  if (
    providers.email
  ) {
    channels.push(
      NotificationChannel.EMAIL,
    );
  }

  if (
    providers.sms
  ) {
    channels.push(
      NotificationChannel.SMS,
    );
  }

  if (
    channels.length ===
    0
  ) {
    return [];
  }

  const rows =
    await db.notificationDelivery.findMany({
      where: {
        channel: {
          in:
            channels,
        },

        attempts: {
          lt:
            10,
        },

        OR: [
          {
            status:
              NotificationStatus.PENDING,
          },

          {
            status:
              NotificationStatus.FAILED,

            nextAttemptAt: {
              lte:
                now,
            },
          },
        ],
      },

      orderBy: [
        {
          nextAttemptAt:
            "asc",
        },

        {
          createdAt:
            "asc",
        },
      ],

      select: {
        id:
          true,

        attempts:
          true,

        maxAttempts:
          true,
      },

      take:
        batchSize,
    });

  return rows
    .filter(
      (
        row,
      ) =>
        row.attempts <
        row.maxAttempts,
    )
    .map(
      (
        row,
      ) =>
        row.id,
    );
}

/* =========================================================
   PROCESS BATCH
   ========================================================= */

export async function processNotificationBatch({
  providers,
  batchSize = DEFAULT_BATCH_SIZE,
}: {
  providers:
    NotificationProviders;

  batchSize?:
    number;
}) {
  const safeBatchSize =
    Math.max(
      1,
      Math.min(
        MAX_BATCH_SIZE,
        Math.floor(
          batchSize,
        ),
      ),
    );

  const recovery =
    await recoverStaleProcessingJobs();

  const ids =
    await findDueNotificationIds(
      safeBatchSize,
      providers,
    );

  let processed =
    0;

  let sent =
    0;

  let failed =
    0;

  let skipped =
    0;

  for (
    const id
    of ids
  ) {
    try {
      const result =
        await processNotificationDelivery(
          id,
          providers,
        );

      if (
        !result
      ) {
        skipped +=
          1;

        continue;
      }

      processed +=
        1;

      if (
        result.status ===
        NotificationStatus.SENT
      ) {
        sent +=
          1;
      } else if (
        result.status ===
        NotificationStatus.FAILED
      ) {
        failed +=
          1;
      } else {
        skipped +=
          1;
      }
    } catch (
      error
    ) {
      failed +=
        1;

      console.error(
        "Notification worker job failed:",
        {
          notificationId:
            id,

          error,
        },
      );
    }
  }

  return {
    selected:
      ids.length,

    processed,

    sent,

    failed,

    skipped,

    recovered:
      recovery.recovered,

    exhaustedRecovered:
      recovery.exhausted,
  };
}