import {
  mockNotificationProviders,
} from "@/lib/notifications/providers";

import type {
  NotificationProviders,
} from "@/lib/notifications/providers";

/* =========================================================
   RUNTIME PROVIDERS
   ========================================================= */

export function getNotificationProviders():
  NotificationProviders {
  /*
   * Production providers will be connected
   * in the next phase.
   *
   * Never allow mock providers to silently
   * send in production.
   */
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return {};
  }

  return mockNotificationProviders;
}