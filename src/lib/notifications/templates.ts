import type {
  NotificationDelivery,
} from "@prisma/client";

import type {
  EmailMessage,
  SmsMessage,
} from "@/lib/notifications/types";

/* =========================================================
   TYPES
   ========================================================= */

type OrderItemPayload = {
  name?: string;
  sku?: string;
  size?: string | null;
  color?: string | null;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
};

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

function numberValue(
  value:
    unknown,
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : 0;
}

function formatMoney(
  value:
    unknown,
) {
  return `৳${numberValue(
    value,
  ).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    },
  )}`;
}

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
      "You have a new update from GameOn Garb.",
    );

  const paymentMethod =
    textValue(
      payload.paymentMethod,
    );

  const paymentStatus =
    textValue(
      payload.paymentStatus,
    );

  const shippingAddress =
    textValue(
      payload.shippingAddress,
    );

  const subtotal =
    numberValue(
      payload.subtotal,
    );

  const discount =
    numberValue(
      payload.discount,
    );

  const deliveryCharge =
    numberValue(
      payload.deliveryCharge,
    );

  const total =
    numberValue(
      payload.total,
    );

  const items =
    Array.isArray(
      payload.items,
    )
      ? (
          payload.items as OrderItemPayload[]
        )
      : [];

  const subject =
    delivery.subject ??
    (
      orderNumber
        ? `GameOn Garb — ${orderNumber}`
        : "GameOn Garb Notification"
    );

  const itemRows =
    items
      .map(
        (
          item,
        ) => {
          const name =
            textValue(
              item.name,
              "Product",
            );

          const meta =
            [
              item.color,
              item.size,
              item.sku,
            ]
              .filter(
                Boolean,
              )
              .map(
                (
                  value,
                ) =>
                  escapeHtml(
                    String(
                      value,
                    ),
                  ),
              )
              .join(
                " · ",
              );

          const quantity =
            numberValue(
              item.quantity,
            );

          const lineTotal =
            numberValue(
              item.lineTotal,
            );

          return `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #eceee9;">
                <div style="font-size:14px;font-weight:700;color:#161918;">
                  ${escapeHtml(
                    name,
                  )}
                </div>

                ${
                  meta
                    ? `
                      <div style="margin-top:5px;font-size:12px;color:#777c77;">
                        ${meta}
                      </div>
                    `
                    : ""
                }

                <div style="margin-top:5px;font-size:12px;color:#777c77;">
                  Qty: ${quantity}
                  ·
                  ${formatMoney(
                    item.unitPrice,
                  )} each
                </div>
              </td>

              <td align="right" style="padding:14px 0;border-bottom:1px solid #eceee9;font-size:14px;font-weight:700;color:#161918;white-space:nowrap;">
                ${formatMoney(
                  lineTotal,
                )}
              </td>
            </tr>
          `;
        },
      )
      .join(
        "",
      );

  const textItems =
    items
      .map(
        (
          item,
        ) =>
          `${textValue(
            item.name,
            "Product",
          )} × ${numberValue(
            item.quantity,
          )} — ${formatMoney(
            item.lineTotal,
          )}`,
      )
      .join(
        "\n",
      );

  const text = [
    `Hi ${customerName},`,
    "",
    message,
    "",
    orderNumber
      ? `Order: ${orderNumber}`
      : "",
    "",
    textItems,
    "",
    `Subtotal: ${formatMoney(
      subtotal,
    )}`,
    discount >
    0
      ? `Discount: -${formatMoney(
          discount,
        )}`
      : "",
    `Delivery: ${formatMoney(
      deliveryCharge,
    )}`,
    `Total: ${formatMoney(
      total,
    )}`,
    "",
    paymentMethod
      ? `Payment method: ${paymentMethod}`
      : "",
    paymentStatus
      ? `Payment status: ${paymentStatus}`
      : "",
    "",
    shippingAddress
      ? `Delivery address: ${shippingAddress}`
      : "",
    "",
    "GameOn Garb",
    "Experience The Thrill",
  ]
    .filter(
      Boolean,
    )
    .join(
      "\n",
    );

  const html = `
    <!doctype html>

    <html>
      <body style="margin:0;padding:0;background:#f3f4f1;font-family:Arial,Helvetica,sans-serif;color:#161918;">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f1;padding:32px 14px;">
          <tr>
            <td align="center">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;background:#ffffff;border:1px solid #e5e7e2;border-radius:12px;overflow:hidden;">

                <tr>
                  <td style="padding:26px 30px;background:#111412;color:#ffffff;">
                    <div style="font-size:20px;font-weight:900;letter-spacing:1px;">
                      GameOn Garb
                    </div>

                    <div style="margin-top:5px;font-size:11px;color:#b8bdb9;text-transform:uppercase;letter-spacing:1.4px;">
                      Experience The Thrill
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px 30px;">

                    <div style="font-size:14px;color:#777c77;">
                      Hi ${escapeHtml(
                        customerName,
                      )},
                    </div>

                    <h1 style="margin:10px 0 8px;font-size:24px;line-height:1.25;color:#161918;">
                      ${escapeHtml(
                        message,
                      )}
                    </h1>

                    ${
                      orderNumber
                        ? `
                          <div style="margin-top:18px;padding:15px 17px;background:#fff3ed;border-left:4px solid #ff5a16;border-radius:6px;">
                            <div style="font-size:11px;color:#8b5d48;text-transform:uppercase;letter-spacing:1px;">
                              Order Number
                            </div>

                            <div style="margin-top:4px;font-size:18px;font-weight:800;color:#161918;">
                              ${escapeHtml(
                                orderNumber,
                              )}
                            </div>
                          </div>
                        `
                        : ""
                    }

                    ${
                      items.length
                        ? `
                          <div style="margin-top:30px;">
                            <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:#555b56;">
                              Order Summary
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:10px;">
                              ${itemRows}
                            </table>
                          </div>
                        `
                        : ""
                    }

                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;font-size:14px;">

                      <tr>
                        <td style="padding:6px 0;color:#686d69;">
                          Subtotal
                        </td>

                        <td align="right" style="padding:6px 0;font-weight:600;">
                          ${formatMoney(
                            subtotal,
                          )}
                        </td>
                      </tr>

                      ${
                        discount >
                        0
                          ? `
                            <tr>
                              <td style="padding:6px 0;color:#686d69;">
                                Discount
                              </td>

                              <td align="right" style="padding:6px 0;font-weight:600;">
                                -${formatMoney(
                                  discount,
                                )}
                              </td>
                            </tr>
                          `
                          : ""
                      }

                      <tr>
                        <td style="padding:6px 0;color:#686d69;">
                          Delivery
                        </td>

                        <td align="right" style="padding:6px 0;font-weight:600;">
                          ${formatMoney(
                            deliveryCharge,
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:15px 0 4px;border-top:1px solid #e4e6e2;font-size:16px;font-weight:800;">
                          Total
                        </td>

                        <td align="right" style="padding:15px 0 4px;border-top:1px solid #e4e6e2;font-size:19px;font-weight:900;color:#ff5a16;">
                          ${formatMoney(
                            total,
                          )}
                        </td>
                      </tr>

                    </table>

                    ${
                      paymentMethod ||
                      shippingAddress
                        ? `
                          <div style="margin-top:28px;padding:18px;background:#f7f8f5;border-radius:8px;">

                            ${
                              paymentMethod
                                ? `
                                  <div style="font-size:12px;color:#7b807c;text-transform:uppercase;letter-spacing:.7px;">
                                    Payment
                                  </div>

                                  <div style="margin-top:4px;font-size:14px;font-weight:700;">
                                    ${escapeHtml(
                                      paymentMethod,
                                    )}
                                    ${
                                      paymentStatus
                                        ? ` · ${escapeHtml(
                                            paymentStatus,
                                          )}`
                                        : ""
                                    }
                                  </div>
                                `
                                : ""
                            }

                            ${
                              shippingAddress
                                ? `
                                  <div style="margin-top:${paymentMethod ? "18px" : "0"};font-size:12px;color:#7b807c;text-transform:uppercase;letter-spacing:.7px;">
                                    Delivery Address
                                  </div>

                                  <div style="margin-top:5px;font-size:14px;line-height:1.6;color:#333834;">
                                    ${escapeHtml(
                                      shippingAddress,
                                    )}
                                  </div>
                                `
                                : ""
                            }

                          </div>
                        `
                        : ""
                    }

                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 30px;background:#f7f8f5;color:#777c77;font-size:12px;line-height:1.6;">
                    GameOn Garb · Experience The Thrill
                    <br>
                    This is an automated transactional email regarding your order.
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
        "GameOn Garb:",
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