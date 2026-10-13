import type {
  OrderStatus,
} from "@prisma/client";

import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  db,
} from "@/lib/db";

import {
  changeOrderStatus,
} from "@/lib/order-status";

import {
  answerTelegramCallback,
  refreshTelegramOrderMessage,
  sendOrdersByStatus,
  sendReadyToShipList,
  sendTelegramText,
  telegramTransitionAllowed,
} from "@/lib/telegram";

import {
  bookOrderWithSteadfast,
} from "@/lib/courier/steadfast-booking";

type TelegramUpdate = {
  message?: {
    message_id:
      number;

    text?:
      string;

    from?: {
      id:
        number;

      username?:
        string;

      first_name?:
        string;
    };

    chat: {
      id:
        number;
    };
  };

  callback_query?: {
    id:
      string;

    from: {
      id:
        number;

      username?:
        string;

      first_name?:
        string;
    };

    data?:
      string;

    message?: {
      message_id:
        number;

      chat: {
        id:
          number;
      };
    };
  };
};

export async function POST(
  request:
    Request,
) {
  /* =======================================================
     WEBHOOK SECRET
     ======================================================= */

  const expectedSecret =
    process.env
      .TELEGRAM_WEBHOOK_SECRET;

  const receivedSecret =
    request.headers.get(
      "x-telegram-bot-api-secret-token",
    );

  if (
    !expectedSecret ||
    receivedSecret !==
      expectedSecret
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status:
          401,
      },
    );
  }

  const update =
    (
      await request.json()
    ) as TelegramUpdate;

      /* =======================================================
     TELEGRAM COMMANDS
     ======================================================= */

  const message =
    update.message;

  if (
    message?.text
  ) {

    const expectedChatId =
      process.env
        .TELEGRAM_ORDER_CHAT_ID;

    if (
      !expectedChatId ||
      String(
        message.chat.id,
      ) !==
        String(
          expectedChatId,
        )
    ) {
      return NextResponse.json({
        ok:
          true,
      });
    }

    const allowedUsers =
      (
        process.env
          .TELEGRAM_ALLOWED_USER_IDS ??
        ""
      )
        .split(
          ",",
        )
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        );

    const senderId =
      message.from?.id
        ? String(
            message.from.id,
          )
        : "";

    if (
      allowedUsers.length >
        0 &&
      !allowedUsers.includes(
        senderId,
      )
    ) {
      return NextResponse.json({
        ok:
          true,
      });
    }

    const command =
      message.text
        .trim()
        .split(
          /\s+/,
        )[0]
        ?.split(
          "@",
        )[0]
        ?.toLowerCase();

    if (
      command ===
      "/new"
    ) {
      await sendOrdersByStatus(
        "NEW",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/confirmed"
    ) {
      await sendOrdersByStatus(
        "CONFIRMED",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/packing"
    ) {
      await sendOrdersByStatus(
        "PACKING",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/ready"
    ) {
      await sendReadyToShipList();

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/shipped"
    ) {
      await sendOrdersByStatus(
        "SHIPPED",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/delivered"
    ) {
      await sendOrdersByStatus(
        "DELIVERED",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/cancelled"
    ) {
      await sendOrdersByStatus(
        "CANCELLED",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/failed"
    ) {
      await sendOrdersByStatus(
        "FAILED_DELIVERY",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/returns"
    ) {
      await sendOrdersByStatus(
        "RETURN_REQUESTED",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    if (
      command ===
      "/help" ||
      command ===
      "/start"
    ) {
      await sendTelegramText({
        chatId:
          message.chat.id,

        text:
          [
            "🛍 <b>GAME ON GARB — ORDER CONTROL</b>",
            "",
            "📋 <b>ORDER LISTS</b>",
            "",
            "/new — New orders",
            "/confirmed — Confirmed orders",
            "/packing — Packing orders",
            "/ready — Ready to Ship + courier actions",
            "/shipped — Shipped orders",
            "/delivered — Delivered orders",
            "/cancelled — Cancelled orders",
            "/failed — Failed delivery orders",
            "/returns — Return requested orders",
            "",
            "⚙️ <b>MANAGEMENT</b>",
            "",
            "Use the buttons below each list to update order status.",
            "",
            "🚚 Ready to Ship orders can also be sent directly to Steadfast.",
            "",
            "📜 Every order card includes its complete status activity history.",
          ].join(
            "\n",
          ),
      });

      return NextResponse.json({
        ok:
          true,
      });
    }
  }

  const callback =
    update.callback_query;

  if (
    !callback ||
    !callback.data ||
    !callback.message
  ) {
    return NextResponse.json({
      ok:
        true,
    });
  }

  /* =======================================================
     CORRECT ORDER CHAT ONLY
     ======================================================= */

  const expectedChatId =
    process.env
      .TELEGRAM_ORDER_CHAT_ID;

  if (
    !expectedChatId ||
    String(
      callback.message.chat.id,
    ) !==
      String(
        expectedChatId,
      )
  ) {
    return NextResponse.json({
      ok:
        true,
    });
  }

  /* =======================================================
     OPTIONAL USER ALLOWLIST
     ======================================================= */

  const allowedUsers =
    (
      process.env
        .TELEGRAM_ALLOWED_USER_IDS ??
      ""
    )
      .split(
        ",",
      )
      .map(
        (
          value,
        ) =>
          value.trim(),
      )
      .filter(
        Boolean,
      );

  if (
    allowedUsers.length >
      0 &&
    !allowedUsers.includes(
      String(
        callback.from.id,
      ),
    )
  ) {
    await answerTelegramCallback(
      callback.id,
      "You are not allowed to manage orders.",
    ).catch(
      () => {},
    );

    return NextResponse.json({
      ok:
        true,
    });
  }

  /* =======================================================
     CALLBACK
     gog:ORDER_ID:STATUS
     ======================================================= */

  const [
    prefix,
    orderId,
    requestedStatus,
  ] =
    callback.data.split(
      ":",
    );

      /* =======================================================
     COURIER ACTION
     courier:ORDER_ID:steadfast
     ======================================================= */

  if (
    callback.data.startsWith(
      "courier:",
    )
  ) {
    const [
      courierPrefix,
      courierOrderId,
      courierProvider,
    ] =
      callback.data.split(
        ":",
      );

    if (
      courierPrefix !==
        "courier" ||
      courierProvider !==
        "steadfast" ||
      !courierOrderId
    ) {
      return NextResponse.json({
        ok:
          true,
      });
    }

    try {
      const result =
        await bookOrderWithSteadfast({
          orderId:
            courierOrderId,

          source:
            "TELEGRAM",
        });

      await answerTelegramCallback(
        callback.id,
        "Order sent to Steadfast.",
      );

      await sendTelegramText({
        chatId:
          callback.message.chat.id,

        text:
          [
            "✅ <b>Sent to Steadfast</b>",
            "",
            `Order: <b>${result.order.number}</b>`,
            `Consignment: ${
              result.shipment.consignmentId ??
              "-"
            }`,
            `Tracking: ${
              result.shipment.trackingId ??
              "-"
            }`,
            `Status: ${
              result.shipment.status
            }`,
          ].join(
            "\n",
          ),
      });

      await refreshTelegramOrderMessage(
        courierOrderId,
      ).catch(
        () => {},
      );

      revalidatePath(
        "/admin/orders",
      );

      revalidatePath(
        `/admin/orders/${courierOrderId}`,
      );
    } catch (
      error
    ) {
      await answerTelegramCallback(
        callback.id,
        error instanceof
          Error
          ? error.message
          : "Courier booking failed.",
      ).catch(
        () => {},
      );
    }

    return NextResponse.json({
      ok:
        true,
    });
  }

  if (
    prefix !==
      "gog" ||
    !orderId ||
    !requestedStatus
  ) {
    return NextResponse.json({
      ok:
        true,
    });
  }

  const nextStatus =
    requestedStatus as
      OrderStatus;

  try {
    const order =
      await db.order.findUnique({
        where: {
          id:
            orderId,
        },

        select: {
          id:
            true,

          number:
            true,

          status:
            true,
        },
      });

    if (!order) {
      await answerTelegramCallback(
        callback.id,
        "Order was not found.",
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    /*
     * Protect against:
     *
     * - old Telegram buttons
     * - replayed callback data
     * - backwards status movement
     */
    if (
      !telegramTransitionAllowed(
        order.status,
        nextStatus,
      )
    ) {
      await refreshTelegramOrderMessage(
        order.id,
      ).catch(
        () => {},
      );

      await answerTelegramCallback(
        callback.id,
        `Order is already ${order.status.replaceAll(
          "_",
          " ",
        )}.`,
      );

      return NextResponse.json({
        ok:
          true,
      });
    }

    const telegramActor =
      callback.from.username
        ? `telegram:@${callback.from.username}`
        : `telegram:${callback.from.id}`;

    await changeOrderStatus({
      orderId:
        order.id,

      nextStatus,

      changedBy:
        telegramActor,

      inventoryActorId:
        null,

      source:
        "TELEGRAM",

      note:
        "Updated from Telegram",
    });

    await refreshTelegramOrderMessage(
      order.id,
    ).catch(
      (
        error,
      ) => {
        console.error(
          "Telegram message refresh failed:",
          error,
        );
      },
    );

    await answerTelegramCallback(
      callback.id,
      `${order.number} → ${nextStatus.replaceAll(
        "_",
        " ",
      )}`,
    );

    revalidatePath(
      "/admin/orders",
    );

    revalidatePath(
      `/admin/orders/${order.id}`,
    );

    revalidatePath(
      "/account/orders",
    );
  } catch (
    error
  ) {
    console.error(
      "Telegram callback error:",
      error,
    );

    await answerTelegramCallback(
      callback.id,
      error instanceof
        Error
        ? error.message
        : "Unable to update order.",
    ).catch(
      () => {},
    );
  }

  return NextResponse.json({
    ok:
      true,
  });
}