import type { Metadata } from "next";
import { TrackOrderClient } from "@/components/order/track-order-client";
export const metadata: Metadata = { title: "Track Order" };
export default function TrackOrder() {
  return (
    <>
      <section
        style={{
          background: "linear-gradient(110deg,#070909,#3e1f14 70%,#111)",
          color: "white",
          padding: "52px 0",
        }}
      >
        <div className="container">
          <div className="eyebrow">Track your order</div>
          <h1
            className="display"
            style={{ fontSize: "clamp(3rem,7vw,5rem)", margin: "12px 0" }}
          >
            Stay in the <span style={{ color: "var(--orange)" }}>game.</span>
          </h1>
          <p>
            Enter your order number to get real-time updates on your delivery.
          </p>
        </div>
      </section>
      <TrackOrderClient />
    </>
  );
}

