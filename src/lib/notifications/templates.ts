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
  image?: string | null;
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

function siteUrl() {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env
      .SITE_URL?.trim() ||
    "https://gameongarb-next.vercel.app"
  ).replace(
    /\/$/,
    "",
  );
}

function absoluteUrl(
  value:
    string,
) {
  if (
    /^https?:\/\//i.test(
      value,
    )
  ) {
    return value;
  }

  const normalized =
    value.startsWith(
      "/",
    )
      ? value
      : `/${value}`;

  return `${siteUrl()}${normalized}`;
}

function logoUrl() {
  const configured =
    process.env
      .EMAIL_LOGO_URL?.trim();

  return configured
    ? absoluteUrl(
        configured,
      )
    : absoluteUrl(
        "/images/brand/gameongarb-email-logo.png?v=20261101-clean1",
      );
}

function formatEventTitle(
  event:
    string,
) {
  switch (
    event
  ) {
    case "ORDER_PLACED":
      return {
        eyebrow:
          "ORDER RECEIVED",
        title:
          "Thank you for your order.",
        accent:
          "We’ve received your order and will review it shortly.",
      };

    case "ORDER_CONFIRMED":
      return {
        eyebrow:
          "ORDER CONFIRMED",
        title:
          "Your order is confirmed.",
        accent:
          "We’re preparing your Game On Garb order.",
      };

    case "ORDER_READY_TO_SHIP":
      return {
        eyebrow:
          "READY TO SHIP",
        title:
          "Your order is packed.",
        accent:
          "It’s ready to be handed over to the courier.",
      };

    case "ORDER_SHIPPED":
      return {
        eyebrow:
          "ON THE WAY",
        title:
          "Your order has been shipped.",
        accent:
          "Your Game On Garb order is on the way.",
      };

    case "ORDER_DELIVERED":
      return {
        eyebrow:
          "DELIVERED",
        title:
          "Your order has arrived.",
        accent:
          "Thank you for shopping with Game On Garb.",
      };

    case "ORDER_CANCELLED":
      return {
        eyebrow:
          "ORDER CANCELLED",
        title:
          "Your order was cancelled.",
        accent:
          "If you need help, simply reply to this email.",
      };

    case "ORDER_FAILED_DELIVERY":
      return {
        eyebrow:
          "DELIVERY UPDATE",
        title:
          "We couldn’t complete delivery.",
        accent:
          "Please contact Game On Garb if you need assistance.",
      };

    default:
      return {
        eyebrow:
          "ORDER UPDATE",
        title:
          "There’s an update on your order.",
        accent:
          "Thank you for choosing Game On Garb.",
      };
  }
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

  const status =
    textValue(
      payload.status,
      "NEW",
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

  const deliveryAdvancePaid =
    numberValue(
      payload.deliveryAdvancePaid,
    );

  const deliveryAdvanceReference =
    textValue(
      payload.deliveryAdvanceReference,
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
        ? `Game On Garb | ${orderNumber}`
        : "Game On Garb Notification"
    );

  const eventCopy =
    formatEventTitle(
      String(
        delivery.event,
      ),
    );

  const fullBkashPaid =
    paymentMethod ===
      "BKASH" &&
    paymentStatus ===
      "PAID";

  const codWithAdvance =
    paymentMethod ===
      "COD" &&
    deliveryAdvancePaid >
      0;

  const paymentTypeLabel =
    fullBkashPaid
      ? "Full bKash Payment"
      : codWithAdvance
        ? "COD + bKash Delivery Advance"
        : paymentMethod ===
            "COD"
          ? "Cash on Delivery"
          : paymentMethod ||
            "Payment";

  const paidAmount =
    fullBkashPaid
      ? total
      : deliveryAdvancePaid;

  const remainingCod =
    paymentMethod ===
      "COD"
      ? Math.max(
          0,
          total -
            deliveryAdvancePaid,
        )
      : 0;

  const collectionStatus =
    fullBkashPaid
      ? "Fully Paid"
      : codWithAdvance
        ? "Partially Paid"
        : paymentMethod ===
            "COD"
          ? "Unpaid"
          : paymentStatus;

  const trackUrl =
    orderNumber
      ? `${siteUrl()}/track-order?order=${encodeURIComponent(
          orderNumber,
        )}`
      : siteUrl();

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

          const sku =
            textValue(
              item.sku,
            );

          const quantity =
            numberValue(
              item.quantity,
            );

          const lineTotal =
            numberValue(
              item.lineTotal,
            );

          const image =
            textValue(
              item.image,
            );

          const imageCell =
            image
              ? `
                <td width="76" valign="top" style="padding:16px 14px 16px 0;border-bottom:1px solid #ece9e5;">
                  <img
                    src="${escapeHtml(
                      absoluteUrl(
                        image,
                      ),
                    )}"
                    alt=""
                    width="64"
                    height="76"
                    style="display:block;width:64px;height:76px;object-fit:cover;border-radius:8px;background:#f4f1ed;border:1px solid #ebe6e0;"
                  >
                </td>
              `
              : "";

          return `
            <tr>
              ${imageCell}

              <td valign="top" style="padding:16px 0;border-bottom:1px solid #ece9e5;">
                <div style="font-size:14px;line-height:1.35;font-weight:800;color:#111111;">
                  ${escapeHtml(
                    name,
                  )}
                </div>

                ${meta
                  ? `
                    <div style="margin-top:6px;font-size:12px;line-height:1.45;color:#77716b;">
                      ${meta}
                    </div>
                  `
                  : ""}

                ${sku
                  ? `
                    <div style="margin-top:4px;font-size:11px;line-height:1.4;color:#a19a94;">
                      SKU: ${escapeHtml(
                        sku,
                      )}
                    </div>
                  `
                  : ""}

                <div style="margin-top:7px;font-size:12px;line-height:1.45;color:#77716b;">
                  Qty ${quantity} · ${formatMoney(
                    item.unitPrice,
                  )} each
                </div>
              </td>

              <td width="110" align="right" valign="top" style="padding:16px 0 16px 14px;border-bottom:1px solid #ece9e5;font-size:14px;font-weight:800;color:#111111;white-space:nowrap;">
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
    eventCopy.title,
    eventCopy.accent,
    "",
    orderNumber
      ? `Order: ${orderNumber}`
      : "",
    `Status: ${status.replaceAll(
      "_",
      " ",
    )}`,
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
    `Payment: ${paymentTypeLabel}`,
    `Collection status: ${collectionStatus}`,
    paidAmount >
    0
      ? `Paid: ${formatMoney(
          paidAmount,
        )}`
      : "",
    paymentMethod ===
      "COD"
      ? `Remaining COD: ${formatMoney(
          remainingCod,
        )}`
      : "",
    deliveryAdvanceReference
      ? `bKash TrxID: ${deliveryAdvanceReference}`
      : "",
    "",
    shippingAddress
      ? `Delivery address: ${shippingAddress}`
      : "",
    "",
    orderNumber
      ? `Track order: ${trackUrl}`
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

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
      </head>

      <body style="margin:0;padding:0;background:#f2f0ed;font-family:Arial,Helvetica,sans-serif;color:#111111;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(
            message,
          )}
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f2f0ed;">
          <tr>
            <td align="center" style="padding:28px 12px;">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e3dd;box-shadow:0 8px 30px rgba(20,16,12,.06);">

                <tr>
                  <td align="center" style="padding:16px 24px 14px;background:#ffffff;border-bottom:4px solid #e85d04;">
                    <img
                      src="${escapeHtml(
                        logoUrl(),
                      )}"
                      alt="Game On Garb"
                      width="500"
                      style="display:block;width:500px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;"
                    >
                  </td>
                </tr>

                <tr>
                  <td style="padding:34px 28px 10px;">

                    <div style="font-size:11px;line-height:1.3;font-weight:900;letter-spacing:1.8px;color:#e85d04;">
                      ${escapeHtml(
                        eventCopy.eyebrow,
                      )}
                    </div>

                    <h1 style="margin:10px 0 8px;font-size:27px;line-height:1.18;color:#111111;font-weight:900;">
                      ${escapeHtml(
                        eventCopy.title,
                      )}
                    </h1>

                    <p style="margin:0;font-size:14px;line-height:1.7;color:#69635e;">
                      Hi ${escapeHtml(
                        customerName,
                      )}, ${escapeHtml(
                        eventCopy.accent,
                      )}
                    </p>

                  </td>
                </tr>

                ${orderNumber
                  ? `
                    <tr>
                      <td style="padding:18px 28px 8px;">
                        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fff6ef;border:1px solid #ffd8bf;border-radius:12px;">
                          <tr>
                            <td width="50%" style="padding:16px 18px;border-right:1px solid #ffd8bf;">
                              <div style="font-size:10px;font-weight:800;letter-spacing:1.1px;color:#9a6544;">
                                ORDER NUMBER
                              </div>
                              <div style="margin-top:5px;font-size:16px;font-weight:900;color:#111111;">
                                ${escapeHtml(
                                  orderNumber,
                                )}
                              </div>
                            </td>

                            <td width="50%" style="padding:16px 18px;">
                              <div style="font-size:10px;font-weight:800;letter-spacing:1.1px;color:#9a6544;">
                                STATUS
                              </div>
                              <div style="margin-top:5px;font-size:14px;font-weight:800;color:#111111;">
                                ${escapeHtml(
                                  status
                                    .replaceAll(
                                      "_",
                                      " ",
                                    )
                                    .toLowerCase()
                                    .replace(
                                      /\b\w/g,
                                      (
                                        letter,
                                      ) =>
                                        letter.toUpperCase(),
                                    ),
                                )}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `
                  : ""}

                ${items.length
                  ? `
                    <tr>
                      <td style="padding:26px 28px 0;">
                        <div style="font-size:12px;font-weight:900;letter-spacing:1.1px;color:#3f3a36;">
                          ORDER SUMMARY
                        </div>

                        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px;">
                          ${itemRows}
                        </table>
                      </td>
                    </tr>
                  `
                  : ""}

                <tr>
                  <td style="padding:24px 28px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#faf8f5;border:1px solid #ece6df;border-radius:12px;">
                      <tr>
                        <td style="padding:18px 18px 8px;color:#77716b;font-size:13px;">Subtotal</td>
                        <td align="right" style="padding:18px 18px 8px;font-size:13px;font-weight:700;">${formatMoney(
                          subtotal,
                        )}</td>
                      </tr>

                      ${discount >
                      0
                        ? `
                          <tr>
                            <td style="padding:6px 18px;color:#77716b;font-size:13px;">Discount</td>
                            <td align="right" style="padding:6px 18px;font-size:13px;font-weight:700;color:#237a45;">-${formatMoney(
                              discount,
                            )}</td>
                          </tr>
                        `
                        : ""}

                      <tr>
                        <td style="padding:6px 18px 14px;color:#77716b;font-size:13px;">Delivery</td>
                        <td align="right" style="padding:6px 18px 14px;font-size:13px;font-weight:700;">${formatMoney(
                          deliveryCharge,
                        )}</td>
                      </tr>

                      <tr>
                        <td style="padding:16px 18px;border-top:1px solid #e5ded6;font-size:15px;font-weight:900;">TOTAL</td>
                        <td align="right" style="padding:16px 18px;border-top:1px solid #e5ded6;font-size:21px;font-weight:900;color:#e85d04;">${formatMoney(
                          total,
                        )}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 28px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#111111;border-radius:12px;">
                      <tr>
                        <td style="padding:18px;">
                          <div style="font-size:10px;font-weight:900;letter-spacing:1.1px;color:#f08b4d;">
                            PAYMENT
                          </div>

                          <div style="margin-top:7px;font-size:15px;font-weight:900;color:#ffffff;">
                            ${escapeHtml(
                              paymentTypeLabel,
                            )}
                          </div>

                          <div style="margin-top:6px;font-size:12px;line-height:1.5;color:#c8c4c0;">
                            Collection status: ${escapeHtml(
                              collectionStatus,
                            )}
                          </div>

                          ${paidAmount >
                          0
                            ? `
                              <div style="margin-top:12px;font-size:13px;color:#ffffff;">
                                Paid: <strong style="color:#ff8a3d;">${formatMoney(
                                  paidAmount,
                                )}</strong>
                              </div>
                            `
                            : ""}

                          ${paymentMethod ===
                          "COD"
                            ? `
                              <div style="margin-top:6px;font-size:13px;color:#ffffff;">
                                Remaining COD: <strong style="color:#ff8a3d;">${formatMoney(
                                  remainingCod,
                                )}</strong>
                              </div>
                            `
                            : ""}

                          ${deliveryAdvanceReference
                            ? `
                              <div style="margin-top:8px;font-size:11px;line-height:1.5;color:#aaa49f;">
                                bKash TrxID: ${escapeHtml(
                                  deliveryAdvanceReference,
                                )}
                              </div>
                            `
                            : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${shippingAddress
                  ? `
                    <tr>
                      <td style="padding:24px 28px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border:1px solid #ece6df;border-radius:12px;">
                          <tr>
                            <td style="padding:18px;">
                              <div style="font-size:10px;font-weight:900;letter-spacing:1.1px;color:#8e8780;">
                                DELIVERY ADDRESS
                              </div>

                              <div style="margin-top:7px;font-size:14px;line-height:1.65;font-weight:600;color:#2b2825;">
                                ${escapeHtml(
                                  shippingAddress,
                                )}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `
                  : ""}

                ${orderNumber
                  ? `
                    <tr>
                      <td align="center" style="padding:30px 28px 4px;">
                        <table cellpadding="0" cellspacing="0" role="presentation">
                          <tr>
                            <td align="center" style="border-radius:8px;background:#e85d04;">
                              <a href="${escapeHtml(
                                trackUrl,
                              )}" style="display:inline-block;padding:14px 26px;font-size:13px;font-weight:900;letter-spacing:.5px;color:#ffffff;text-decoration:none;">
                                TRACK YOUR ORDER
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  `
                  : ""}

                <tr>
                  <td style="padding:28px 28px 32px;text-align:center;">
                    <div style="font-size:12px;line-height:1.7;color:#827b75;">
                      Need help with your order? Reply to this email and our team can assist you.
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:22px 28px;background:#0b0b0b;border-top:1px solid #242424;">
                    <div style="font-size:12px;font-weight:800;color:#ffffff;">
                      Game On Garb
                    </div>

                    <div style="margin-top:5px;font-size:10px;letter-spacing:1.3px;color:#e85d04;">
                      EXPERIENCE THE THRILL
                    </div>

                    <div style="margin-top:12px;font-size:10px;line-height:1.6;color:#777777;">
                      This is an automated transactional email regarding your order.
                    </div>
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
