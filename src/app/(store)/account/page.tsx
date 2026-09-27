import Link from "next/link";
import { Heart, MapPin, PackageCheck, Ticket } from "lucide-react";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import { getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";
import { formatBDT } from "@/lib/money";

export const dynamic = "force-dynamic";
export default async function Account() {
  const { user, customer } = await requireCustomer();
  const [profile, coupons, recommended] = await Promise.all([
    db.customer.findUniqueOrThrow({
      where: { id: customer.id },
      include: {
        addresses: true,
        wishlist: { include: { items: true } },
        orders: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    }),
    db.coupon.count({
      where: {
        active: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    }),
    getProducts({ featured: true, take: 4 }),
  ]);
  const totalOrders = await db.order.count({
    where: { customerId: customer.id },
  });
  return (
    <>
      <h1 style={{ marginTop: 0 }}>My Account</h1>
      <p className="muted">
        Welcome back, {user.name}! Manage your orders, addresses and account
        details.
      </p>
      <div
        className="account-metrics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
        }}
      >
        {[
          [PackageCheck, String(totalOrders), "Total Orders"],
          [MapPin, String(profile.addresses.length), "Saved Addresses"],
          [
            Heart,
            String(profile.wishlist?.items.length ?? 0),
            "Wishlist Items",
          ],
          [Ticket, String(coupons), "Available Coupons"],
        ].map(([I, n, t]) => {
          const Icon = I as typeof Heart;
          return (
            <div className="card" key={String(t)} style={{ padding: 16 }}>
              <Icon size={19} color="var(--orange)" />
              <b style={{ display: "block", fontSize: 20, marginTop: 8 }}>
                {String(n)}
              </b>
              <small className="muted">{String(t)}</small>
            </div>
          );
        })}
      </div>
      <section className="card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 17 }}>Recent Orders</h2>
          <Link href="/account/orders" style={{ fontSize: 11 }}>
            View All Orders â†’
          </Link>
        </div>
        {profile.orders.length ? (
          profile.orders.map((o) => (
            <div
              key={o.number}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 15,
                padding: "12px 0",
                borderTop: "1px solid var(--line)",
                fontSize: 12,
              }}
            >
              <div>
                <b>{o.number}</b>
                <small className="muted" style={{ display: "block" }}>
                  {o.createdAt.toLocaleDateString("en-BD")}
                </small>
              </div>
              <b>{formatBDT(Number(o.total))}</b>
              <span
                className={`badge ${o.status === "DELIVERED" ? "green" : o.status === "CANCELLED" ? "red" : "blue"}`}
              >
                {o.status}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">No orders yet.</p>
        )}
      </section>
      <h2 style={{ fontSize: 18, marginTop: 24 }}>Recommended for You</h2>
      <div className="grid-products">
        {recommended.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

