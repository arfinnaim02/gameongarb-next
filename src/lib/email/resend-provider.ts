import {
  Resend,
} from "resend";

import type {
  NotificationEmailProvider,
} from "@/lib/notifications/providers";

import type {
  EmailMessage,
  NotificationSendResult,
} from "@/lib/notifications/types";

/* =========================================================
   RESEND EMAIL PROVIDER
   ========================================================= */

export class ResendNotificationEmailProvider
  implements
    NotificationEmailProvider
{
  readonly name =
    "resend";

  private readonly resend:
    Resend;

  private readonly from:
    string;

  private readonly replyTo?:
    string;

  constructor({
    apiKey,
    from,
    replyTo,
  }: {
    apiKey:
      string;

    from:
      string;

    replyTo?:
      string;
  }) {
    if (
      !apiKey.trim()
    ) {
      throw new Error(
        "RESEND_API_KEY is missing.",
      );
    }

    if (
      !from.trim()
    ) {
      throw new Error(
        "EMAIL_FROM is missing.",
      );
    }

    this.resend =
      new Resend(
        apiKey,
      );

    this.from =
      from.trim();

    this.replyTo =
      replyTo?.trim() ||
      undefined;
  }

  async send(
    message:
      EmailMessage,
  ): Promise<
    NotificationSendResult
  > {
    const {
      data,
      error,
    } =
      await this.resend.emails.send({
        from:
          this.from,

        to: [
          message.to,
        ],

        subject:
          message.subject,

        html:
          message.html,

        text:
          message.text,

        ...(this.replyTo
          ? {
              replyTo:
                this.replyTo,
            }
          : {}),
      });

    if (
      error
    ) {
      throw new Error(
        `Resend email failed: ${
          error.message ??
          "Unknown provider error"
        }`,
      );
    }

    if (
      !data?.id
    ) {
      throw new Error(
        "Resend did not return an email ID.",
      );
    }

    return {
      provider:
        this.name,

      messageId:
        data.id,

      status:
        "queued",
    };
  }
}