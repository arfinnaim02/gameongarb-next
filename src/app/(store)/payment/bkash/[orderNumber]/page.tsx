import {
  headers,
} from "next/headers";

import {
  notFound,
} from "next/navigation";

import {
  BkashPaymentButton,
} from "@/components/payment/bkash-payment-button";

import {
  db,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

import {
  canAccessOrder,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

export default async function BkashPayment({
  params,
}: {
  params:
    Promise<{
      orderNumber:
        string;
    }>;
}) {
  const {
    orderNumber,
  } =
    await params;

  const request =
    new Request(
      "http://local",
      {
        headers:
          await headers(),
      },
    );

  const allowed =
    await canAccessOrder(
      request,
      orderNumber,
    );

  if (
    !allowed
  ) {
    notFound();
  }

  const order =
    await db.order.findUnique({
      where: {
        number:
          orderNumber,
      },

      select: {
        number:
          true,

        total:
          true,

        paymentMethod:
          true,

        paymentStatus:
          true,

        status:
          true,
      },
    });

  if (
    !order ||
    order.paymentMethod !==
      "BKASH"
  ) {
    notFound();
  }

  const paymentComplete =
    order.paymentStatus ===
    "PAID";

  const orderCancelled =
    order.status ===
    "CANCELLED";

  return (
    <main
      className="container"
      style={{
        padding:
          "70px 20px",
      }}
    >
      <section
        className="card"
        style={{
          maxWidth:
            470,

          margin:
            "0 auto",

          padding:
            28,

          textAlign:
            "center",

          borderTop:
            "5px solid #d82b68",
        }}
      >
        <div
          className="eyebrow"
          style={{
            color:
              "#d82b68",
          }}
        >
          Secure bKash Payment
        </div>

        <h1>
          Complete Payment
        </h1>

        <p>
          Order #
          {
            order.number
          }
        </p>

        <strong
          style={{
            display:
              "block",

            margin:
              "20px 0",

            fontSize:
              30,
          }}
        >
          {formatBDT(
            Number(
              order.total,
            ),
          )}
        </strong>

        {paymentComplete ? (
          <p
            style={{
              marginBottom:
                18,

              color:
                "#16834f",
            }}
          >
            Your bKash payment
            has already been
            completed.
          </p>
        ) : orderCancelled ? (
          <p
            style={{
              marginBottom:
                18,

              color:
                "#b42318",
            }}
          >
            This order has been
            cancelled and cannot
            be paid.
          </p>
        ) : (
          <p
            className="muted"
            style={{
              marginBottom:
                20,
            }}
          >
            You will be redirected
            to the official bKash
            payment page to complete
            your payment securely.
          </p>
        )}

        <BkashPaymentButton
          orderNumber={
            order.number
          }
          disabled={
            paymentComplete ||
            orderCancelled
          }
        />
      </section>
    </main>
  );
}