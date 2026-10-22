import type {
  OrderStatus,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

/* =========================================================
   CONFIG
   ========================================================= */

function getTelegramConfig() {
  const token =
    process.env
      .TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env
      .TELEGRAM_ORDER_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    return null;
  }

  return {
    token,
    chatId,
  };
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(
  value:
    string |
    null |
    undefined,
) {
  return (
    value ??
    ""
  )
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
    );
}

function statusLabel(
  value:
    string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        char,
      ) =>
        char.toUpperCase(),
    );
}

function formatTelegramDate(
  date:
    Date,
) {
  return new Intl.DateTimeFormat(
    "en-BD",
    {
      timeZone:
        "Asia/Dhaka",

      day:
        "2-digit",

      month:
        "short",

      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true,
    },
  ).format(
    date,
  );
}

async function buildHistoryText(
  order:
    TelegramOrder,
) {
  if (
    order.history.length ===
    0
  ) {
    return "";
  }

  /*
   * Admin-origin history currently
   * stores the User ID in changedBy.
   * Resolve those IDs so Telegram shows
   * a human-readable admin name.
   */
  const possibleUserIds =
    order.history
      .map(
        (
          entry,
        ) =>
          entry.changedBy,
      )
      .filter(
        (
          value,
        ):
          value is string =>
          Boolean(
            value,
          ) &&
          !value!.startsWith(
            "telegram:",
          ),
      );

  const users =
    possibleUserIds.length >
    0
      ? await db.user.findMany({
          where: {
            id: {
              in: [
                ...new Set(
                  possibleUserIds,
                ),
              ],
            },
          },

          select: {
            id:
              true,

            name:
              true,

            email:
              true,
          },
        })
      : [];

  const userMap =
    new Map(
      users.map(
        (
          user,
        ) => [
          user.id,
          user,
        ],
      ),
    );

  const lines =
    order.history.map(
      (
        entry,
        index,
      ) => {
        let actor =
          "System";

        let source =
          statusLabel(
            entry.source,
          );

        if (
          entry.source ===
          "STEADFAST"
        ) {
          actor =
            "Steadfast";

          source =
            "Courier Sync";
        } else if (
          entry.source ===
          "STOREFRONT"
        ) {
          actor =
            "Storefront";
        } else if (
          entry.changedBy?.startsWith(
            "telegram:@",
          )
        ) {
          actor =
            entry.changedBy.replace(
              "telegram:",
              "",
            );
        } else if (
          entry.changedBy?.startsWith(
            "telegram:",
          )
        ) {
          actor =
            `Telegram User ${entry.changedBy.replace(
              "telegram:",
              "",
            )}`;
        } else if (
          entry.changedBy
        ) {
          const user =
            userMap.get(
              entry.changedBy,
            );

          actor =
            user?.name ||
            user?.email ||
            "Admin";
        }

        const transition =
          entry.oldStatus
            ? `${statusLabel(
                entry.oldStatus,
              )} → ${statusLabel(
                entry.newStatus,
              )}`
            : `Order Placed → ${statusLabel(
                entry.newStatus,
              )}`;

        return [
          `${index + 1}. <b>${escapeHtml(
            transition,
          )}</b>`,

          `   ${escapeHtml(
            actor,
          )} · ${escapeHtml(
            source,
          )}`,

          `   ${escapeHtml(
            formatTelegramDate(
              entry.createdAt,
            ),
          )}`,

          entry.note
            ? `   📝 ${escapeHtml(
                entry.note,
              )}`
            : "",
        ]
          .filter(
            Boolean,
          )
          .join(
            "\n",
          );
      },
    );

  return [
    "📜 <b>ORDER ACTIVITY</b>",
    "",
    ...lines,
  ].join(
    "\n\n",
  );
}

/* =========================================================
   COURIER ACTIVITY
   ========================================================= */

