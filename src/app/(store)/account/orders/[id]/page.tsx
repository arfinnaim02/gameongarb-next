import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import { formatBDT } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CustomerOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { customer } = await requireCustomer();
  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, customerId: customer.id },
    include: {
      items: true,
      history: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!order) notFound();
  return (
    <>
      <Link href="/account/orders" className="muted" style={{ fontSize: 12 }}>
        ← My Orders
      </Link>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "14px 0 20px",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{order.number}</h1>
          <small className="muted">
            {order.createdAt.toLocaleString("en-BD")}
          </small>
        </div>
        <span
          className={`badge ${order.status === "DELIVERED" ? "green" : order.status === "CANCELLED" ? "red" : "blue"}`}
        >
          {order.status}
        </span>
      </div>
      <section className="card" style={{ padding: 20, marginBottom: 18 }}>
        <h2>Tracking History</h2>
        {order.history.map((event) => (
          <div
            key={event.id}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <small className="muted">
              {event.createdAt.toLocaleString("en-BD")}
            </small>
            <b>{event.newStatus.replaceAll("_", " ")}</b>
          </div>
        ))}
      </section>
      <section className="card" style={{ padding: 20, marginBottom: 18 }}>
        <h2>Items</h2>
        {order.items.map((item) => (
          <article
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr auto",
              gap: 12,
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 60,
                height: 66,
                background: "#f4f4f1",
              }}
            >
              <Image
                src={item.image ?? "/images/products/tshirt.svg"}
                alt={item.name}
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <div>
              <b>{item.name}</b>
              <small className="muted" style={{ display: "block" }}>
                {item.color} / {item.size} · Qty {item.quantity}
              </small>
            </div>
            <b>{formatBDT(Number(item.lineTotal))}</b>
          </article>
        ))}
      </section>
      <div
        className="track-details"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}
      >
        <section className="card" style={{ padding: 20 }}>
          <h2>Shipping</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            {order.customerName}
            <br />
            {order.phone}
            <br />
            {order.shippingAddress}, {order.thana}, {order.district},{" "}
            {order.division}
          </p>
        </section>
        <section className="card" style={{ padding: 20 }}>
          <h2>Payment & Total</h2>
          <Line label="Subtotal" value={Number(order.subtotal)} />
          <Line label="Discount" value={-Number(order.discount)} />
          <Line label="Delivery" value={Number(order.deliveryCharge)} />
          <Line label="Total" value={Number(order.total)} strong />
          <p className="muted" style={{ fontSize: 12 }}>
            {order.paymentMethod} · {order.paymentStatus}
          </p>
        </section>
      </div>
    </>
  );
}

function Line({
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
        padding: "7px 0",
        borderTop: strong ? "1px solid var(--line)" : undefined,
        fontWeight: strong ? 800 : 400,
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
