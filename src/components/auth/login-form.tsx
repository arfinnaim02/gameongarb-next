"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

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

import {
  SocialAuthButtons,
} from "./social-auth-buttons";

export function LoginForm({
  admin =
    false,
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

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const loggedOut =
    searchParams.get(
      "loggedout",
    ) ===
    "1";

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
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
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={
        submit
      }
      className={
        styles.form
      }
    >
      {!admin ? (
        <SocialAuthButtons
          mode="login"
        />
      ) : null}

      {loggedOut ? (
        <div
          className={
            styles.success
          }
        >
          You have been logged
          out successfully.
        </div>
      ) : null}

      {!admin ? (
        <SocialAuthButtons
          mode="login"
        />
      ) : null}

      <label
        className={
          styles.field
        }
      >
        <span>
          Email Address
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <Mail
            size={17}
          />

          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </label>

      <label
        className={
          styles.field
        }
      >
        <div
          className={
            styles.fieldTop
          }
        >
          <span>
            Password
          </span>

          {!admin ? (
            <Link
              href="/account/forgot-password"
            >
              Forgot Password?
            </Link>
          ) : null}
        </div>

        <div
          className={
            styles.inputWrap
          }
        >
          <LockKeyhole
            size={17}
          />

          <input
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            minLength={8}
          />

          <button
            type="button"
            className={
              styles.passwordToggle
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            onClick={() =>
              setShowPassword(
                (
                  current,
                ) =>
                  !current,
              )
            }
          >
            {showPassword ? (
              <EyeOff
                size={16}
              />
            ) : (
              <Eye
                size={16}
              />
            )}
          </button>
        </div>
      </label>

      {error ? (
        <div
          role="alert"
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className={
          styles.submit
        }
        disabled={
          busy
        }
      >
        {busy ? (
          <>
            <Loader2
              size={16}
              className={
                styles.spin
              }
            />

            Signing In
          </>
        ) : admin ? (
          "Sign In to Admin"
        ) : (
          "Sign In"
        )}
      </button>

      {!admin ? (
        <>
          <div
            className={
              styles.divider
            }
          >
            <span>
              New to Game On Garb?
            </span>
          </div>

          <Link
            href="/account/register"
            className={
              styles.secondaryAction
            }
          >
            Create an Account
          </Link>
        </>
      ) : null}
    </form>
  );
}