function buildCourierActivityText(
  order:
    TelegramOrder,
) {
  if (
    !order.shipment
  ) {
    return "";
  }

  /*
   * Keep meaningful courier lifecycle
   * entries in the Telegram order card.
   *
   * Raw Steadfast tracking events remain
   * stored in the database, but showing
   * every scan would eventually make the
   * Telegram message too large.
   */
  const meaningfulEvents =
    order.shipment.events
      .filter(
        (
          event,
        ) =>
          event.message.startsWith(
            "Steadfast status changed from ",
          ) ||
          event.message.startsWith(
            "Parcel created in Steadfast",
          ),
      )
      .slice(
        -12,
      );

  if (
    meaningfulEvents.length ===
    0
  ) {
    return "";
  }

  const lines =
    meaningfulEvents.map(
      (
        event,
        index,
      ) => {
        const eventDate =
          event.externalAt ??
          event.createdAt;

        return [
          `${index + 1}. <b>${escapeHtml(
            event.status
              ? statusLabel(
                  event.status,
                )
              : "Courier Update",
          )}</b>`,

          `   ${escapeHtml(
            event.message,
          )}`,

          `   ${escapeHtml(
            formatTelegramDate(
              eventDate,
            ),
          )}`,
        ].join(
          "\n",
        );
      },
    );

  return [
    "🚚 <b>COURIER ACTIVITY</b>",
    "",
    ...lines,
  ].join(
    "\n\n",
  );
}

export function telegramTransitionAllowed(
  current:
    OrderStatus,

  next:
    OrderStatus,
) {
  const allowed:
    Partial<
      Record<
        OrderStatus,
        OrderStatus[]
      >
    > = {
    NEW: [
      "CONFIRMED",
      "CANCELLED",
    ],

    CONFIRMED: [
      "PACKING",
      "CANCELLED",
    ],

    PACKING: [
      "READY_TO_SHIP",
      "CANCELLED",
    ],

    READY_TO_SHIP: [
      "SHIPPED",
      "CANCELLED",
    ],

    SHIPPED: [
      "DELIVERED",
      "FAILED_DELIVERY",
    ],
  };

  return (
    allowed[current] ??
    []
  ).includes(
    next,
  );
}

/* =========================================================
   TELEGRAM REQUEST
   ========================================================= */

