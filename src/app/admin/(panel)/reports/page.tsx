import { notFound } from "next/navigation";

import { ReportsManager } from "@/components/admin/reports-manager";
import { hasPermission } from "@/lib/business";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireAdmin();

  if (!hasPermission(user.role, "reports")) {
    notFound();
  }

  const orders = await db.order.findMany({
    select: {
      id: true,
      number: true,
      total: true,
      subtotal: true,
      discount: true,
      deliveryCharge: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,

      items: {
        select: {
          productId: true,
          name: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <ReportsManager
      orders={orders.map((order) => ({
        id: order.id,
        number: order.number,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        deliveryCharge: Number(order.deliveryCharge),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),

        items: order.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      }))}
    />
  );
}