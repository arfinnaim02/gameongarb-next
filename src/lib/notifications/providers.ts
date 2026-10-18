import type {
  EmailMessage,
  NotificationSendResult,
  SmsMessage,
} from "@/lib/notifications/types";

/* =========================================================
   PROVIDER CONTRACTS
   ========================================================= */

export interface NotificationEmailProvider {
  readonly name:
    string;

  send(
    message:
      EmailMessage,
  ): Promise<
    NotificationSendResult
  >;
}

export interface NotificationSmsProvider {
  readonly name:
    string;

  send(
    message:
      SmsMessage,
  ): Promise<
    NotificationSendResult
  >;
}

export type NotificationProviders = {
  email?:
    NotificationEmailProvider;

  sms?:
    NotificationSmsProvider;
};

/* =========================================================
   MOCK EMAIL PROVIDER
   ========================================================= */

export class MockNotificationEmailProvider
  implements
    NotificationEmailProvider
{
  readonly name =
    "mock-email";

  async send(
    message:
      EmailMessage,
  ): Promise<
    NotificationSendResult
  > {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "Mock email provider cannot be used in production.",
      );
    }

    console.info(
      "[MOCK EMAIL]",
      {
        to:
          message.to,

        subject:
          message.subject,
      },
    );

    return {
      provider:
        this.name,

      messageId:
        `mock-email-${Date.now()}`,

      status:
        "sent",
    };
  }
}

/* =========================================================
   MOCK SMS PROVIDER
   ========================================================= */

export class MockNotificationSmsProvider
  implements
    NotificationSmsProvider
{
  readonly name =
    "mock-sms";

  async send(
    message:
      SmsMessage,
  ): Promise<
    NotificationSendResult
  > {
    if (
      process.env.NODE_ENV ===
      "production"
    ) {
      throw new Error(
        "Mock SMS provider cannot be used in production.",
      );
    }

    console.info(
      "[MOCK SMS]",
      {
        to:
          message.to,

        message:
          message.message,
      },
    );

    return {
      provider:
        this.name,

      messageId:
        `mock-sms-${Date.now()}`,

      status:
        "sent",
    };
  }
}

export const mockNotificationProviders:
  NotificationProviders = {
  email:
    new MockNotificationEmailProvider(),

  sms:
    new MockNotificationSmsProvider(),
};