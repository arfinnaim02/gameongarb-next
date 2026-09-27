"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function BkashMockButton({
  orderNumber,
  disabled,
}: {
  orderNumber: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    const response = await fetch("/api/payments/bkash/mock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/checkout/success/${orderNumber}`);
  }
  return (
    <>
      <button
        className="btn btn-primary"
        style={{ width: "100%", background: "#d82b68" }}
        disabled={busy || disabled}
        onClick={pay}
      >
        {disabled
          ? "Payment Completed"
          : busy
            ? "Processing…"
            : "Complete Sandbox Payment"}
      </button>
      {error && <p style={{ color: "#b52c2c" }}>{error}</p>}
    </>
  );
}
