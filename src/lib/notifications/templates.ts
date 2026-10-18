import type {
  NotificationDelivery,
} from "@prisma/client";

import type {
  EmailMessage,
  SmsMessage,
} from "@/lib/notifications/types";

/* =========================================================
   HELPERS
   ========================================================= */

function payloadRecord(
  value:
    unknown,
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return {} as Record<
      string,
      unknown
    >;
  }

  return value as Record<
    string,
    unknown
  >;
}

function textValue(
  value:
    unknown,
  fallback =
    "",
) {
  return typeof value ===
    "string"
    ? value
    : fallback;
}

/* =========================================================
   EMAIL TEMPLATE
   ========================================================= */

export function renderNotificationEmail(
  delivery:
    NotificationDelivery,
):
  EmailMessage {
  const payload =
    payloadRecord(
      delivery.payload,
    );

  const customerName =
    textValue(
      payload.customerName,
      "Customer",
    );

  const orderNumber =
    textValue(
      payload.orderNumber,
    );

  const message =
    textValue(
      payload.message,
      "You have a new update from Game On Garb.",
    );

  const subject =
    delivery.subject ??
    (
      orderNumber
        ? `Game On Garb — ${orderNumber}`
        : "Game On Garb Notification"
    );

  const text = [
    `Hi ${customerName},`,
    "",
    message,
    orderNumber
      ? `Order: ${orderNumber}`
      : "",
    "",
    "Game On Garb",
    "Experience The Thrill",
  ]
    .filter(
      Boolean,
    )
    .join(
      "\n",
    );

  const html =
    `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f1;font-family:Arial,Helvetica,sans-serif;color:#161918;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f4f1;padding:32px 16px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;background:#ffffff;border:1px solid #e7e8e4;">
                  <tr>
                    <td style="padding:24px 28px;background:#111412;color:#ffffff;font-size:18px;font-weight:800;">
                      GAME ON GARB
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:32px 28px;">
                      <p style="margin:0 0 16px;font-size:16px;">
                        Hi ${escapeHtml(
                          customerName,
                        )},
                      </p>

                      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4d524e;">
                        ${escapeHtml(
                          message,
                        )}
                      </p>

                      ${
                        orderNumber
                          ? `
                            <div style="padding:14px 16px;background:#f7f7f4;border-left:3px solid #ff5a16;">
                              <strong>Order ${escapeHtml(
                                orderNumber,
                              )}</strong>
                            </div>
                          `
                          : ""
                      }
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:18px 28px;background:#f7f7f4;color:#777c77;font-size:12px;">
                      Game On Garb · Experience The Thrill
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

  return {
    to:
      delivery.recipient,

    subject,

    html,

    text,
  };
}

/* =========================================================
   SMS TEMPLATE
   ========================================================= */

export function renderNotificationSms(
  delivery:
    NotificationDelivery,
):
  SmsMessage {
  const payload =
    payloadRecord(
      delivery.payload,
    );

  const orderNumber =
    textValue(
      payload.orderNumber,
    );

  const message =
    textValue(
      payload.message,
      "You have a new update.",
    );

  return {
    to:
      delivery.recipient,

    message:
      [
        "Game On Garb:",
        message,
        orderNumber
          ? `Order ${orderNumber}.`
          : "",
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        ),
  };
}

/* =========================================================
   HTML SAFETY
   ========================================================= */

function escapeHtml(
  value:
    string,
) {
  return value
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      '"',
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}