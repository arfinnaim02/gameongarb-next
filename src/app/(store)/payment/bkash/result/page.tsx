import Link from "next/link";

import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  Home,
  ShoppingBag,
  X,
} from "lucide-react";

import {
  headers,
} from "next/headers";

import {
  notFound,
} from "next/navigation";

import {
  db,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

import {
  canAccessOrder,
} from "@/lib/session";

import styles from "./bkash-result.module.css";

export const dynamic =
  "force-dynamic";

type PageProps = {
  searchParams:
    Promise<{
      status?:
        string;

      order?:
        string;

      message?:
        string;
    }>;
};

export default async function BkashResultPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const orderNumber =
    params.order
      ?.trim();

  if (
    !orderNumber
  ) {
    notFound();
  }

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

        customerName:
          true,

        createdAt:
          true,

        payments: {
          where: {
            method:
              "BKASH",
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take:
            1,

          select: {
            providerReference:
              true,

            transactions: {
              where: {
                status:
                  "PAID",
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              take:
                1,

              select: {
                externalId:
                  true,
              },
            },
          },
        },
      },
    });

  if (
    !order ||
    order.paymentMethod !==
      "BKASH"
  ) {
    notFound();
  }

  /*
   * Never trust ?status=success by itself.
   *
   * Database payment state is the
   * source of truth.
   */
  const verifiedSuccess =
    order.paymentStatus ===
    "PAID";

  const requestedStatus =
    params.status ??
    "failed";

  const cancelled =
    !verifiedSuccess &&
    requestedStatus ===
      "cancelled";

  const pending =
    !verifiedSuccess &&
    requestedStatus ===
      "pending";

  const failed =
    !verifiedSuccess &&
    !cancelled &&
    !pending;

  const firstName =
    order.customerName
      .trim()
      .split(
        /\s+/,
      )[0] ||
    "there";

  const transactionId =
    order.payments[0]
      ?.transactions[0]
      ?.externalId ??
    null;

  const paymentId =
    order.payments[0]
      ?.providerReference ??
    null;

  const formattedDate =
    new Intl.DateTimeFormat(
      "en-BD",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",

        timeZone:
          "Asia/Dhaka",
      },
    ).format(
      order.createdAt,
    );

  const Icon =
    verifiedSuccess
      ? Check
      : cancelled
        ? X
        : pending
          ? Clock3
          : AlertCircle;

  const eyebrow =
    verifiedSuccess
      ? "Payment Verified"
      : cancelled
        ? "Payment Cancelled"
        : pending
          ? "Verification Pending"
          : "Payment Failed";

  const title =
    verifiedSuccess
      ? `Payment successful, ${firstName}!`
      : cancelled
        ? "Your payment was cancelled."
        : pending
          ? "We’re verifying your payment."
          : "The payment was not completed.";

  const description =
    verifiedSuccess
      ? "Your bKash payment has been securely verified and your Game On Garb order is confirmed."
      : cancelled
        ? "No successful bKash payment was recorded for this attempt. You can return to the shop and try again when you’re ready."
        : pending
          ? "We could not confirm the final bKash status immediately. If money was deducted, please keep your order number and contact us."
          : (
              params.message ??
              "We could not verify a successful bKash payment for this order."
            );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section
          className={`${styles.card} ${
            verifiedSuccess
              ? styles.success
              : cancelled
                ? styles.cancelled
                : pending
                  ? styles.pending
                  : styles.failed
          }`}
        >
          <div className={styles.visual}>
            <span className={styles.ringOne} />
            <span className={styles.ringTwo} />

            <div className={styles.iconCircle}>
              <Icon
                size={34}
                strokeWidth={
                  1.9
                }
              />
            </div>
          </div>

          <span className={styles.eyebrow}>
            {eyebrow}
          </span>

          <h1 className={styles.title}>
            {title}
          </h1>

          <p className={styles.description}>
            {description}
          </p>

          <div className={styles.paymentBrand}>
            <CreditCard
              size={17}
              strokeWidth={
                1.7
              }
            />

            <span>
              Paid with bKash
            </span>
          </div>

          <div className={styles.orderPanel}>
            <div className={styles.orderNumber}>
              <span>
                Order Number
              </span>

              <strong>
                #{order.number}
              </strong>
            </div>

            <div className={styles.amount}>
              <span>
                Order Total
              </span>

              <strong>
                {formatBDT(
                  Number(
                    order.total,
                  ),
                )}
              </strong>
            </div>
          </div>

          <div className={styles.details}>
            <DetailRow
              label="Payment Status"
              value={
                verifiedSuccess
                  ? "Paid"
                  : order.paymentStatus
              }
            />

            <DetailRow
              label="Payment Method"
              value="bKash"
            />

            <DetailRow
              label="Order Date"
              value={
                formattedDate
              }
            />

            {transactionId ? (
              <DetailRow
                label="Transaction ID"
                value={
                  transactionId
                }
              />
            ) : null}

            {paymentId ? (
              <DetailRow
                label="Payment ID"
                value={
                  paymentId
                }
              />
            ) : null}
          </div>

          {verifiedSuccess ? (
            <div className={styles.notice}>
              <Check
                size={17}
              />

              <div>
                <strong>
                  Payment securely verified
                </strong>

                <span>
                  Your payment was confirmed directly with bKash.
                </span>
              </div>
            </div>
          ) : pending ? (
            <div className={styles.notice}>
              <Clock3
                size={17}
              />

              <div>
                <strong>
                  Keep your order number
                </strong>

                <span>
                  Do not make another payment if the amount was already deducted.
                </span>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            {verifiedSuccess ? (
              <Link
                href={`/checkout/success/${order.number}`}
                className={styles.primaryAction}
              >
                View Order

                <ArrowRight
                  size={16}
                />
              </Link>
            ) : (
              <Link
                href="/shop"
                className={styles.primaryAction}
              >
                <ShoppingBag
                  size={16}
                />

                Continue Shopping
              </Link>
            )}

            <Link
              href="/"
              className={styles.secondaryAction}
            >
              <Home
                size={16}
              />

              Back to Home
            </Link>
          </div>
        </section>

        <section className={styles.help}>
          <span>
            Need help with this payment?
          </span>

          <p>
            Keep your order number
            <strong>
              {" "}
              #{order.number}
            </strong>{" "}
            when contacting Game On Garb support.
          </p>
        </section>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className={styles.detailRow}>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}