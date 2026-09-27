import Link from "next/link";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import { formatBDT } from "@/lib/money";

export const dynamic = "force-dynamic";
export default async function MyOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string }>;
}) {
  const { customer } = await requireCustomer();
  const params = await searchParams;
  const orders = await db.order.findMany({
    where: {
      customerId: customer.id,
      ...(params.status && params.status !== "ALL"
        ? { status: params.status as never }
        : {}),
      ...(params.q
        ? {
            OR: [
              { number: { contains: params.q, mode: "insensitive" } },
              {
                items: {
                  some: { name: { contains: params.q, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { items: true } },
      items: { select: { image: true }, take: 4 },
    },
    orderBy: { createdAt: params.sort === "oldest" ? "asc" : "desc" },
  });
  const tabs = [
    ["ALL", "All"],
    ["CONFIRMED", "Processing"],
    ["SHIPPED", "Shipped"],
    ["DELIVERED", "Delivered"],
    ["CANCELLED", "Cancelled"],
  ];
  return (
    <>
      <h1>My Orders</h1>
      <p className="muted">
        Track, manage and view the details of your orders.
      </p>
      <div
        style={{
          display: "flex",
          gap: 15,
          borderBottom: "1px solid var(--line)",
          marginBottom: 15,
        }}
      >
        {tabs.map(([value, label]) => (
          <Link
            key={value}
            href={
              value === "ALL"
                ? "/account/orders"
                : `/account/orders?status=${value}`
            }
            style={{
              borderBottom:
                (params.status ?? "ALL") === value
                  ? "2px solid var(--orange)"
                  : "2px solid transparent",
              padding: "11px 3px",
              fontSize: 13,
            }}
          >
            {label}
          </Link>
        ))}
      </div>
      <form style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          name="q"
          className="field"
          defaultValue={params.q}
          placeholder="Search by order ID or product name…"
        />
        <select
          name="sort"
          className="field"
          defaultValue={params.sort ?? "newest"}
          style={{ maxWidth: 140 }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
        <button className="btn btn-outline">Search</button>
      </form>
      {orders.length ? (
        orders.map((o) => (
          <article
            className="card account-order"
            key={o.number}
            style={{
              padding: 16,
              marginBottom: 10,
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div>
              <b>{o.number}</b>
              <small className="muted" style={{ display: "block" }}>
                {o.createdAt.toLocaleDateString("en-BD")} · {o._count.items}{" "}
                items
              </small>
            </div>
            <b>{formatBDT(Number(o.total))}</b>
            <span
              className={`badge ${o.status === "DELIVERED" ? "green" : o.status === "CANCELLED" ? "red" : "blue"}`}
            >
              {o.status}
            </span>
            <Link href={`/account/orders/${o.id}`} className="btn btn-outline">
              View Details
            </Link>
          </article>
        ))
      ) : (
        <div className="card" style={{ padding: 45, textAlign: "center" }}>
          <h2>No orders found</h2>
          <p className="muted">Your matching orders will appear here.</p>
          <Link href="/shop" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      )}
    </>
  );
}
