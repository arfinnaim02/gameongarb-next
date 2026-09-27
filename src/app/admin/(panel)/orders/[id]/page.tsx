import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/business";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdmin();
  if (!hasPermission(user.role, "orders")) notFound();
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      history: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
    },
  });
  if (!order) notFound();
  return (
    <>
      <Link href="/admin/orders" className="muted" style={{ fontSize: 12 }}>
        ← Back to orders
      </Link>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "start",
          marginTop: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{order.number}</h1>
          <p className="muted">Placed {order.createdAt.toLocaleString()}</p>
        </div>
        <span
          className={`badge ${order.status === "DELIVERED" ? "green" : order.status === "CANCELLED" ? "red" : "orange"}`}
        >
          {order.status}
        </span>
      </div>
      <div
        className="admin-dashboard-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(280px,.6fr)",
          gap: 18,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <section className="card" style={{ padding: 20 }}>
            <h2>Items</h2>
            {order.items.map((item) => (
              <article
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "64px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 64,
                    height: 70,
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
                    {item.sku} · {item.color ?? "Default"} /{" "}
                    {item.size ?? "One Size"} · Qty {item.quantity}
                  </small>
                </div>
                <b>{formatBDT(Number(item.lineTotal))}</b>
              </article>
            ))}
          </section>
          <section className="card" style={{ padding: 20 }}>
            <h2>Status History</h2>
            {order.history.map((event) => (
              <div
                key={event.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <small className="muted">
                  {event.createdAt.toLocaleString()}
                </small>
                <div>
                  <b>
                    {event.oldStatus ? `${event.oldStatus} → ` : ""}
                    {event.newStatus}
                  </b>
                  <small className="muted" style={{ display: "block" }}>
                    {event.note ?? event.source}
                  </small>
                </div>
              </div>
            ))}
          </section>
        </div>
        <aside style={{ display: "grid", gap: 18 }}>
          <section className="card" style={{ padding: 20 }}>
            <h2>Customer</h2>
            <b>{order.customerName}</b>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              {order.phone}
              <br />
              {order.email ?? "No email"}
              <br />
              {order.shippingAddress}, {order.thana}, {order.district},{" "}
              {order.division}
            </p>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <h2>Totals</h2>
            <Total label="Subtotal" value={Number(order.subtotal)} />
            <Total label="Discount" value={-Number(order.discount)} />
            <Total label="Delivery" value={Number(order.deliveryCharge)} />
            <Total label="Total" value={Number(order.total)} strong />
            <p className="muted" style={{ fontSize: 12 }}>
              {order.paymentMethod} · {order.paymentStatus}
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Total({
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
        padding: "8px 0",
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
