"use client";

import {
  Loader2,
  Phone,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import styles from "./customer-auth.module.css";

export function SocialCompleteForm() {
  const router =
    useRouter();

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

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
      const formData =
        new FormData(
          event.currentTarget,
        );

      const phone =
        formData.get(
          "phone",
        );

      const response =
        await fetch(
          "/api/auth/oauth/complete",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                phone,
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
            "Unable to finish registration.",
        );

        return;
      }

      router.replace(
        "/account",
      );

      router.refresh();
    } catch {
      setError(
        "Unable to finish registration. Please try again.",
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
      className={
        styles.form
      }
    >
      <label
        className={
          styles.field
        }
      >
        <span>
          Phone Number
        </span>

        <div
          className={
            styles.inputWrap
          }
        >
          <Phone
            size={17}
          />

          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            pattern="01[0-9]{9}"
            placeholder="01XXXXXXXXX"
            required
          />
        </div>
      </label>

      <p
        className={
          styles.helperText
        }
      >
        We need your Bangladesh
        phone number for order
        confirmation, delivery and
        account support.
      </p>

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

            Finishing Account
          </>
        ) : (
          "Complete Account"
        )}
      </button>
    </form>
  );
}