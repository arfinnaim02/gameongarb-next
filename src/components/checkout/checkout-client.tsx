/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, LockKeyhole, MapPin, PackageCheck, Truck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { deliveryFee } from "@/lib/business";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/shared/store-provider";
type PublicSettings = {
  insideDhaka: number;
  outsideDhaka: number;
  codEnabled: boolean;
  bkashEnabled: boolean;
};
export function CheckoutClient() {
  const { cart, clear } = useStore();
  const router = useRouter();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [district, setDistrict] = useState("Dhaka");
  const [payment, setPayment] = useState<"COD" | "BKASH">("COD");
  const [coupon, setCoupon] = useState("");
  const [couponOk, setCouponOk] = useState(false);
  const [automaticCouponId, setAutomaticCouponId] = useState("");
  const [couponTitle, setCouponTitle] = useState("");
  const [couponDiscountValue, setCouponDiscountValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setError("Unable to load delivery settings. Please retry."));
  }, []);
  const subtotal = cart.reduce((n, x) => n + x.product.price * x.quantity, 0);
  const fee = settings ? deliveryFee(district, settings) : 0;
  const discount = couponOk ? couponDiscountValue : 0;
  const total = subtotal + fee - discount;
  useEffect(() => {
    if (settings && !settings.codEnabled && settings.bkashEnabled)
      setPayment("BKASH");
  }, [settings]);
  useEffect(() => {
    setCouponOk(false);
    setCouponDiscountValue(0);
  }, [district, cart]);
  useEffect(() => {
    if (!settings || !cart.length) return;
    let cancelled = false;
    fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        district,
        items: cart.map((item) => ({
          productId: item.product.id,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })),
      }),
    })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (cancelled || !response.ok || !result.couponId) return;
        setCoupon("");
        setAutomaticCouponId(result.couponId);
        setCouponTitle(result.title ?? "Automatic offer");
        setCouponDiscountValue(result.discount);
        setCouponOk(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [settings, district, cart]);
  async function applyCoupon(automatic = false) {
    setError("");
    setCouponOk(false);
    setCouponDiscountValue(0);
    const response = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(automatic ? {} : { code: coupon }),
        district,
        items: cart.map((x) => ({
          productId: x.product.id,
          size: x.size,
          color: x.color,
          quantity: x.quantity,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (automatic) return;
      setError(result.error ?? "Coupon could not be applied.");
      return;
    }
    setCoupon(result.code ?? "AUTO");
    setAutomaticCouponId(result.couponId ?? "");
    setCouponTitle(result.title ?? result.code ?? "Offer");
    setCouponDiscountValue(result.discount);
    setCouponOk(true);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart.length) {
      setError("Your cart is empty.");
      return;
    }
    setSaving(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      fullName: f.get("fullName"),
      phone: f.get("phone"),
      email: f.get("email") || undefined,
      division: f.get("division"),
      district: f.get("district"),
      thana: f.get("thana"),
      address: f.get("address"),
      paymentMethod: payment,
      couponCode: couponOk && !automaticCouponId ? coupon : undefined,
      automaticCouponId: couponOk ? automaticCouponId || undefined : undefined,
      items: cart.map((x) => ({
        productId: x.product.id,
        size: x.size,
        color: x.color,
        quantity: x.quantity,
      })),
    };
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res
      .json()
      .catch(() => ({ error: "Order could not be placed." }));
    if (!res.ok) {
      setError(data.error || "Order could not be placed.");
      setSaving(false);
      return;
    }
    clear();
    router.push(
      data.paymentMode === "cod"
        ? `/checkout/success/${data.orderNumber}`
        : `/payment/bkash/${data.orderNumber}`,
    );
  }
  return (
    <div className="container" style={{ padding: "28px 0 60px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "clamp(25px,8vw,100px)",
          fontSize: 11,
          marginBottom: 30,
        }}
      >
        {["Shipping", "Payment", "Review", "Complete"].map((x, i) => (
          <div
            key={x}
            style={{
              textAlign: "center",
              color: i === 0 ? "var(--orange)" : "#9ba09d",
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                margin: "auto auto 5px",
                width: 25,
                height: 25,
                borderRadius: 30,
                background: i === 0 ? "var(--orange)" : "#edf0ec",
                color: i === 0 ? "white" : "inherit",
              }}
            >
              {i + 1}
            </span>
            {x}
          </div>
        ))}
      </div>
      <h1 style={{ fontSize: 30, marginBottom: 4 }}>Checkout</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Complete your order in a few simple steps.
      </p>
      <form
        onSubmit={submit}
        className="checkout-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) 380px",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <section className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17 }}>
              <span style={{ color: "var(--orange)" }}>1</span> Shipping
              Information
            </h2>
            <div
              className="checkout-fields"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <label>
                <span className="label">Full Name *</span>
                <input name="fullName" className="field" required />
              </label>
              <label>
                <span className="label">Phone Number *</span>
                <input
                  name="phone"
                  className="field"
                  pattern="01[0-9]{9}"
                  required
                  placeholder="01XXXXXXXXX"
                />
              </label>
              <label style={{ gridColumn: "1/-1" }}>
                <span className="label">Email Address (optional)</span>
                <input name="email" type="email" className="field" />
              </label>
              <label>
                <span className="label">Division *</span>
                <select
                  name="division"
                  className="field"
                  required
                  defaultValue="Dhaka"
                >
                  <option>Dhaka</option>
                  <option>Chattogram</option>
                  <option>Rajshahi</option>
                  <option>Khulna</option>
                  <option>Barishal</option>
                  <option>Sylhet</option>
                  <option>Rangpur</option>
                  <option>Mymensingh</option>
                </select>
              </label>
              <label>
                <span className="label">District *</span>
                <select
                  name="district"
                  className="field"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  <option>Dhaka</option>
                  <option>Gazipur</option>
                  <option>Narayanganj</option>
                  <option>Chattogram</option>
                  <option>Cumilla</option>
                  <option>Rajshahi</option>
                  <option>Sylhet</option>
                  <option>Khulna</option>
                </select>
              </label>
              <label style={{ gridColumn: "1/-1" }}>
                <span className="label">Thana / Upazila *</span>
                <input name="thana" className="field" required />
              </label>
              <label style={{ gridColumn: "1/-1" }}>
                <span className="label">Full Address *</span>
                <textarea name="address" className="field" rows={3} required />
              </label>
            </div>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17 }}>
              <span style={{ color: "var(--orange)" }}>2</span> Delivery
              Information
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Truck />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13 }}>Standard Delivery</b>
                <small className="muted" style={{ display: "block" }}>
                  One simple delivery method · 2–4 working days
                </small>
              </div>
              <b>{settings ? formatBDT(fee) : "Loading…"}</b>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "#eff6fb",
                fontSize: 11,
              }}
            >
              <MapPin size={15} style={{ display: "inline", marginRight: 6 }} />
              Inside Dhaka {settings ? formatBDT(settings.insideDhaka) : "—"} ·
              Outside Dhaka {settings ? formatBDT(settings.outsideDhaka) : "—"}
            </div>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 17 }}>
              <span style={{ color: "var(--orange)" }}>3</span> Payment Method
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {settings?.codEnabled !== false && (
                <label
                  style={{
                    border:
                      payment === "COD"
                        ? "2px solid var(--orange)"
                        : "1px solid var(--line)",
                    padding: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "COD"}
                    onChange={() => setPayment("COD")}
                  />{" "}
                  <b>Cash on Delivery</b>
                  <small
                    className="muted"
                    style={{ display: "block", marginLeft: 20 }}
                  >
                    Pay when you receive
                  </small>
                </label>
              )}
              {settings?.bkashEnabled && (
                <label
                  style={{
                    border:
                      payment === "BKASH"
                        ? "2px solid #d72d69"
                        : "1px solid var(--line)",
                    padding: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "BKASH"}
                    onChange={() => setPayment("BKASH")}
                  />{" "}
                  <b>bKash</b>
                  <small
                    className="muted"
                    style={{ display: "block", marginLeft: 20 }}
                  >
                    Secure sandbox checkout
                  </small>
                </label>
              )}
            </div>
          </section>
        </div>
        <aside
          className="card checkout-summary"
          style={{ padding: 20, position: "sticky", top: 84 }}
        >
          <h2 style={{ fontSize: 18 }}>Order Summary ({cart.length} items)</h2>
          {cart.map((x) => (
            <div
              key={x.product.id}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr auto",
                gap: 9,
                alignItems: "center",
                padding: "9px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: 54,
                  background: "#f4f4f1",
                }}
              >
                <Image
                  src={x.product.image}
                  alt=""
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div>
                <b style={{ fontSize: 11 }}>{x.product.name}</b>
                <small className="muted" style={{ display: "block" }}>
                  {x.size} · {x.quantity}
                </small>
              </div>
              <b style={{ fontSize: 11 }}>
                {formatBDT(x.product.price * x.quantity)}
              </b>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="field"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Have a coupon?"
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => applyCoupon(false)}
              >
                Apply
              </button>
            </div>
            {couponOk && (
              <div
                style={{
                  padding: 10,
                  marginTop: 8,
                  background: "#eaf8f0",
                  color: "#087844",
                  fontSize: 11,
                }}
              >
                <Check size={14} style={{ display: "inline" }} /> {couponTitle}
                {automaticCouponId
                  ? " applied automatically"
                  : ` (${coupon}) applied`}{" "}
                · You save {formatBDT(discount)}
                <button
                  type="button"
                  onClick={() => {
                    setCouponOk(false);
                    setCouponDiscountValue(0);
                    setAutomaticCouponId("");
                    setCouponTitle("");
                    setCoupon("");
                  }}
                  style={{
                    border: 0,
                    background: "none",
                    textDecoration: "underline",
                    marginLeft: 8,
                    color: "inherit",
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          {[
            ["Subtotal", subtotal],
            ["Delivery", fee],
            ["Discount", -discount],
          ].map(([k, v]) => (
            <div
              key={k as string}
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 12,
                fontSize: 13,
              }}
            >
              <span className="muted">{k as string}</span>
              <span>
                {Number(v) < 0 ? "− " : ""}
                {formatBDT(Math.abs(Number(v)))}
              </span>
            </div>
          ))}
          <hr style={{ border: 0, borderTop: "1px solid var(--line)" }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 20,
            }}
          >
            <b>Total</b>
            <b>{formatBDT(total)}</b>
          </div>
          {error && (
            <p
              role="alert"
              style={{
                background: "#fff0f0",
                color: "#b52c2c",
                padding: 10,
                fontSize: 12,
              }}
            >
              {error}
            </p>
          )}
          <button
            disabled={saving || !settings}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 18 }}
          >
            <LockKeyhole size={17} />
            {saving
              ? "Placing Order…"
              : payment === "BKASH"
                ? "Continue to bKash"
                : "Place Order"}
          </button>
          <div
            style={{
              display: "flex",
              gap: 7,
              marginTop: 13,
              fontSize: 10,
              color: "#747976",
            }}
          >
            <PackageCheck size={16} /> Server validates stock, prices, shipping
            and coupons before order creation.
          </div>
        </aside>
      </form>
    </div>
  );
}
