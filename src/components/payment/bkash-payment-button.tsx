"use client";

import {
  useState,
} from "react";

export function BkashPaymentButton({
  orderNumber,
  disabled,
}: {
  orderNumber:
    string;

  disabled:
    boolean;
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

  async function pay() {
    if (
      busy ||
      disabled
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
          "/api/payments/bkash/create",
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
        (await response
          .json()
          .catch(
            () => ({
              error:
                "Unable to start bKash payment.",
            }),
          )) as {
          bkashURL?:
            string;

          error?:
            string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to start bKash payment.",
        );
      }

      if (
        !result.bkashURL
      ) {
        throw new Error(
          "bKash payment URL was not received.",
        );
      }

      window.location.assign(
        result.bkashURL,
      );
    } catch (
      error
    ) {
      setError(
        error instanceof
          Error
          ? error.message
          : "Unable to start bKash payment.",
      );

      setBusy(
        false,
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        style={{
          width:
            "100%",

          background:
            "#d82b68",

          borderColor:
            "#d82b68",

          cursor:
            busy
              ? "wait"
              : "pointer",
        }}
        disabled={
          busy ||
          disabled
        }
        onClick={() =>
          void pay()
        }
      >
        {disabled
          ? "Payment Completed"
          : busy
            ? "Opening bKash..."
            : "Pay Securely with bKash"}
      </button>

      {error ? (
        <p
          style={{
            marginTop:
              12,

            color:
              "#b42318",

            fontSize:
              13,

            lineHeight:
              1.5,
          }}
        >
          {
            error
          }
        </p>
      ) : null}
    </>
  );
}