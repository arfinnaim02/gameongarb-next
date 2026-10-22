import {
  NotificationChannel,
  NotificationEvent,
} from "@prisma/client";

import {
  db,
} from "@/lib/db";

import {
  queueNotification,
} from "@/lib/notifications/service";

/* =========================================================
   TYPES
   ========================================================= */

type OrderNotificationEvent =
  | typeof NotificationEvent.ORDER_PLACED
  | typeof NotificationEvent.ORDER_CONFIRMED
  | typeof NotificationEvent.ORDER_READY_TO_SHIP
  | typeof NotificationEvent.ORDER_SHIPPED
  | typeof NotificationEvent.ORDER_DELIVERED
  | typeof NotificationEvent.ORDER_CANCELLED
  | typeof NotificationEvent.ORDER_FAILED_DELIVERY;

type OrderNotificationCopy = {
  subject:
    string;

  message:
    string;
};

/* =========================================================
   EVENT COPY
   ========================================================= */

function getOrderNotificationCopy(
  event:
    OrderNotificationEvent,

  orderNumber:
    string,
):
  OrderNotificationCopy {
  switch (
    event
  ) {
    case NotificationEvent.ORDER_PLACED:
      return {
        subject:
          `Order received — ${orderNumber}`,

        message:
          "We have received your order and will review it shortly.",
      };

    case NotificationEvent.ORDER_CONFIRMED:
      return {
        subject:
          `Order confirmed — ${orderNumber}`,

        message:
          "Your order has been confirmed and is now being prepared.",
      };

    case NotificationEvent.ORDER_READY_TO_SHIP:
      return {
        subject:
          `Order ready to ship — ${orderNumber}`,

        message:
          "Your order is packed and ready to be handed over to the courier.",
      };

    case NotificationEvent.ORDER_SHIPPED:
      return {
        subject:
          `Order shipped — ${orderNumber}`,

        message:
          "Your order has been shipped and is on the way.",
      };

    case NotificationEvent.ORDER_DELIVERED:
      return {
        subject:
          `Order delivered — ${orderNumber}`,

        message:
          "Your order has been delivered successfully. Thank you for shopping with GameOn Garb.",
      };

    case NotificationEvent.ORDER_CANCELLED:
      return {
        subject:
          `Order cancelled — ${orderNumber}`,

        message:
          "Your order has been cancelled.",
      };

    case NotificationEvent.ORDER_FAILED_DELIVERY:
      return {
        subject:
          `Delivery update — ${orderNumber}`,

        message:
          "The courier could not complete your delivery. Please contact GameOn Garb if you need assistance.",
      };
  }
}

/* =========================================================
   ORDER STATUS → NOTIFICATION EVENT
   ========================================================= */

export function notificationEventForOrderStatus(
  status:
    string,
):
  OrderNotificationEvent |
  null {
  switch (
    status
  ) {
    case "CONFIRMED":
      return NotificationEvent.ORDER_CONFIRMED;

    case "READY_TO_SHIP":
      return NotificationEvent.ORDER_READY_TO_SHIP;

    case "SHIPPED":
      return NotificationEvent.ORDER_SHIPPED;

    case "DELIVERED":
      return NotificationEvent.ORDER_DELIVERED;

    case "CANCELLED":
      return NotificationEvent.ORDER_CANCELLED;

    case "FAILED_DELIVERY":
      return NotificationEvent.ORDER_FAILED_DELIVERY;

    default:
      return null;
  }
}

/* =========================================================
   QUEUE ORDER NOTIFICATIONS
   ========================================================= */

export async function queueOrderNotifications({
  orderId,
  event,
  occurrenceKey,
}: {
  orderId:
    string;

  event:
    OrderNotificationEvent;

  occurrenceKey:
    string;
}) {
  const order =
    await db.order.findUnique({
      where: {
        id:
          orderId,
      },

      include: {
        items: {
          select: {
            name:
              true,

            sku:
              true,

            size:
              true,

            color:
              true,

            quantity:
              true,

            unitPrice:
              true,

            lineTotal:
              true,
          },
        },

        customer: {
          select: {
            userId:
              true,
          },
        },

        shipment: {
          select: {
            provider:
              true,

            consignmentId:
              true,

            trackingId:
              true,

            trackingUrl:
              true,
          },
        },
      },
    });

  if (
    !order
  ) {
    throw new Error(
      "Order was not found while creating notifications.",
    );
  }

  const copy =
    getOrderNotificationCopy(
      event,
      order.number,
    );

  const payload = {
    customerName:
      order.customerName,

    orderNumber:
      order.number,

    message:
      copy.message,

    status:
      order.status,

    paymentMethod:
      order.paymentMethod,

    paymentStatus:
      order.paymentStatus,

    subtotal:
      Number(
        order.subtotal,
      ),

    discount:
      Number(
        order.discount,
      ),

    deliveryCharge:
      Number(
        order.deliveryCharge,
      ),

    total:
      Number(
        order.total,
      ),

    shippingAddress:
      order.shippingAddress,

    items:
      order.items.map(
        (
          item,
        ) => ({
          name:
            item.name,

          sku:
            item.sku,

          size:
            item.size,

          color:
            item.color,

          quantity:
            item.quantity,

          unitPrice:
            Number(
              item.unitPrice,
            ),

          lineTotal:
            Number(
              item.lineTotal,
            ),
        }),
      ),

    shipment:
      order.shipment
        ? {
            provider:
              order.shipment
                .provider,

            consignmentId:
              order.shipment
                .consignmentId,

            trackingId:
              order.shipment
                .trackingId,

            trackingUrl:
              order.shipment
                .trackingUrl,
          }
        : null,
  };

  const deliveries =
    [];

  /* =======================================================
     EMAIL
     ======================================================= */

  if (
    order.email?.trim()
  ) {
    deliveries.push(
      await queueNotification({
        event,

        channel:
          NotificationChannel.EMAIL,

        recipient:
          order.email
            .trim()
            .toLowerCase(),

        subject:
          copy.subject,

        orderId:
          order.id,

        userId:
          order.customer
            ?.userId ??
          null,

        payload,

        idempotencyKey:
          `${event}:${occurrenceKey}:EMAIL`,
      }),
    );
  }

  /* =======================================================
     SMS

     SMS queue creation remains disabled until the real
     production SMS provider is connected.
     ======================================================= */

  if (
    process.env
      .SMS_NOTIFICATIONS_ENABLED ===
      "true" &&
    order.phone.trim()
  ) {
    deliveries.push(
      await queueNotification({
        event,

        channel:
          NotificationChannel.SMS,

        recipient:
          order.phone.trim(),

        orderId:
          order.id,

        userId:
          order.customer
            ?.userId ??
          null,

        payload,

        idempotencyKey:
          `${event}:${occurrenceKey}:SMS`,
      }),
    );
  }

  return deliveries;
}

/* =========================================================
   ORDER PLACED
   ========================================================= */

export async function queueOrderPlacedNotifications(
  orderId:
    string,
) {
  return queueOrderNotifications({
    orderId,

    event:
      NotificationEvent.ORDER_PLACED,

    occurrenceKey:
      orderId,
  });
}