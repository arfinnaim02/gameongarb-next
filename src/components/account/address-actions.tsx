"use client";

import {
  Check,
  Trash2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import styles from "./account-section.module.css";

export function AddressActions({
  id,
  isDefault,
}: {
  id:
    string;

  isDefault:
    boolean;
}) {
  const router =
    useRouter();

  const [
    busy,
    setBusy,
  ] =
    useState<
      "default" |
      "delete" |
      null
    >(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState("");

  async function mutate(
    method:
      "PATCH" |
      "DELETE",
  ) {
    if (
      method ===
        "DELETE" &&
      !window.confirm(
        "Remove this saved address?",
      )
    ) {
      return;
    }

    setError(
      "",
    );

    setBusy(
      method ===
      "PATCH"
        ? "default"
        : "delete",
    );

    try {
      const response =
        await fetch(
          "/api/account/addresses",
          {
            method,

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                id,
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
            "Unable to update address.",
        );

        return;
      }

      router.refresh();
    } catch {
      setError(
        "Unable to update address. Please try again.",
      );
    } finally {
      setBusy(
        null,
      );
    }
  }

  return (
    <div className={styles.addressActions}>
      {!isDefault ? (
        <button
          type="button"
          className={styles.addressAction}
          disabled={
            busy !==
            null
          }
          onClick={() =>
            mutate(
              "PATCH",
            )
          }
        >
          <Check
            size={12}
          />

          {busy ===
          "default"
            ? "Updating..."
            : "Make Default"}
        </button>
      ) : null}

      <button
        type="button"
        className={styles.addressDelete}
        disabled={
          busy !==
          null
        }
        onClick={() =>
          mutate(
            "DELETE",
          )
        }
      >
        <Trash2
          size={12}
        />

        {busy ===
        "delete"
          ? "Removing..."
          : "Remove"}
      </button>

      {error ? (
        <p className={styles.actionMessage}>
          {
            error
          }
        </p>
      ) : null}
    </div>
  );
}