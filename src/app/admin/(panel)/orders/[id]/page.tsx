import {
  notFound,
} from "next/navigation";

import {
  OrderDetailClient,
  type OrderDetailData,
} from "@/components/admin/order-detail-client";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id,
  } =
    await params;

  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "orders",
    )
  ) {
    notFound();
  }

  const order =
    await db.order.findUnique({
      where: {
        id,
      },

      include: {
        items: true,

        history: {
          orderBy: {
            createdAt:
              "asc",
          },
        },

        payments: {
          orderBy: {
            createdAt:
              "desc",
          },
        },

shipment: {
  include: {
    events: {
      orderBy: {
        createdAt:
          "desc",
      },

      take:
        10,
    },
  },
},
      },
    });

  if (!order) {
    notFound();
  }

  const customerOrders =
    await db.order.findMany({
      where: {
        phone:
          order.phone,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      select: {
        id:
          true,

        number:
          true,

        total:
          true,

        status:
          true,

        paymentMethod:
          true,

        createdAt:
          true,
      },
    });

  const previousOrders =
    customerOrders.filter(
      (
        customerOrder,
      ) =>
        customerOrder.id !==
        order.id,
    );

  const deliveredOrders =
    customerOrders.filter(
      (
        customerOrder,
      ) =>
        customerOrder.status ===
        "DELIVERED",
    );

  const cancelledOrders =
    customerOrders.filter(
      (
        customerOrder,
      ) =>
        customerOrder.status ===
        "CANCELLED",
    );

  const failedOrders =
    customerOrders.filter(
      (
        customerOrder,
      ) =>
        customerOrder.status ===
        "FAILED_DELIVERY",
    );

  const returnedOrders =
    customerOrders.filter(
      (
        customerOrder,
      ) =>
        customerOrder.status ===
          "RETURNED" ||
        customerOrder.status ===
          "RETURN_REQUESTED",
    );

  const deliveredValue =
    deliveredOrders.reduce(
      (
        total,
        customerOrder,
      ) =>
        total +
        Number(
          customerOrder.total,
        ),
      0,
    );

  const data:
    OrderDetailData = {
    order: {
      id:
        order.id,

      number:
        order.number,

      status:
        order.status,

      paymentMethod:
        order.paymentMethod,

      paymentStatus:
        order.paymentStatus,

      customerName:
        order.customerName,

      phone:
        order.phone,

      email:
        order.email,

      division:
        order.division,

      district:
        order.district,

      thana:
        order.thana,

      shippingAddress:
        order.shippingAddress,

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

      couponCode:
        order.couponCode,

      internalNotes:
        order.internalNotes ??
        "",

      createdAt:
        order.createdAt.toISOString(),

      updatedAt:
        order.updatedAt.toISOString(),
    },

    items:
      order.items.map(
        (
          item,
        ) => ({
          id:
            item.id,

          productId:
            item.productId,

          variantId:
            item.variantId,

          name:
            item.name,

          sku:
            item.sku,

          size:
            item.size,

          color:
            item.color,

          image:
            item.image,

          unitPrice:
            Number(
              item.unitPrice,
            ),

          quantity:
            item.quantity,

          lineTotal:
            Number(
              item.lineTotal,
            ),
        }),
      ),

    history:
      order.history.map(
        (
          event,
        ) => ({
          id:
            event.id,

          oldStatus:
            event.oldStatus,

          newStatus:
            event.newStatus,

          changedBy:
            event.changedBy,

          note:
            event.note,

          source:
            event.source,

          createdAt:
            event.createdAt.toISOString(),
        }),
      ),

    payments:
      order.payments.map(
        (
          payment,
        ) => ({
          id:
            payment.id,

          method:
            payment.method,

          status:
            payment.status,

          amount:
            Number(
              payment.amount,
            ),

          providerReference:
            payment.providerReference,

          createdAt:
            payment.createdAt.toISOString(),

          updatedAt:
            payment.updatedAt.toISOString(),
        }),
      ),

    shipment:
  order.shipment
    ? {
        id:
          order.shipment.id,

        provider:
          order.shipment
            .provider,

        consignmentId:
          order.shipment
            .consignmentId,

        trackingId:
          order.shipment
            .trackingId,

        status:
          order.shipment
            .status,

        labelUrl:
          order.shipment
            .labelUrl,

        trackingUrl:
          order.shipment
            .trackingUrl,

        codAmount:
          order.shipment
            .codAmount
            ? Number(
                order.shipment
                  .codAmount,
              )
            : null,

        lastSyncedAt:
          order.shipment
            .lastSyncedAt
            ?.toISOString() ??
          null,

        events:
          order.shipment
            .events
            .map(
              (
                event,
              ) => ({
                id:
                  event.id,

                status:
                  event.status,

                message:
                  event.message,

                source:
                  event.source,

                externalAt:
                  event.externalAt
                    ?.toISOString() ??
                  null,

                createdAt:
                  event.createdAt
                    .toISOString(),
              }),
            ),

        createdAt:
          order.shipment
            .createdAt
            .toISOString(),

        updatedAt:
          order.shipment
            .updatedAt
            .toISOString(),
      }
    : null,

    risk: {
      status:
        "PENDING",

      score:
        null,
    },
  };

  return (
    <OrderDetailClient
      data={
        data
      }
    />
  );
}