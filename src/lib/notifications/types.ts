import type {
  NotificationChannel,
  NotificationEvent,
} from "@prisma/client";

import type {
  Prisma,
} from "@prisma/client";

export type NotificationPayload =
  Prisma.InputJsonValue;

export type QueueNotificationInput = {
  event:
    NotificationEvent;

  channel:
    NotificationChannel;

  recipient:
    string;

  subject?:
    string | null;

  orderId?:
    string | null;

  userId?:
    string | null;

  payload?:
    NotificationPayload;

  idempotencyKey:
    string;

  maxAttempts?:
    number;
};

export type NotificationSendResult = {
  provider:
    string;

  messageId:
    string;

  status:
    "sent" | "queued";
};

export type EmailMessage = {
  to:
    string;

  subject:
    string;

  html:
    string;

  text:
    string;
};

export type SmsMessage = {
  to:
    string;

  message:
    string;
};