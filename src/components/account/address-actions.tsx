"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddressActions({
  id,
  isDefault,
}: {
  id: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function mutate(method: "PATCH" | "DELETE") {
    if (method === "DELETE" && !window.confirm("Remove this saved address?"))
      return;
    setBusy(true);
    const response = await fetch("/api/account/addresses", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {!isDefault && (
        <button
          className="btn btn-outline"
          style={{ minHeight: 34, padding: 7 }}
          disabled={busy}
          onClick={() => mutate("PATCH")}
        >
          Make Default
        </button>
      )}
      <button
        className="btn"
        style={{
          minHeight: 34,
          padding: 7,
          color: "#b42318",
          background: "transparent",
        }}
        disabled={busy}
        onClick={() => mutate("DELETE")}
      >
        Remove
      </button>
    </div>
  );
}
