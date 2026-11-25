import Link from "next/link";

import {
  Check,
  PackageCheck,
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
  withDatabaseRetry,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

import {
  canAccessOrder,
} from "@/lib/session";

import {
  isBkashAllowedForPhone,
} from "@/lib/payments/bkash/access";

import styles from "./order-success.module.css";

import {
  DeliveryAdvanceBkashButton,
} from "./delivery-advance-bkash-button";

export const dynamic =
  "force-dynamic";

function safeText(
  value:
    string |
    null |
    undefined,

  fallback:
    string,
) {
  const clean =
    value?.trim();

  return clean ||
    fallback;
}

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
      "https://www.gameongarb.com",
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
    await withDatabaseRetry(
      () =>
        db.order.findUnique({
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

            district:
              true,

            subtotal:
              true,

            discount:
              true,

            deliveryCharge:
              true,

            deliveryAdvancePaid:
              true,

            total:
              true,

            shipment: {
              select: {
                consignmentId:
                  true,

                trackingId:
                  true,
              },
            },

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

                unitPrice:
                  true,

                quantity:
                  true,

                lineTotal:
                  true,
              },
            },
          },
        }),
    );

  if (
    !order
  ) {
    notFound();
  }

  const customerName =
    safeText(
      order.customerName,
      "Customer",
    );

  const firstName =
    customerName
      .split(
        /\s+/,
      )[0] ||
    "there";

  const district =
    safeText(
      order.district,
      "Bangladesh",
    );

  const shippingAddress =
    safeText(
      order.shippingAddress,
      district,
    );

  const deliveryCharge =
    Number(
      order.deliveryCharge,
    ) ||
    0;

  const deliveryAdvancePaid =
    Number(
      order.deliveryAdvancePaid,
    ) ||
    0;

  const total =
    Number(
      order.total,
    ) ||
    0;

  const subtotal =
    Number(
      order.subtotal,
    ) ||
    0;

  const discount =
    Number(
      order.discount,
    ) ||
    0;

  const isOutsideDhaka =
    district
      .toLowerCase() !==
    "dhaka";

  const deliveryAdvanceComplete =
    deliveryAdvancePaid >=
    deliveryCharge;

  const courierCreated =
    Boolean(
      order.shipment
        ?.consignmentId ||
      order.shipment
        ?.trackingId,
    );

  const canPayDeliveryAdvance =
    order.paymentMethod ===
      "COD" &&
    isOutsideDhaka &&
    deliveryCharge >
      0 &&
    !deliveryAdvanceComplete &&
    !courierCreated &&
    isBkashAllowedForPhone(
      order.phone,
    );

  const remainingCod =
    order.paymentMethod ===
      "COD"
      ? Math.max(
          0,
          total -
            deliveryAdvancePaid,
        )
      : 0;

  let formattedDate =
    "";

  try {
    formattedDate =
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
  } catch {
    formattedDate =
      order.createdAt
        .toISOString();
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <div
        className={
          styles.container
        }
      >
        <section
          className={
            styles.hero
          }
        >
          <div
            className={
              styles.successVisual
            }
            aria-hidden="true"
          >
            <div
              className={
                styles.successCircle
              }
            >
              <Check
                size={
                  36
                }
                strokeWidth={
                  2
                }
              />
            </div>
          </div>

          <span
            className={
              styles.eyebrow
            }
          >
            Order Confirmed
          </span>

          <h1>
            Thank You,{" "}
            {firstName}!
          </h1>

          <p
            className={
              styles.heroLead
            }
          >
            Your order has been placed successfully.
          </p>

          <div
            className={
              styles.orderNumber
            }
          >
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

          <div
            className={
              styles.heroActions
            }
          >
            <Link
              href={`/track-order?order=${encodeURIComponent(
                order.number,
              )}`}
              className={
                styles.primaryAction
              }
            >
              <Truck
                size={
                  16
                }
              />

              Track Order
            </Link>

            <Link
              href="/shop"
              className={
                styles.secondaryAction
              }
            >
              <ShoppingBag
                size={
                  16
                }
              />

              Continue Shopping
            </Link>
          </div>
        </section>

        <div
          className={
            styles.contentGrid
          }
        >
          <section
            className={
              styles.detailCard
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span>
                  Your Order
                </span>

                <h2>
                  Ordered Items
                </h2>
              </div>
            </div>

            <div
              className={
                styles.items
              }
            >
              {order.items.map(
                (
                  item,
                ) => (
                  <article
                    key={
                      item.id
                    }
                    className={
                      styles.item
                    }
                    style={{
                      gridTemplateColumns:
                        "minmax(0, 1fr) auto",
                    }}
                  >
                    <div
                      className={
                        styles.itemCopy
                      }
                    >
                      <strong>
                        {
                          item.name
                        }
                      </strong>

                      <span>
                        {[
                          item.color,
                          item.size,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            " · ",
                          ) ||
                          "Default"}
                      </span>

                      <small>
                        SKU:{" "}
                        {item.sku ||
                          "N/A"}{" "}
                        · Qty{" "}
                        {
                          item.quantity
                        }
                      </small>
                    </div>

                    <div
                      className={
                        styles.itemPrice
                      }
                    >
                      <strong>
                        {formatBDT(
                          Number(
                            item.lineTotal,
                          ) ||
                            0,
                        )}
                      </strong>

                      {item.quantity >
                      1 ? (
                        <small>
                          {formatBDT(
                            Number(
                              item.unitPrice,
                            ) ||
                              0,
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

          <div
            className={
              styles.sideColumn
            }
          >
            <section
              className={
                styles.detailCard
              }
            >
              <div
                className={
                  styles.smallHeading
                }
              >
                <PackageCheck
                  size={
                    17
                  }
                />

                <h2>
                  Delivery Details
                </h2>
              </div>

              <div
                className={
                  styles.deliveryDetails
                }
              >
                <strong>
                  {
                    customerName
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
                    shippingAddress
                  }
                </p>
              </div>
            </section>

            <section
              className={
                styles.detailCard
              }
            >
              <div
                className={
                  styles.smallHeading
                }
              >
                <PackageCheck
                  size={
                    17
                  }
                />

                <h2>
                  Payment
                </h2>
              </div>

              <div
                className={
                  styles.paymentInfo
                }
              >
                <strong>
                  {order.paymentMethod ===
                  "COD"
                    ? "Cash on Delivery"
                    : "bKash"}
                </strong>

                <span>
                  {order.paymentMethod ===
                  "COD"
                    ? deliveryAdvancePaid >
                      0
                      ? `Advance paid: ${formatBDT(
                          deliveryAdvancePaid,
                        )}. Remaining COD: ${formatBDT(
                          remainingCod,
                        )}.`
                      : "Pay when your order arrives."
                    : order.paymentStatus ===
                        "PAID"
                      ? "Your bKash payment has been completed."
                      : `Payment status: ${order.paymentStatus}`}
                </span>
              </div>

              {canPayDeliveryAdvance ? (
                <DeliveryAdvanceBkashButton
                  orderNumber={
                    order.number
                  }
                  amount={
                    deliveryCharge
                  }
                />
              ) : null}
            </section>
          </div>
        </div>

        <section
          className={
            styles.totalCard
          }
        >
          <div
            className={
              styles.receiptHeading
            }
          >
            <PackageCheck
              size={
                18
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

          <div
            className={
              styles.receipt
            }
          >
            <div
              className={
                styles.summaryRow
              }
            >
              <span>
                Subtotal
              </span>

              <strong>
                {formatBDT(
                  subtotal,
                )}
              </strong>
            </div>

            <div
              className={
                styles.summaryRow
              }
            >
              <span>
                Delivery
              </span>

              <strong>
                {formatBDT(
                  deliveryCharge,
                )}
              </strong>
            </div>

            {discount >
            0 ? (
              <div
                className={
                  styles.summaryRow
                }
              >
                <span>
                  Discount
                </span>

                <strong>
                  −
                  {formatBDT(
                    discount,
                  )}
                </strong>
              </div>
            ) : null}

            <div
              className={
                styles.grandTotal
              }
            >
              <span>
                Total
              </span>

              <strong>
                {formatBDT(
                  total,
                )}
              </strong>
            </div>
          </div>
        </section>

        <section
          className={
            styles.finalMessage
          }
        >
          <PackageCheck
            size={
              21
            }
          />

          <div>
            <strong>
              Your order is safely recorded.
            </strong>

            <p>
              Keep order number{" "}
              <b>
                #
                {
                  order.number
                }
              </b>{" "}
              for tracking.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
