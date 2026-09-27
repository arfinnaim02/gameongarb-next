import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock3, PackageCheck, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import { headers } from "next/headers";
import { canAccessOrder } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function Success({
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
      createdAt: true,
      paymentMethod: true,
      status: true,
      customerName: true,
      shippingAddress: true,
      thana: true,
      district: true,
      division: true,
      subtotal: true,
      discount: true,
      deliveryCharge: true,
      total: true,
      items: true,
    },
  });
  if (!order) notFound();
  const stepStatus = ["NEW", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"];
  const current = Math.max(0, stepStatus.indexOf(order.status));
  return (
    <div
      className="container"
      style={{ padding: "60px 0", textAlign: "center" }}
    >
      <div
        style={{
          margin: "auto",
          width: 65,
          height: 65,
          borderRadius: 70,
          display: "grid",
          placeItems: "center",
          background: "#e7f8ee",
          color: "var(--green)",
        }}
      >
        <Check size={34} />
      </div>
      <h1>Thank You! Your Order Has Been Placed.</h1>
      <p className="muted">
        We’ve received your order and will send updates shortly.
      </p>
      <b>Order #{order.number}</b>
      <p className="price" style={{ fontSize: 22 }}>
        {formatBDT(Number(order.total))}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 9,
          margin: "22px 0",
        }}
      >
        <Link
          href={`/track-order?order=${order.number}`}
          className="btn btn-primary"
        >
          Track Order
        </Link>
        <Link href="/shop" className="btn btn-outline">
          Continue Shopping
        </Link>
      </div>
      <div
        className="card"
        style={{
          maxWidth: 820,
          margin: "32px auto",
          padding: 24,
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
          }}
        >
          {[
            [Check, "Order Placed"],
            [Clock3, "Processing"],
            [PackageCheck, "Packed"],
            [Truck, "Delivered"],
          ].map(([I, label], i) => {
            const Icon = I as typeof Check;
            return (
              <div
                key={String(label)}
                style={{
                  padding: 15,
                  borderTop: `3px solid ${i <= current ? "var(--orange)" : "#e3e5e2"}`,
                }}
              >
                <Icon
                  size={20}
                  color={i <= current ? "var(--orange)" : "#aaa"}
                />
                <b style={{ display: "block", fontSize: 12, marginTop: 7 }}>
                  {String(label)}
                </b>
                <small className="muted">
                  {i <= current ? "Complete" : "Pending"}
                </small>
              </div>
            );
          })}
        </div>
        <div
          className="track-details"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 22,
            marginTop: 24,
          }}
        >
          <div>
            <h3>Ordered Items</h3>
            {order.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 12,
                }}
              >
                <span>
                  {item.name} × {item.quantity}
                  <small className="muted" style={{ display: "block" }}>
                    {item.color} / {item.size}
                  </small>
                </span>
                <b>{formatBDT(Number(item.lineTotal))}</b>
              </div>
            ))}
          </div>
          <div>
            <h3>Delivery & Total</h3>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              {order.customerName}
              <br />
              {order.shippingAddress}, {order.thana}, {order.district},{" "}
              {order.division}
            </p>
            <Summary label="Subtotal" value={Number(order.subtotal)} />
            <Summary label="Discount" value={-Number(order.discount)} />
            <Summary label="Delivery" value={Number(order.deliveryCharge)} />
            <Summary label="Total" value={Number(order.total)} strong />
          </div>
        </div>
        <div
          style={{
            background: "#fff3eb",
            padding: 13,
            marginTop: 20,
            fontSize: 12,
          }}
        >
          Placed {order.createdAt.toLocaleString("en-BD")} ·{" "}
          {order.paymentMethod}. For private delivery details, track with the
          order phone number.
        </div>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        fontWeight: strong ? 800 : 400,
        borderTop: strong ? "1px solid var(--line)" : undefined,
      }}
    >
      <span>{label}</span>
      <span>
        {value < 0 ? "−" : ""}
        {formatBDT(Math.abs(value))}
      </span>
    </div>
  );
}