async function telegramRequest(
  method:
    string,

  body:
    Record<
      string,
      unknown
    >,
) {
  const config =
    getTelegramConfig();

  if (!config) {
    throw new Error(
      "Telegram integration is not configured.",
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${config.token}/${method}`,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            body,
          ),

        signal:
          AbortSignal.timeout(
            8_000,
          ),
      },
    );

  const result =
    (await response.json()) as {
      ok:
        boolean;

      description?:
        string;

      result?:
        {
          message_id?:
            number;
        };
    };

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      result.description ??
        "Telegram request failed.",
    );
  }

  return result;
}

/* =========================================================
   ORDER
   ========================================================= */

async function loadOrder(
  orderId:
    string,
) {
  return db.order.findUniqueOrThrow({
    where: {
      id:
        orderId,
    },

    include: {
      items:
        true,

      shipment: {
        include: {
          events: {
            orderBy: {
              createdAt:
                "asc",
            },

            take:
              50,
          },
        },
      },

      history: {
        orderBy: {
          createdAt:
            "asc",
        },
      },
    },
  });
}
type TelegramOrder =
  Awaited<
    ReturnType<
      typeof loadOrder
    >
  >;

/* =========================================================
   ACTION BUTTONS
   ========================================================= */

function orderButtons(
  order:
    TelegramOrder,
) {
  const id =
    order.id;

  if (
    order.status ===
    "NEW"
  ) {
    return [
      [
        {
          text:
            "✅ Confirm",

          callback_data:
            `gog:${id}:CONFIRMED`,
        },

        {
          text:
            "❌ Cancel",

          callback_data:
            `gog:${id}:CANCELLED`,
        },
      ],
    ];
  }

  if (
    order.status ===
    "CONFIRMED"
  ) {
    return [
      [
        {
          text:
            "📦 Start Packing",

          callback_data:
            `gog:${id}:PACKING`,
        },
      ],

      [
        {
          text:
            "❌ Cancel",

          callback_data:
            `gog:${id}:CANCELLED`,
        },
      ],
    ];
  }

  if (
    order.status ===
    "PACKING"
  ) {
    return [
      [
        {
          text:
            "✅ Ready to Ship",

          callback_data:
            `gog:${id}:READY_TO_SHIP`,
        },
      ],

      [
        {
          text:
            "❌ Cancel",

          callback_data:
            `gog:${id}:CANCELLED`,
        },
      ],
    ];
  }

  if (
    order.status ===
    "READY_TO_SHIP"
  ) {
    return [
      [
        {
          text:
            "🚚 Mark Shipped",

          callback_data:
            `gog:${id}:SHIPPED`,
        },
      ],

      [
        {
          text:
            "❌ Cancel",

          callback_data:
            `gog:${id}:CANCELLED`,
        },
      ],
    ];
  }

  if (
    order.status ===
    "SHIPPED"
  ) {
    return [
      [
        {
          text:
            "✅ Delivered",

          callback_data:
            `gog:${id}:DELIVERED`,
        },

        {
          text:
            "⚠️ Failed Delivery",

          callback_data:
            `gog:${id}:FAILED_DELIVERY`,
        },
      ],
    ];
  }

  return [];
}

/* =========================================================
   MESSAGE
   ========================================================= */

async function buildOrderMessage(
  order:
    TelegramOrder,
) {
  const visibleItems =
    order.items.slice(
      0,
      15,
    );

  const items =
    visibleItems
      .map(
        (
          item,
          index,
        ) => {
          const variant =
            [
              item.size,
              item.color,
            ]
              .filter(
                Boolean,
              )
              .join(
                " / ",
              );

          return [
            `<b>${index + 1}. ${escapeHtml(
              item.name,
            )}</b>`,

            variant
              ? `   ${escapeHtml(
                  variant,
                )}`
              : "",

            `   ${item.quantity} × ${formatBDT(
              Number(
                item.unitPrice,
              ),
            )} = <b>${formatBDT(
              Number(
                item.lineTotal,
              ),
            )}</b>`,
          ]
            .filter(
              Boolean,
            )
            .join(
              "\n",
            );
        },
      )
      .join(
        "\n\n",
      );

  const moreItems =
    order.items.length >
    visibleItems.length
      ? `\n\n+ ${
          order.items.length -
          visibleItems.length
        } more item(s)`
      : "";

  const historyText =
    await buildHistoryText(
      order,
    );

  const courierActivityText =
    buildCourierActivityText(
      order,
    );

  return [
    "🛍 <b>GameOn Garb — ORDER</b>",
    "",
    `🧾 <b>${escapeHtml(
      order.number,
    )}</b>`,

    `📌 Status: <b>${statusLabel(
      order.status,
    )}</b>`,

    "",
    `👤 <b>${escapeHtml(
      order.customerName,
    )}</b>`,

    `📞 ${escapeHtml(
      order.phone,
    )}`,

    order.email
      ? `✉️ ${escapeHtml(
          order.email,
        )}`
      : "",

    "",
    "📍 <b>Delivery Address</b>",

    escapeHtml(
      order.shippingAddress,
    ),

    `${escapeHtml(
      order.district,
    )}, ${escapeHtml(
      order.division,
    )}`,

    "",
    "🛒 <b>Items</b>",

    `${items}${moreItems}`,

    "",
    `Subtotal: ${formatBDT(
      Number(
        order.subtotal,
      ),
    )}`,

    Number(
      order.discount,
    ) >
    0
      ? `Discount: -${formatBDT(
          Number(
            order.discount,
          ),
        )}`
      : "",

    `Delivery: ${formatBDT(
      Number(
        order.deliveryCharge,
      ),
    )}`,

    `💰 <b>Total: ${formatBDT(
      Number(
        order.total,
      ),
    )}</b>`,

    "",
    `💳 Payment: <b>${order.paymentMethod}</b>`,

    `Payment Status: <b>${statusLabel(
      order.paymentStatus,
    )}</b>`,

    order.shipment
      ? ""
      : "",

    order.shipment
      ? "🚚 <b>Courier</b>"
      : "",

    order.shipment
      ? `Provider: <b>${escapeHtml(
          order.shipment.provider,
        )}</b>`
      : "",

    order.shipment
      ? `Courier Status: <b>${escapeHtml(
          statusLabel(
            order.shipment.status,
          ),
        )}</b>`
      : "",

    order.shipment
        ?.consignmentId
      ? `Consignment: <code>${escapeHtml(
          order.shipment
            .consignmentId,
        )}</code>`
      : "",

    order.shipment
        ?.trackingId
      ? `Tracking: <code>${escapeHtml(
          order.shipment
            .trackingId,
        )}</code>`
      : "",

    order.shipment
        ?.lastSyncedAt
      ? `Last Sync: ${escapeHtml(
          formatTelegramDate(
            order.shipment
              .lastSyncedAt,
          ),
        )}`
      : "",

    historyText
      ? "\n"
      : "",

    historyText,

    courierActivityText
      ? "\n"
      : "",

    courierActivityText,
  ]
    .filter(
      Boolean,
    )
    .join(
      "\n",
    );
}

/* =========================================================
   SEND NEW ORDER
   ========================================================= */

export async function sendOrderToTelegram(
  orderId:
    string,
) {
  const config =
    getTelegramConfig();

  if (!config) {
    return null;
  }

  const order =
    await loadOrder(
      orderId,
    );

  const response =
    await telegramRequest(
      "sendMessage",
      {
        chat_id:
          config.chatId,

        text:
          await buildOrderMessage(
            order,
          ),

        parse_mode:
          "HTML",

        disable_web_page_preview:
          true,

        reply_markup: {
          inline_keyboard:
            orderButtons(
              order,
            ),
        },
      },
    );

  const messageId =
    response.result
      ?.message_id;

  if (
    typeof messageId ===
    "number"
  ) {
    await db.order.update({
      where: {
        id:
          order.id,
      },

      data: {
        telegramChatId:
          String(
            config.chatId,
          ),

        telegramMessageId:
          messageId,
      },
    });
  }

  return response;
}

/* =========================================================
   REFRESH EXISTING ORDER MESSAGE
   ========================================================= */

export async function refreshTelegramOrderMessage(
  orderId:
    string,
) {
  const order =
    await loadOrder(
      orderId,
    );

  if (
    !order.telegramChatId ||
    !order.telegramMessageId
  ) {
    return null;
  }

  return telegramRequest(
    "editMessageText",
    {
      chat_id:
        order.telegramChatId,

      message_id:
        order.telegramMessageId,

      text:
        await buildOrderMessage(
          order,
        ),

      parse_mode:
        "HTML",

      disable_web_page_preview:
        true,

      reply_markup: {
        inline_keyboard:
          orderButtons(
            order,
          ),
      },
    },
  );
}

/* =========================================================
   ORDER STATUS LISTS
   ========================================================= */

export async function sendOrdersByStatus(
  status:
    OrderStatus,
) {
  const config =
    getTelegramConfig();

  if (!config) {
    return null;
  }

  const orders =
    await db.order.findMany({
      where: {
        status,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      take:
        25,

      select: {
        id:
          true,

        number:
          true,

        customerName:
          true,

        phone:
          true,

        district:
          true,

        total:
          true,

        paymentMethod:
          true,

        paymentStatus:
          true,

        createdAt:
          true,

        shipment: {
          select: {
            provider:
              true,

            status:
              true,

            consignmentId:
              true,

            trackingId:
              true,
          },
        },
      },
    });

  if (
    orders.length ===
    0
  ) {
    return telegramRequest(
      "sendMessage",
      {
        chat_id:
          config.chatId,

        text:
          `✅ No ${statusLabel(
            status,
          )} orders found.`,
      },
    );
  }

  const text =
    [
      `📦 <b>${escapeHtml(
        statusLabel(
          status,
        ).toUpperCase(),
      )} ORDERS</b>`,

      "",

      `${orders.length} order${
        orders.length ===
        1
          ? ""
          : "s"
      }`,

      "",

      ...orders.map(
        (
          order,
          index,
        ) => {
          const courier =
            order.shipment
              ? `\n🚚 ${escapeHtml(
                  order.shipment.provider,
                )} · ${escapeHtml(
                  statusLabel(
                    order.shipment.status,
                  ),
                )}`
              : "";

          return `${index + 1}. <b>${escapeHtml(
            order.number,
          )}</b>
${escapeHtml(
  order.customerName,
)} · ${escapeHtml(
            order.district,
          )}
📞 ${escapeHtml(
            order.phone,
          )}
💰 ${formatBDT(
            Number(
              order.total,
            ),
          )} · ${order.paymentMethod}${courier}`;
        },
      ),
    ].join(
      "\n\n",
    );

  const buttons =
    orders.flatMap(
      (
        order,
      ) => {
        const rows: {
          text:
            string;

          callback_data:
            string;
        }[][] = [];

        /*
         * Status management buttons.
         */
        if (
          status ===
          "NEW"
        ) {
          rows.push([
            {
              text:
                `✅ ${order.number} → Confirm`,

              callback_data:
                `gog:${order.id}:CONFIRMED`,
            },

            {
              text:
                "❌ Cancel",

              callback_data:
                `gog:${order.id}:CANCELLED`,
            },
          ]);
        }

        if (
          status ===
          "CONFIRMED"
        ) {
          rows.push([
            {
              text:
                `📦 ${order.number} → Packing`,

              callback_data:
                `gog:${order.id}:PACKING`,
            },

            {
              text:
                "❌ Cancel",

              callback_data:
                `gog:${order.id}:CANCELLED`,
            },
          ]);
        }

        if (
          status ===
          "PACKING"
        ) {
          rows.push([
            {
              text:
                `✅ ${order.number} → Ready`,

              callback_data:
                `gog:${order.id}:READY_TO_SHIP`,
            },

            {
              text:
                "❌ Cancel",

              callback_data:
                `gog:${order.id}:CANCELLED`,
            },
          ]);
        }

        if (
          status ===
          "READY_TO_SHIP"
        ) {
          rows.push([
            {
              text:
                `🚚 ${order.number} → Shipped`,

              callback_data:
                `gog:${order.id}:SHIPPED`,
            },

            {
              text:
                "❌ Cancel",

              callback_data:
                `gog:${order.id}:CANCELLED`,
            },
          ]);
        }

        if (
          status ===
          "SHIPPED"
        ) {
          rows.push([
            {
              text:
                `✅ ${order.number} → Delivered`,

              callback_data:
                `gog:${order.id}:DELIVERED`,
            },

            {
              text:
                "⚠️ Failed",

              callback_data:
                `gog:${order.id}:FAILED_DELIVERY`,
            },
          ]);
        }

        return rows;
      },
    );

  return telegramRequest(
    "sendMessage",
    {
      chat_id:
        config.chatId,

      text,

      parse_mode:
        "HTML",

      reply_markup: {
        inline_keyboard:
          buttons,
      },
    },
  );
}

/* =========================================================
   READY TO SHIP LIST
   ========================================================= */

export async function sendReadyToShipList() {
  const config =
    getTelegramConfig();

  if (!config) {
    return null;
  }

  const orders =
    await db.order.findMany({
      where: {
        status:
          "READY_TO_SHIP",

        shipment: {
          is:
            null,
        },
      },

      orderBy: {
        createdAt:
          "asc",
      },

      take:
        25,

      select: {
        id:
          true,

        number:
          true,

        customerName:
          true,

        phone:
          true,

        district:
          true,

        total:
          true,

        paymentMethod:
          true,

        paymentStatus:
          true,
      },
    });

  if (
    orders.length ===
    0
  ) {
    return telegramRequest(
      "sendMessage",
      {
        chat_id:
          config.chatId,

        text:
          "✅ No orders are waiting for courier booking.",
      },
    );
  }

  const text =
    [
      "🚚 <b>READY TO SHIP</b>",
      "",
      `${orders.length} order${
        orders.length ===
        1
          ? ""
          : "s"
      } waiting for courier`,
      "",
      ...orders.map(
        (
          order,
          index,
        ) =>
          `${index + 1}. <b>${escapeHtml(
            order.number,
          )}</b>\n${escapeHtml(
            order.customerName,
          )} · ${escapeHtml(
            order.district,
          )}\n${formatBDT(
            Number(
              order.total,
            ),
          )} · ${order.paymentMethod}`,
      ),
    ].join(
      "\n\n",
    );

  const buttons =
    orders.map(
      (
        order,
      ) => [
        {
          text:
            `🚚 ${order.number} → Steadfast`,

          callback_data:
            `courier:${order.id}:steadfast`,
        },
      ],
    );

  return telegramRequest(
    "sendMessage",
    {
      chat_id:
        config.chatId,

      text,

      parse_mode:
        "HTML",

      reply_markup: {
        inline_keyboard:
          buttons,
      },
    },
  );
}

export async function sendTelegramText({
  chatId,
  text,
}: {
  chatId:
    string |
    number;

  text:
    string;
}) {
  return telegramRequest(
    "sendMessage",
    {
      chat_id:
        chatId,

      text,

      parse_mode:
        "HTML",
    },
  );
}

/* =========================================================
   CALLBACK ANSWER
   ========================================================= */

export async function answerTelegramCallback(
  callbackId:
    string,

  message:
    string,
) {
  return telegramRequest(
    "answerCallbackQuery",
    {
      callback_query_id:
        callbackId,

      text:
        message,

      show_alert:
        false,
    },
  );
}