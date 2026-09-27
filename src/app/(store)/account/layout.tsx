import Link from "next/link";
import {
  Heart,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Settings,
  ShoppingBag,
  Ticket,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const links = [
    [LayoutDashboard, "Dashboard", "/account"],
    [ShoppingBag, "My Orders", "/account/orders"],
    [MapPin, "Addresses", "/account/addresses"],
    [Heart, "Wishlist", "/account/wishlist"],
    [Ticket, "My Coupons", "/account/coupons"],
    [Settings, "Account Settings", "/account/settings"],
    [LifeBuoy, "Support", "/contact"],
  ] as const;
  return (
    <div
      className="container account-layout"
      style={{
        padding: "30px 0 60px",
        display: "grid",
        gridTemplateColumns: "230px 1fr",
        gap: 28,
      }}
    >
      <aside className="desktop-only">
        <div className="card" style={{ padding: 18, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 50,
                display: "grid",
                placeItems: "center",
                background: "#f0f1ef",
              }}
            >
              <UserRound />
            </span>
            <div>
              <b>{user?.name ?? "Customer"}</b>
              <small className="muted" style={{ display: "block" }}>
                {user?.email ?? "Sign in"}
              </small>
            </div>
          </div>
        </div>
        <nav>
          {links.map(([I, label, href]) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
                fontSize: 13,
              }}
            >
              <I size={16} />
              {label}
            </Link>
          ))}
          <form action="/api/auth/logout" method="post">
            <button
              className="btn"
              style={{
                width: "100%",
                justifyContent: "start",
                background: "transparent",
              }}
            >
              Log Out
            </button>
          </form>
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
