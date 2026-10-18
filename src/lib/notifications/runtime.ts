import {
  mockNotificationProviders,
} from "@/lib/notifications/providers";

import type {
  NotificationProviders,
} from "@/lib/notifications/providers";

import {
  ResendNotificationEmailProvider,
} from "@/lib/email/resend-provider";

/* =========================================================
   REAL EMAIL PROVIDER
   ========================================================= */

function getProductionEmailProvider() {
  const apiKey =
    process.env
      .RESEND_API_KEY;

  const from =
    process.env
      .EMAIL_FROM;

  const replyTo =
    process.env
      .EMAIL_REPLY_TO;

  if (
    !apiKey ||
    !from
  ) {
    return undefined;
  }

  return new ResendNotificationEmailProvider({
    apiKey,
    from,
    replyTo,
  });
}

/* =========================================================
   RUNTIME PROVIDERS
   ========================================================= */

export function getNotificationProviders():
  NotificationProviders {
  const realEmail =
    getProductionEmailProvider();

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return {
      email:
        realEmail,

      /*
       * SMS remains disabled until
       * the real SMS provider is added.
       */
      sms:
        undefined,
    };
  }

  return {
    email:
      realEmail ??
      mockNotificationProviders.email,

    sms:
      mockNotificationProviders.sms,
  };
}