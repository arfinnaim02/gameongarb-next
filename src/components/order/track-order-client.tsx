"use client";
import { FormEvent, useState } from "react";
import { Check, PackageCheck, Truck } from "lucide-react";
import { formatBDT } from "@/lib/money";
import Link from "next/link";
type Result = {
  number: string;
  status: string;
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  address: string;
  history: { status: string; at: string }[];
  items: { name: string; quantity: number }[];
};
export function TrackOrderClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const r = await fetch(
      `/api/track-order?order=${encodeURIComponent(String(f.get("order")))}&phone=${encodeURIComponent(String(f.get("phone")))}`,
    );
    const d = await r.json();
    if (!r.ok) setError(d.error);
    else setResult(d);
    setLoading(false);
  }
  const steps = ["NEW", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"];
  const normalizedStatus =
    result?.status === "READY_TO_SHIP" ? "PACKING" : result?.status;
  const current = result
    ? Math.max(0, steps.indexOf(normalizedStatus ?? "NEW"))
    : 0;
  return (
    <div className="container" style={{ padding: "0 0 65px" }}>
      <form
        onSubmit={submit}
        className="card track-form"
        style={{
          padding: 15,
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: 8,
          transform: "translateY(-25px)",
          boxShadow: "0 12px 30px #00000012",
        }}
      >
        <input
          className="field"
          name="order"
          required
          placeholder="Order number (e.g. GOG-20260920-001)"
        />
        <input
          className="field"
          name="phone"
          required
          pattern="01[0-9]{9}"
          placeholder="Phone number"
        />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Checking…" : "Track Order →"}
        </button>
      </form>
      {error && (
        <div
          role="alert"
          style={{ padding: 16, background: "#fff0f0", color: "#a72b2b" }}
        >
          {error}
        </div>
      )}
      {result && (
        <div className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <small className="muted">Order</small>
              <h2 style={{ margin: "3px 0" }}>{result.number}</h2>
            </div>
            <span className="badge green">{result.status}</span>
          </div>
          <div
            className="track-steps"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              margin: "35px 0",
            }}
          >
            {steps.map((s, i) => (
              <div
                key={s}
                style={{
                  position: "relative",
                  textAlign: "center",
                  borderTop: `3px solid ${i <= current ? "var(--orange)" : "#e0e3df"}`,
                  paddingTop: 14,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    left: "calc(50% - 12px)",
                    width: 24,
                    height: 24,
                    borderRadius: 30,
                    display: "grid",
                    placeItems: "center",
                    background: i <= current ? "var(--orange)" : "#e0e3df",
                    color: "white",
                  }}
                >
                  {i <= current ? <Check size={13} /> : i + 1}
                </span>
                <b style={{ fontSize: 11 }}>{s.replaceAll("_", " ")}</b>
                <small
                  className="muted"
                  style={{ display: "block", fontSize: 9 }}
                >
                  {result.history.find((h) => h.status === s)?.at ?? "Pending"}
                </small>
              </div>
            ))}
          </div>
          <div
            className="track-details"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <PackageCheck />
              <h3>Order Items</h3>
              {result.items.map((x) => (
                <p key={x.name} style={{ fontSize: 12 }}>
                  {x.name} × {x.quantity}
                </p>
              ))}
            </div>
            <div>
              <Truck />
              <h3>Shipping Address</h3>
              <p className="muted" style={{ fontSize: 12 }}>
                {result.address}
              </p>
            </div>
            <div>
              <h3>Order Summary</h3>
              <p
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>Subtotal</span>
                <b>{formatBDT(result.subtotal)}</b>
              </p>
              <p
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>Delivery</span>
                <b>{formatBDT(result.delivery)}</b>
              </p>
              <p
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                }}
              >
                <span>Discount</span>
                <b>−{formatBDT(result.discount)}</b>
              </p>
              <b
                style={{
                  display: "block",
                  fontSize: 21,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 10,
                }}
              >
                {formatBDT(result.total)}
              </b>
              <Link
                href="/contact"
                className="btn btn-outline"
                style={{ marginTop: 12, width: "100%" }}
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
