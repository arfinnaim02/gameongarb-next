"use client";

import {
  useState,
} from "react";

import {
  CreditCard,
} from "lucide-react";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./order-success.module.css";

export function DeliveryAdvanceBkashButton({
  orderNumber,
  amount,
}: {
  orderNumber:
    string;

  amount:
    number;
}) {
  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  async function payDeliveryCharge() {
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
      const response =
        await fetch(
          "/api/payments/bkash/delivery-advance/create",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                orderNumber,
              }),
          },
        );

      const result =
        (await response.json()) as {
          error?:
            string;

          bkashURL?:
            string;
        };

      if (
        !response.ok
      ) {
        setError(
          result.error ??
            "Unable to start bKash payment.",
        );

        setBusy(
          false,
        );

        return;
      }

      if (
        !result.bkashURL
      ) {
        setError(
          "bKash payment URL was not returned.",
        );

        setBusy(
          false,
        );

        return;
      }

      window.location.assign(
        result.bkashURL,
      );
    } catch {
      setError(
        "Unable to connect to bKash. Please try again.",
      );

      setBusy(
        false,
      );
    }
  }

  return (
    <div
      style={{
        marginTop:
          16,
      }}
    >
      <button
        type="button"
        className={
          styles.primaryAction
        }
        style={{
          width:
            "100%",

          cursor:
            busy
              ? "wait"
              : "pointer",
        }}
        disabled={
          busy
        }
        onClick={() =>
          void payDeliveryCharge()
        }
      >
        <CreditCard
          size={
            16
          }
        />

        {busy
          ? "Opening bKash..."
          : `Pay ${formatBDT(
              amount,
            )} Delivery Charge`}
      </button>

      {error ? (
        <p
          style={{
            margin:
              "10px 0 0",

            color:
              "#b42318",

            fontSize:
              12,

            lineHeight:
              1.5,
          }}
        >
          {
            error
          }
        </p>
      ) : null}
    </div>
  );
}