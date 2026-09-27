"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

export function LoginForm({
  admin = false,
}: {
  admin?: boolean;
}) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [error, setError] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const form =
        new FormData(
          event.currentTarget,
        );

      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                form.get(
                  "email",
                ),

              password:
                form.get(
                  "password",
                ),

              /*
               * Critical:
               * backend can now tell
               * admin/customer login apart.
               */
              admin,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to sign in.",
        );

        return;
      }

      const requestedNext =
        searchParams.get(
          "next",
        );

      let destination =
        admin
          ? "/admin"
          : "/account";

      /*
       * Only honor a next URL if
       * it belongs to the correct
       * area.
       *
       * Prevents:
       * admin login → /account
       */
      if (
        admin &&
        requestedNext &&
        requestedNext.startsWith(
          "/admin",
        ) &&
        !requestedNext.startsWith(
          "/admin/login",
        )
      ) {
        destination =
          requestedNext;
      }

      if (
        !admin &&
        requestedNext &&
        requestedNext.startsWith(
          "/account",
        ) &&
        !requestedNext.startsWith(
          "/account/login",
        )
      ) {
        destination =
          requestedNext;
      }

      /*
       * Use replace instead of push.
       *
       * This avoids the login page
       * remaining in history.
       */
      router.replace(
        destination,
      );

      router.refresh();
    } catch {
      setError(
        "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: "grid",
        gap: 13,
      }}
    >
      <label>
        <span className="label">
          Email address
        </span>

        <input
          className="field"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label>
        <span className="label">
          Password
        </span>

        <input
          className="field"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </label>

      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            color: "#b52727",
            fontSize: 12,
          }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={busy}
      >
        {busy
          ? "Signing in…"
          : admin
            ? "Sign In to Admin"
            : "Sign In"}
      </button>

      {!admin ? (
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            gap: 12,
            fontSize: 11,
          }}
        >
          <Link href="/account/forgot-password">
            Forgot password?
          </Link>

          <Link href="/account/register">
            Create account
          </Link>
        </div>
      ) : null}
    </form>
  );
}