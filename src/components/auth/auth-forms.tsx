"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

function useMutation() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return { busy, setBusy, message, setMessage, error, setError };
}

export function RegisterForm() {
  const state = useMutation();
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    state.setBusy(true);
    state.setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      state.setError(result.error ?? "Registration failed.");
      state.setBusy(false);
      return;
    }
    router.push("/account");
    router.refresh();
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <Field name="name" label="Full Name" autoComplete="name" />
      <Field
        name="phone"
        label="Phone Number"
        pattern="01[0-9]{9}"
        placeholder="01XXXXXXXXX"
        autoComplete="tel"
      />
      <Field name="email" label="Email" type="email" autoComplete="email" />
      <Field
        name="password"
        label="Password"
        type="password"
        minLength={8}
        autoComplete="new-password"
      />
      <Field
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        minLength={8}
        autoComplete="new-password"
      />
      {state.error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {state.error}
        </p>
      )}
      <button className="btn btn-primary" disabled={state.busy}>
        {state.busy ? "Creating account…" : "Create Account"}
      </button>
      <Link href="/account/login" style={{ textAlign: "center", fontSize: 12 }}>
        Already registered? Sign in
      </Link>
    </form>
  );
}

export function ForgotPasswordForm() {
  const state = useMutation();
  const [resetUrl, setResetUrl] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    state.setBusy(true);
    state.setError("");
    const email = new FormData(event.currentTarget).get("email");
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    state.setBusy(false);
    if (!response.ok) return state.setError(result.error);
    state.setMessage(result.message);
    setResetUrl(result.resetUrl ?? "");
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <Field
        name="email"
        label="Account Email"
        type="email"
        autoComplete="email"
      />
      {state.error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {state.error}
        </p>
      )}
      {state.message && <p style={{ color: "#087844" }}>{state.message}</p>}
      {resetUrl && (
        <Link href={resetUrl} className="btn btn-outline">
          Open local reset link
        </Link>
      )}
      <button className="btn btn-primary" disabled={state.busy}>
        {state.busy ? "Creating instructions…" : "Request Password Reset"}
      </button>
      <Link href="/account/login" style={{ textAlign: "center", fontSize: 12 }}>
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const state = useMutation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    state.setBusy(true);
    state.setError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/auth/password-reset", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const result = await response.json();
    state.setBusy(false);
    if (!response.ok) return state.setError(result.error);
    state.setMessage(result.message);
    window.setTimeout(() => router.push("/account/login"), 1200);
  }
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <Field
        name="password"
        label="New Password"
        type="password"
        minLength={8}
        autoComplete="new-password"
      />
      {state.error && (
        <p role="alert" style={{ color: "#b42318" }}>
          {state.error}
        </p>
      )}
      {state.message && <p style={{ color: "#087844" }}>{state.message}</p>}
      <button className="btn btn-primary" disabled={state.busy || !token}>
        {state.busy ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input {...props} className="field" required />
    </label>
  );
}
