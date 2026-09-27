import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import { BkashMockButton } from "@/components/payment/bkash-mock-button";
import { headers } from "next/headers";
import { canAccessOrder } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function BkashPayment({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const request = new Request("http://local", { headers: await headers() });
  if (!(await canAccessOrder(request, orderNumber))) notFound();
  const order = await db.order.findUnique({
    where: { number: orderNumber },
    select: {
      number: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  });
  if (!order || order.paymentMethod !== "BKASH") notFound();
  const mode = process.env.BKASH_MODE ?? "sandbox";
  return (
    <div className="container" style={{ padding: "70px 0" }}>
      <div
        className="card"
        style={{
          maxWidth: 470,
          margin: "auto",
          padding: 28,
          textAlign: "center",
          borderTop: "5px solid #d82b68",
        }}
      >
        <div className="eyebrow" style={{ color: "#d82b68" }}>
          bKash {mode.toUpperCase()}
        </div>
        <h1>Complete Payment</h1>
        <p>Order {order.number}</p>
        <strong style={{ display: "block", fontSize: 30, margin: 20 }}>
          {formatBDT(Number(order.total))}
        </strong>
        <p className="muted">
          This local flow is clearly marked as {mode}. It does not claim a
          production payment.
        </p>
        <BkashMockButton
          orderNumber={order.number}
          disabled={order.paymentStatus === "PAID"}
        />
      </div>
    </div>
  );
}
