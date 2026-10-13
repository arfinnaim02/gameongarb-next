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

      shipment:
        true,
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

function buildOrderMessage(
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

  return [
    "🛍 <b>GAME ON GARB — NEW ORDER</b>",
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
      ? `🚚 Courier: <b>${escapeHtml(
          order.shipment.provider,
        )}</b>`
      : "",
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
          buildOrderMessage(
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
        buildOrderMessage(
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