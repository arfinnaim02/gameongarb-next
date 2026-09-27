import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCustomer } from "@/lib/session";
import { toStoreProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";
import { AccountForm } from "@/components/account/account-form";
import { AddressActions } from "@/components/account/address-actions";

export const dynamic = "force-dynamic";
export default async function AccountSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const { user, customer } = await requireCustomer();
  if (section === "wishlist") {
    const wishlist = await db.wishlist.findUnique({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: true,
                categories: { include: { category: true } },
              },
            },
          },
        },
      },
    });
    const products =
      wishlist?.items.map((x) => toStoreProduct(x.product)) ?? [];
    return (
      <>
        <h1>My Wishlist</h1>
        <p className="muted">Saved products synchronized with your account.</p>
        {products.length ? (
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <Empty text="Your wishlist is empty." />
        )}
      </>
    );
  }
  if (section === "addresses") {
    const addresses = await db.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return (
      <>
        <h1>Saved Addresses</h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 12,
          }}
        >
          {addresses.map((a) => (
            <div className="card" style={{ padding: 18 }} key={a.id}>
              <b>
                {a.label}{" "}
                {a.isDefault && <span className="badge green">Default</span>}
              </b>
              <p>
                {a.fullName}
                <br />
                {a.phone}
              </p>
              <p className="muted">
                {a.address}, {a.thana}, {a.district}, {a.division}
              </p>
              <AddressActions id={a.id} isDefault={a.isDefault} />
            </div>
          ))}
        </div>
        <AccountForm resource="addresses" />
      </>
    );
  }
  if (section === "coupons") {
    const coupons = await db.coupon.findMany({
      where: {
        active: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { validUntil: "asc" },
    });
    return (
      <>
        <h1>My Coupons</h1>
        {coupons.map((c) => (
          <div
            className="card"
            style={{
              padding: 18,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
            }}
            key={c.id}
          >
            <div>
              <b>{c.title}</b>
              <p className="muted" style={{ marginBottom: 0 }}>
                {c.code ?? "Automatic offer"}
              </p>
            </div>
            <strong className="price">
              {c.type === "PERCENTAGE"
                ? `${Number(c.value)}% OFF`
                : c.type === "FREE_SHIPPING"
                  ? "FREE SHIPPING"
                  : `৳ ${Number(c.value)} OFF`}
            </strong>
          </div>
        ))}
      </>
    );
  }
  if (section === "settings")
    return (
      <>
        <h1>Account Settings</h1>
        <AccountForm
          resource="settings"
          defaults={{ name: user.name, phone: user.phone ?? customer.phone }}
        />
      </>
    );
  notFound();
}
function Empty({ text }: { text: string }) {
  return (
    <div className="card" style={{ padding: 45, textAlign: "center" }}>
      <h2>{text}</h2>
      <p className="muted">Browse the shop to add something new.</p>
    </div>
  );
}
