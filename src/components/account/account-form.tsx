"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
export function AccountForm({
  resource,
  defaults = {},
}: {
  resource: "addresses" | "settings";
  defaults?: Record<string, string>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const response = await fetch(`/api/account/${resource}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? (result.message ?? "Saved")
        : (result.error ?? "Could not save"),
    );
    if (response.ok) router.refresh();
  }
  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ padding: 20, marginTop: 18, display: "grid", gap: 12 }}
    >
      <h2>{resource === "addresses" ? "Add Address" : "Update Profile"}</h2>
      {resource === "addresses" ? (
        <>
          <Field name="label" label="Label" value="Home" />
          <Field name="fullName" label="Full Name" />
          <Field name="phone" label="Phone" />
          <Field name="division" label="Division" />
          <Field name="district" label="District" />
          <Field name="thana" label="Thana / Upazila" />
          <Field name="address" label="Full Address" />
        </>
      ) : (
        <>
          <Field name="name" label="Name" value={defaults.name} />
          <Field name="phone" label="Phone" value={defaults.phone} />
          <Field
            name="currentPassword"
            label="Current Password (required to change password)"
            type="password"
            required={false}
          />
          <Field
            name="password"
            label="New Password (optional)"
            type="password"
            required={false}
          />
        </>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
function Field({
  name,
  label,
  value,
  type = "text",
  required = true,
}: {
  name: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        name={name}
        type={type}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
