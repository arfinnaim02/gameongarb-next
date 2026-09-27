import { Kpi } from "@/components/admin/kpi";
import { db } from "@/lib/db";
import { formatBDT } from "@/lib/money";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const [
    orderCount,
    customerCount,
    productCount,
    revenue,
    recentOrders,
    topProducts,
    statusGroups,
  ] = await Promise.all([
    db.order.count(),
    db.customer.count(),
    db.product.count(),
    db.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { total: true },
    }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.orderItem.groupBy({
      by: ["productId", "name"],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return (
    <>
      <div>
        <h1 style={{ margin: 0 }}>Welcome Back, Admin! ðŸ‘‹</h1>
        <p className="muted">Live operations from your Neon database.</p>
      </div>
      <div
        className="admin-kpis"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          margin: "22px 0",
        }}
      >
        <Kpi
          label="Total Orders"
          value={String(orderCount)}
          note="Live order count"
        />
        <Kpi
          label="Total Customers"
          value={String(customerCount)}
          note="Registered and guest profiles"
          tone="#24b66f"
        />
        <Kpi
          label="Paid Revenue"
          value={formatBDT(Number(revenue._sum.total ?? 0))}
          note="From paid orders"
          tone="#ef8b38"
        />
        <Kpi
          label="Total Products"
          value={String(productCount)}
          note="All product records"
          tone="#55a7ef"
        />
      </div>
      <div
        className="admin-dashboard-grid"
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}
      >
        <section className="card" style={{ padding: 18 }}>
          <b>Recent Orders</b>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ color: "var(--orange)", fontWeight: 700 }}>
                      {o.number}
                    </td>
                    <td>{o.customerName}</td>
                    <td>{formatBDT(Number(o.total))}</td>
                    <td>
                      {o.paymentMethod} Â· {o.paymentStatus}
                    </td>
                    <td>
                      <span
                        className={`badge ${o.status === "DELIVERED" ? "green" : o.status === "CANCELLED" ? "red" : "orange"}`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card" style={{ padding: 18 }}>
          <b>Orders by Status</b>
          {statusGroups.map((x) => (
            <div
              key={x.status}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "11px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 12,
              }}
            >
              <span>{x.status.replaceAll("_", " ")}</span>
              <b>{x._count._all}</b>
            </div>
          ))}
        </section>
      </div>
      <section className="card" style={{ padding: 18, marginTop: 12 }}>
        <b>Top Selling Products</b>
        {topProducts.length ? (
          topProducts.map((p, i) => (
            <div
              key={`${p.productId}-${p.name}`}
              style={{
                display: "grid",
                gridTemplateColumns: "30px 1fr auto auto",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                fontSize: 12,
              }}
            >
              <b>{i + 1}</b>
              <span>{p.name}</span>
              <span>{p._sum.quantity ?? 0} sold</span>
              <b>{formatBDT(Number(p._sum.lineTotal ?? 0))}</b>
            </div>
          ))
        ) : (
          <p className="muted">
            Sales data will appear after orders are placed.
          </p>
        )}
      </section>
    </>
  );
}

