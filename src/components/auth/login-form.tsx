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

import styles from "./customer-auth.module.css";

export function LoginForm({
  admin = false,
}: {
  admin?:
    boolean;
}) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const loggedOut =
    !admin &&
    searchParams.get(
      "loggedout",
    ) ===
      "1";

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      busy
    ) {
      return;
    }

    setBusy(
      true,
    );

    setError(
      "",
    );

    try {
      const form =
        new FormData(
          event.currentTarget,
        );

      const response =
        await fetch(
          "/api/auth/login",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  form.get(
                    "email",
                  ),

                password:
                  form.get(
                    "password",
                  ),

                admin,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        setError(
          result.error ??
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

      if (
        admin &&
        requestedNext?.startsWith(
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
        requestedNext?.startsWith(
          "/account",
        ) &&
        !requestedNext.startsWith(
          "/account/login",
        )
      ) {
        destination =
          requestedNext;
      }

      router.replace(
        destination,
      );

      router.refresh();
    } catch {
      setError(
        "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className={styles.form}
    >
      {loggedOut ? (
        <p className={styles.success}>
          You have been logged out
          successfully.
        </p>
      ) : null}

      <label className={styles.field}>
        <span>
          Email Address
        </span>

        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className={styles.field}>
        <span>
          Password
        </span>

        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          minLength={
            8
          }
        />
      </label>

      {error ? (
        <p
          role="alert"
          className={styles.error}
        >
          {
            error
          }
        </p>
      ) : null}

      <button
        type="submit"
        className={styles.submit}
        disabled={
          busy
        }
      >
        {busy
          ? "Signing In..."
          : admin
            ? "Sign In to Admin"
            : "Sign In to My Account"}
      </button>

      {!admin ? (
        <div className={styles.links}>
          <Link href="/account/forgot-password">
            Forgot Password?
          </Link>

          <Link href="/account/register">
            Create Account
          </Link>
        </div>
      ) : null}
    </form>
  );
}