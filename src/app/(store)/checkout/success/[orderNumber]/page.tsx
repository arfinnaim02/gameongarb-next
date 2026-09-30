import Image from "next/image";
import Link from "next/link";

import {
  Banknote,
  Check,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck,
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

import styles from "./order-success.module.css";

export const dynamic =
  "force-dynamic";

/* =========================================================
   STATUS
   ========================================================= */

const STATUS_PROGRESS:
  Record<
    string,
    number
  > = {
  NEW: 0,
  CONFIRMED: 1,
  PACKING: 2,
  READY_TO_SHIP: 2,
  SHIPPED: 3,
  DELIVERED: 4,
};

const TIMELINE = [
  {
    label:
      "Order Placed",

    description:
      "We received your order.",

    icon:
      Check,
  },

  {
    label:
      "Confirmed",

    description:
      "Order confirmation.",

    icon:
      Clock3,
  },

  {
    label:
      "Packing",

    description:
      "Preparing your items.",

    icon:
      PackageCheck,
  },

  {
    label:
      "Shipped",

    description:
      "Handed to delivery.",

    icon:
      Truck,
  },

  {
    label:
      "Delivered",

    description:
      "Order completed.",

    icon:
      Check,
  },
];

/* =========================================================
   PAGE
   ========================================================= */

export default async function OrderSuccessPage({
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

  if (!allowed) {
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

        createdAt:
          true,

        status:
          true,

        paymentMethod:
          true,

        paymentStatus:
          true,

        customerName:
          true,

        phone:
          true,

        email:
          true,

        shippingAddress:
          true,

        subtotal:
          true,

        discount:
          true,

        deliveryCharge:
          true,

        total:
          true,

        items: {
          select: {
            id:
              true,

            name:
              true,

            sku:
              true,

            size:
              true,

            color:
              true,

            image:
              true,

            unitPrice:
              true,

            quantity:
              true,

            lineTotal:
              true,
          },
        },
      },
    });

  if (!order) {
    notFound();
  }

  const firstName =
    order.customerName
      .trim()
      .split(
        /\s+/,
      )[0] ||
    "there";

  const progressIndex =
    STATUS_PROGRESS[
      order.status
    ] ??
    0;

  const itemCount =
    order.items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,

      0,
    );

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

  const paymentLabel =
    order.paymentMethod ===
    "COD"
      ? "Cash on Delivery"
      : "bKash";

  const paymentMessage =
    order.paymentMethod ===
    "COD"
      ? "Pay when your order arrives."
      : order.paymentStatus ===
          "PAID"
        ? "Your bKash payment has been completed."
        : `Payment status: ${formatStatus(
            order.paymentStatus,
          )}`;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* =================================================
            SUCCESS HERO
            ================================================= */}

        <section className={styles.hero}>
          <div
            className={styles.successVisual}
            aria-hidden="true"
          >
            <span className={styles.ringOne} />
            <span className={styles.ringTwo} />

            <div className={styles.successCircle}>
              <Check
                size={36}
                strokeWidth={
                  2
                }
              />
            </div>

            <div className={styles.sparks}>
              {Array.from({
                length:
                  8,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <span
                    key={
                      index
                    }
                  />
                ),
              )}
            </div>
          </div>

          <span className={styles.eyebrow}>
            Order Confirmed
          </span>

          <h1>
            Thank You,{" "}
            {firstName}!
          </h1>

          <p className={styles.heroLead}>
            Your order has
            been placed
            successfully.
          </p>

          <p className={styles.heroText}>
            We&apos;ve
            received your
            order and it is
            now in our order
            system. Keep your
            order number safe
            so you can track
            its progress at any
            time.
          </p>

          <div className={styles.orderNumber}>
            <span>
              Order Number
            </span>

            <strong>
              #
              {
                order.number
              }
            </strong>
          </div>

          <div className={styles.heroActions}>
            <Link
              href={`/track-order?order=${order.number}`}
              className={styles.primaryAction}
            >
              <Truck
                size={16}
              />

              Track Order
            </Link>

            <Link
              href="/shop"
              className={styles.secondaryAction}
            >
              <ShoppingBag
                size={16}
              />

              Continue Shopping
            </Link>
          </div>
        </section>

        {/* =================================================
            STATUS
            ================================================= */}

        <section className={styles.statusCard}>
          <div className={styles.cardHeading}>
            <div>
              <span>
                Order Status
              </span>

              <h2>
                What Happens Next
              </h2>
            </div>

            <strong className={styles.statusBadge}>
              {formatStatus(
                order.status,
              )}
            </strong>
          </div>

          <div className={styles.timeline}>
            {TIMELINE.map(
              (
                step,
                index,
              ) => {
                const Icon =
                  step.icon;

                const complete =
                  index <=
                  progressIndex;

                const current =
                  index ===
                  progressIndex;

                return (
                  <div
                    key={
                      step.label
                    }
                    className={`${styles.timelineStep} ${
                      complete
                        ? styles.timelineComplete
                        : ""
                    } ${
                      current
                        ? styles.timelineCurrent
                        : ""
                    }`}
                  >
                    <div className={styles.timelineIcon}>
                      <Icon
                        size={17}
                        strokeWidth={
                          1.7
                        }
                      />
                    </div>

                    <strong>
                      {
                        step.label
                      }
                    </strong>

                    <small>
                      {
                        step.description
                      }
                    </small>
                  </div>
                );
              },
            )}
          </div>
        </section>

        {/* =================================================
            ORDER INFORMATION
            ================================================= */}

        <div className={styles.contentGrid}>
          {/* ===============================================
              ITEMS
              =============================================== */}

          <section className={styles.detailCard}>
            <div className={styles.cardHeading}>
              <div>
                <span>
                  Your Order
                </span>

                <h2>
                  Ordered Items
                </h2>
              </div>

              <strong className={styles.itemCount}>
                {itemCount}{" "}
                {itemCount ===
                1
                  ? "item"
                  : "items"}
              </strong>
            </div>

            <div className={styles.items}>
              {order.items.map(
                (
                  item,
                ) => (
                  <article
                    key={
                      item.id
                    }
                    className={styles.item}
                  >
                    <div className={styles.itemImage}>
                      <Image
                        src={
                          item.image ??
                          "/images/products/tshirt.svg"
                        }
                        alt={
                          item.name
                        }
                        fill
                        sizes="76px"
                      />
                    </div>

                    <div className={styles.itemCopy}>
                      <strong>
                        {
                          item.name
                        }
                      </strong>

                      <span>
                        {item.color ||
                          "Default"}

                        {item.size
                          ? ` · ${item.size}`
                          : ""}
                      </span>

                      <small>
                        SKU:{" "}
                        {
                          item.sku
                        }{" "}
                        · Qty{" "}
                        {
                          item.quantity
                        }
                      </small>
                    </div>

                    <div className={styles.itemPrice}>
                      <strong>
                        {formatBDT(
                          Number(
                            item.lineTotal,
                          ),
                        )}
                      </strong>

                      {item.quantity >
                      1 ? (
                        <small>
                          {formatBDT(
                            Number(
                              item.unitPrice,
                            ),
                          )}{" "}
                          each
                        </small>
                      ) : null}
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          {/* ===============================================
              DELIVERY / PAYMENT
              =============================================== */}

          <div className={styles.sideColumn}>
            <section className={styles.detailCard}>
              <div className={styles.smallHeading}>
                <MapPin
                  size={17}
                  strokeWidth={
                    1.6
                  }
                />

                <h2>
                  Delivery Details
                </h2>
              </div>

              <div className={styles.deliveryDetails}>
                <strong>
                  {
                    order.customerName
                  }
                </strong>

                <span>
                  {
                    order.phone
                  }
                </span>

                {order.email ? (
                  <span>
                    {
                      order.email
                    }
                  </span>
                ) : null}

                <p>
                  {
                    order.shippingAddress
                  }
                </p>
              </div>
            </section>

            <section className={styles.detailCard}>
              <div className={styles.smallHeading}>
                {order.paymentMethod ===
                "COD" ? (
                  <Banknote
                    size={17}
                    strokeWidth={
                      1.6
                    }
                  />
                ) : (
                  <CreditCard
                    size={17}
                    strokeWidth={
                      1.6
                    }
                  />
                )}

                <h2>
                  Payment
                </h2>
              </div>

              <div className={styles.paymentInfo}>
                <strong>
                  {
                    paymentLabel
                  }
                </strong>

                <span>
                  {
                    paymentMessage
                  }
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* =================================================
            TOTALS
            ================================================= */}

        <section className={styles.totalCard}>
          <div className={styles.receiptHeading}>
            <ReceiptText
              size={18}
              strokeWidth={
                1.6
              }
            />

            <div>
              <span>
                Order Receipt
              </span>

              <strong>
                Placed{" "}
                {
                  formattedDate
                }
              </strong>
            </div>
          </div>

          <div className={styles.receipt}>
            <SummaryRow
              label="Subtotal"
              value={
                Number(
                  order.subtotal,
                )
              }
            />

            <SummaryRow
              label="Delivery"
              value={
                Number(
                  order.deliveryCharge,
                )
              }
            />

            {Number(
              order.discount,
            ) >
            0 ? (
              <SummaryRow
                label="Discount"
                value={
                  -Number(
                    order.discount,
                  )
                }
                discount
              />
            ) : null}

            <div className={styles.grandTotal}>
              <span>
                Total
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
        </section>

        {/* =================================================
            FINAL MESSAGE
            ================================================= */}

        <section className={styles.finalMessage}>
          <PackageCheck
            size={21}
            strokeWidth={
              1.5
            }
          />

          <div>
            <strong>
              Your order is
              safely recorded.
            </strong>

            <p>
              Keep order number{" "}
              <b>
                #
                {
                  order.number
                }
              </b>{" "}
              for tracking. You
              can return to the
              Track Order page
              anytime to check
              the latest status.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   SUMMARY ROW
   ========================================================= */

function SummaryRow({
  label,
  value,
  discount = false,
}: {
  label:
    string;

  value:
    number;

  discount?:
    boolean;
}) {
  return (
    <div className={styles.summaryRow}>
      <span>
        {
          label
        }
      </span>

      <strong
        className={
          discount
            ? styles.discount
            : ""
        }
      >
        {value <
        0
          ? "−"
          : ""}

        {formatBDT(
          Math.abs(
            value,
          ),
        )}
      </strong>
    </div>
  );
}

/* =========================================================
   FORMAT STATUS
   ========================================================= */

function formatStatus(
  value: string,
) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (
        word,
      ) =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}