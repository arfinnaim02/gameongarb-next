import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  renderNotificationEmail,
  renderNotificationSms,
} from "@/lib/notifications/templates";

import type {
  NotificationProviders,
} from "@/lib/notifications/providers";

import type {
  QueueNotificationInput,
} from "@/lib/notifications/types";

/* =========================================================
   RETRY POLICY
   ========================================================= */

const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
];

function retryTime(
  attempts:
    number,
) {
  const index =
    Math.max(
      0,
      Math.min(
        RETRY_DELAYS_MS.length -
          1,
        attempts -
          1,
      ),
    );

  return new Date(
    Date.now() +
      RETRY_DELAYS_MS[
        index
      ],
  );
}

/* =========================================================
   QUEUE
   ========================================================= */

export async function queueNotification(
  input:
    QueueNotificationInput,
) {
  const maxAttempts =
    Math.max(
      1,
      Math.min(
        10,
        input.maxAttempts ??
          3,
      ),
    );

  try {
    return await db.notificationDelivery
      .create({
        data: {
          event:
            input.event,

          channel:
            input.channel,

          recipient:
            input.recipient.trim(),

          subject:
            input.subject ??
            null,

          orderId:
            input.orderId ??
            null,

          userId:
            input.userId ??
            null,

          idempotencyKey:
            input.idempotencyKey,

          payload:
            input.payload ??
            Prisma.JsonNull,

          maxAttempts,
        },
      });
  } catch (
    error
  ) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code ===
        "P2002"
    ) {
      const existing =
        await db.notificationDelivery
          .findUnique({
            where: {
              idempotencyKey:
                input.idempotencyKey,
            },
          });

      if (
        existing
      ) {
        return existing;
      }
    }

    throw error;
  }
}

/* =========================================================
   CLAIM DELIVERY
   ========================================================= */

async function claimDelivery(
  id:
    string,
) {
  const now =
    new Date();

  const delivery =
    await db.notificationDelivery
      .findUnique({
        where: {
          id,
        },
      });

  if (
    !delivery
  ) {
    return null;
  }

  if (
    delivery.status ===
      NotificationStatus.SENT ||
    delivery.status ===
      NotificationStatus.SKIPPED ||
    delivery.status ===
      NotificationStatus.PROCESSING
  ) {
    return null;
  }

  if (
    delivery.attempts >=
    delivery.maxAttempts
  ) {
    return null;
  }

  if (
    delivery.nextAttemptAt &&
    delivery.nextAttemptAt >
      now
  ) {
    return null;
  }

  const claimed =
    await db.notificationDelivery
      .updateMany({
        where: {
          id:
            delivery.id,

          status: {
            in: [
              NotificationStatus.PENDING,
              NotificationStatus.FAILED,
            ],
          },

          attempts: {
            lt:
              delivery.maxAttempts,
          },
        },

        data: {
          status:
            NotificationStatus.PROCESSING,

          lastAttemptAt:
            now,

          attempts: {
            increment:
              1,
          },
        },
      });

  if (
    claimed.count !==
    1
  ) {
    return null;
  }

  return db.notificationDelivery
    .findUnique({
      where: {
        id:
          delivery.id,
      },
    });
}

/* =========================================================
   PROCESS DELIVERY
   ========================================================= */

export async function processNotificationDelivery(
  id:
    string,

  providers:
    NotificationProviders,
) {
  const delivery =
    await claimDelivery(
      id,
    );

  if (
    !delivery
  ) {
    return null;
  }

  try {
    let result;

    if (
      delivery.channel ===
      NotificationChannel.EMAIL
    ) {
      if (
        !providers.email
      ) {
        throw new Error(
          "Email provider is not configured.",
        );
      }

      result =
        await providers.email.send(
          renderNotificationEmail(
            delivery,
          ),
        );
    } else if (
      delivery.channel ===
      NotificationChannel.SMS
    ) {
      if (
        !providers.sms
      ) {
        throw new Error(
          "SMS provider is not configured.",
        );
      }

      result =
        await providers.sms.send(
          renderNotificationSms(
            delivery,
          ),
        );
    } else {
      throw new Error(
        `Unsupported notification channel: ${delivery.channel}`,
      );
    }

    return await db.notificationDelivery
      .update({
        where: {
          id:
            delivery.id,
        },

        data: {
          status:
            NotificationStatus.SENT,

          provider:
            result.provider,

          providerMessageId:
            result.messageId,

          sentAt:
            new Date(),

          nextAttemptAt:
            null,

          lastError:
            null,
        },
      });
  } catch (
    error
  ) {
    const message =
      error instanceof
        Error
        ? error.message
        : "Notification delivery failed.";

    const exhausted =
      delivery.attempts >=
      delivery.maxAttempts;

    return db.notificationDelivery
      .update({
        where: {
          id:
            delivery.id,
        },

        data: {
          status:
            NotificationStatus.FAILED,

          lastError:
            message.slice(
              0,
              1000,
            ),

          nextAttemptAt:
            exhausted
              ? null
              : retryTime(
                  delivery.attempts,
                ),
        },
      });
  }
}

/* =========================================================
   MARK SKIPPED
   ========================================================= */

export async function skipNotification(
  id:
    string,

  reason:
    string,
) {
  return db.notificationDelivery
    .update({
      where: {
        id,
      },

      data: {
        status:
          NotificationStatus.SKIPPED,

        lastError:
          reason.slice(
            0,
            1000,
          ),

        nextAttemptAt:
          null,
      },
    });
}