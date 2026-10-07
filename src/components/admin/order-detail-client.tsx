"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Printer,
  RefreshCw,
  Save,
  ShieldAlert,
  Truck,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./order-detail-client.module.css";

type OrderItemData = {
  id: string;

  productId:
    string |
    null;

  variantId:
    string |
    null;

  name:
    string;

  sku:
    string;

  size:
    string |
    null;

  color:
    string |
    null;

  image:
    string |
    null;

  unitPrice:
    number;

  quantity:
    number;

  lineTotal:
    number;
};

type OrderHistoryData = {
  id: string;

  oldStatus:
    string |
    null;

  newStatus:
    string;

  changedBy:
    string |
    null;

  note:
    string |
    null;

  source:
    string;

  createdAt:
    string;
};

type PaymentData = {
  id: string;

  method:
    string;

  status:
    string;

  amount:
    number;

  providerReference:
    string |
    null;

  createdAt:
    string;

  updatedAt:
    string;
};

type ShipmentData = {
  id:
    string;

  provider:
    string;

  consignmentId:
    string |
    null;

  trackingId:
    string |
    null;

  status:
    string;

  labelUrl:
    string |
    null;

  trackingUrl:
    string |
    null;

  codAmount:
    number |
    null;

  lastSyncedAt:
    string |
    null;

  events: {
    id:
      string;

    status:
      string |
      null;

    message:
      string;

    source:
      string;

    externalAt:
      string |
      null;

    createdAt:
      string;
  }[];

  createdAt:
    string;

  updatedAt:
    string;
};

type RecentOrder = {
  id:
    string;

  number:
    string;

  total:
    number;

  status:
    string;

  paymentMethod:
    string;

  createdAt:
    string;
};

type FraudCourierResult = {
  total:
    number;

  delivered:
    number;

  cancelled:
    number;
};

type FraudCheckResult = {
  phone:
    string;

  totalParcels:
    number;

  delivered:
    number;

  cancelled:
    number;

  fraudReports:
    number;

  riskStatus:
    | "NO_HISTORY"
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "VERY_HIGH";

  riskScore:
    number |
    null;

  deliveryRate:
    number |
    null;

  cancellationRate:
    number |
    null;

  checkedAt:
    string;

  providerRiskStatus?:
    string |
    null;

  couriers:
    Record<
      string,
      FraudCourierResult
    >;
};

export type OrderDetailData = {
  order: {
    id:
      string;

    number:
      string;

    status:
      string;

    paymentMethod:
      string;

    paymentStatus:
      string;

    customerName:
      string;

    phone:
      string;

    email:
      string |
      null;

    division:
      string;

    district:
      string;

    thana:
      string;

    shippingAddress:
      string;

    subtotal:
      number;

    discount:
      number;

    deliveryCharge:
      number;

    total:
      number;

    couponCode:
      string |
      null;

    internalNotes:
      string;

    createdAt:
      string;

    updatedAt:
      string;
  };

  items:
    OrderItemData[];

  history:
    OrderHistoryData[];

  payments:
    PaymentData[];

  shipment:
    ShipmentData |
    null;

  customerHistory: {
    totalOrders:
      number;

    previousOrders:
      number;

    delivered:
      number;

    cancelled:
      number;

    failedDelivery:
      number;

    returned:
      number;

    deliveredValue:
      number;

    recentOrders:
      RecentOrder[];
  };

  risk: {
    status:
      "PENDING" |
      "LOW" |
      "MEDIUM" |
      "HIGH" |
      "VERY_HIGH";

    score:
      number |
      null;
  };
};

const EDITABLE_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "FAILED_DELIVERY",
];

const TRANSITIONS:
  Record<
    string,
    string[]
  > = {
  NEW:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "NEW",
    ),

  CONFIRMED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "CONFIRMED",
    ),

  PACKING:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "PACKING",
    ),

  READY_TO_SHIP:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "READY_TO_SHIP",
    ),

  SHIPPED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "SHIPPED",
    ),

  CANCELLED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "CANCELLED",
    ),

  RETURN_REQUESTED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "RETURN_REQUESTED",
    ),

  RETURNED:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "RETURNED",
    ),

  FAILED_DELIVERY:
    EDITABLE_ORDER_STATUSES.filter(
      (
        status,
      ) =>
        status !==
        "FAILED_DELIVERY",
    ),

  DELIVERED: [],
};

function humanize(
  value:
    string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

function formatDate(
  value:
    string,
) {
  return new Intl.DateTimeFormat(
    "en-BD",
    {
      timeZone:
        "Asia/Dhaka",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function whatsappPhone(
  phone:
    string,
) {
  const digits =
    phone.replace(
      /\D/g,
      "",
    );

  if (
    digits.startsWith(
      "880",
    )
  ) {
    return digits;
  }

  if (
    digits.startsWith(
      "0",
    )
  ) {
    return `88${digits}`;
  }

  return digits;
}

export function OrderDetailClient({
  data,
}: {
  data:
    OrderDetailData;
}) {
  const router =
    useRouter();

  const [
    notes,
    setNotes,
  ] =
    useState(
      data.order
        .internalNotes,
    );

  const [
    savingNotes,
    setSavingNotes,
  ] =
    useState(
      false,
    );

  const [
    updatingStatus,
    setUpdatingStatus,
  ] =
    useState(
      false,
    );

  const [
    courierBusy,
    setCourierBusy,
  ] =
    useState<
      "send" |
      "refresh" |
      null
    >(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "",
    );

  const [
    error,
    setError,
  ] =
    useState(
      "",
    );

  const [
    fraudBusy,
    setFraudBusy,
  ] =
    useState(
      false,
    );

  const [
    fraudResult,
    setFraudResult,
  ] =
    useState<
      FraudCheckResult |
      null
    >(
      null,
    );

  const transitions =
    TRANSITIONS[
      data.order.status
    ] ??
    [];

  const courierBookingReady =
    data.order.status ===
      "READY_TO_SHIP" ||
    data.order.status ===
      "SHIPPED";

  const unpaidBkash =
    data.order
      .paymentMethod ===
      "BKASH" &&
    data.order
      .paymentStatus !==
      "PAID";

  const failedSteadfastBooking =
    data.shipment
      ?.provider ===
      "STEADFAST" &&
    !data.shipment
      .consignmentId &&
    !data.shipment
      .trackingId &&
    data.shipment
      .status ===
      "booking_failed";

  const canSendToSteadfast =
    courierBookingReady &&
    !unpaidBkash &&
    (
      !data.shipment ||
      failedSteadfastBooking
    );

  const canRefreshSteadfast =
    data.shipment
      ?.provider ===
      "STEADFAST" &&
    Boolean(
      data.shipment
        .consignmentId,
    );

  const itemQuantity =
    useMemo(
      () =>
        data.items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [
        data.items,
      ],
    );

  const completedHistory =
    data.customerHistory
      .delivered +
    data.customerHistory
      .cancelled +
    data.customerHistory
      .failedDelivery +
    data.customerHistory
      .returned;

  const successRate =
    completedHistory >
    0
      ? Math.round(
          (
            data.customerHistory
              .delivered /
            completedHistory
          ) *
            100,
        )
      : null;


        async function checkFraud() {
    if (
      fraudBusy
    ) {
      return;
    }

    setFraudBusy(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${data.order.id}/fraud`,
          {
            method:
              "POST",

            cache:
              "no-store",
          },
        );

      const responseText =
        await response.text();

      let result: {
        error?:
          string;

        message?:
          string;

        result?:
          FraudCheckResult;
      } = {};

      if (
        responseText
      ) {
        try {
          result =
            JSON.parse(
              responseText,
            );
        } catch {
          throw new Error(
            `Fraud check failed with HTTP ${response.status}.`,
          );
        }
      }

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to check customer fraud history.",
        );
      }

      if (
        !result.result
      ) {
        throw new Error(
          "FraudChecker did not return a fraud-check result.",
        );
      }

      setFraudResult(
        result.result,
      );

      setMessage(
        result.message ??
          "Customer fraud history refreshed.",
      );
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to check customer fraud history.",
      );
    } finally {
      setFraudBusy(
        false,
      );
    }
  }

  async function updateStatus(
    nextStatus:
      string,
  ) {
    if (
      nextStatus ===
        "CANCELLED" &&
      !window.confirm(
        "Cancel this order? Stock will be restored for its variants.",
      )
    ) {
      return;
    }

    setUpdatingStatus(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/admin/orders",
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  data.order
                    .id,

                status:
                  nextStatus,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to update order.",
        );
      }

      setMessage(
        result.message ??
          "Order updated.",
      );

      router.refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to update order.",
      );
    } finally {
      setUpdatingStatus(
        false,
      );
    }
  }

  async function saveNotes() {
    setSavingNotes(
      true,
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${data.order.id}/notes`,
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                notes,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to save notes.",
        );
      }

      setMessage(
        result.message ??
          "Notes saved.",
      );

      router.refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to save notes.",
      );
    } finally {
      setSavingNotes(
        false,
      );
    }
  }

  async function sendToSteadfast() {
    if (
      !canSendToSteadfast
    ) {
      return;
    }

    if (
      !window.confirm(
        failedSteadfastBooking
          ? "Retry sending this order to Steadfast?"
          : "Send this order to Steadfast now?",
      )
    ) {
      return;
    }

    setCourierBusy(
      "send",
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${data.order.id}/steadfast`,
          {
            method:
              "POST",
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to send order to Steadfast.",
        );
      }

      setMessage(
        result.message ??
          "Order sent to Steadfast.",
      );

      router.refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to send order to Steadfast.",
      );

      router.refresh();
    } finally {
      setCourierBusy(
        null,
      );
    }
  }

  async function refreshSteadfastStatus() {
    if (
      !canRefreshSteadfast
    ) {
      return;
    }

    setCourierBusy(
      "refresh",
    );

    setMessage(
      "",
    );

    setError(
      "",
    );

    try {
      const response =
        await fetch(
          `/api/admin/orders/${data.order.id}/steadfast/status`,
          {
            method:
              "POST",
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({
              error:
                "Request failed.",
            }),
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result.error ??
            "Unable to refresh courier status.",
        );
      }

      setMessage(
        result.message ??
          "Courier status refreshed.",
      );

      router.refresh();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to refresh courier status.",
      );
    } finally {
      setCourierBusy(
        null,
      );
    }
  }

  const whatsapp =
    `https://wa.me/${whatsappPhone(
      data.order.phone,
    )}`;

  return (
    <div
      className={
        styles.page
      }
    >
      <div
        className={
          styles.topbar
        }
      >
        <Link
          href="/admin/orders"
          className={
            styles.backLink
          }
        >
          <ArrowLeft
            size={
              16
            }
          />

          Back to Orders
        </Link>

        <div
          className={
            styles.topActions
          }
        >
          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() =>
              router.refresh()
            }
          >
            <RefreshCw
              size={
                15
              }
            />

            Refresh
          </button>

          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() =>
              window.print()
            }
          >
            <Printer
              size={
                15
              }
            />

            Print
          </button>
        </div>
      </div>

      <header
        className={
          styles.header
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Order Operations
          </span>

          <div
            className={
              styles.titleLine
            }
          >
            <h1>
              {
                data.order
                  .number
              }
            </h1>

            <span
              className={`${styles.status} ${styles[`status_${data.order.status}`] ?? ""}`}
            >
              {humanize(
                data.order
                  .status,
              )}
            </span>
          </div>

          <p>
            Placed{" "}
            {formatDate(
              data.order
                .createdAt,
            )}
          </p>
        </div>

        <div
          className={
            styles.statusAction
          }
        >
          {transitions.length >
          0 ? (
            <select
              defaultValue=""
              disabled={
                updatingStatus
              }
              onChange={(
                event,
              ) => {
                const value =
                  event.target
                    .value;

                if (
                  value
                ) {
                  void updateStatus(
                    value,
                  );
                }
              }}
            >
              <option value="">
                {updatingStatus
                  ? "Updating..."
                  : "Update Status"}
              </option>

              {transitions.map(
                (
                  status,
                ) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {humanize(
                      status,
                    )}
                  </option>
                ),
              )}
            </select>
          ) : (
            <span
              className={
                styles.finalState
              }
            >
              Final status
            </span>
          )}
        </div>
      </header>

      {message ? (
        <div
          className={
            styles.success
          }
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      <section
        className={
          styles.summaryGrid
        }
      >
        <article
          className={
            styles.summaryCard
          }
        >
          <Package
            size={
              19
            }
          />

          <div>
            <span>
              Items
            </span>

            <strong>
              {
                itemQuantity
              }
            </strong>
          </div>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <WalletCards
            size={
              19
            }
          />

          <div>
            <span>
              Order Total
            </span>

            <strong>
              {formatBDT(
                data.order
                  .total,
              )}
            </strong>
          </div>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <UserRound
            size={
              19
            }
          />

          <div>
            <span>
              Customer Orders
            </span>

            <strong>
              {
                data.customerHistory
                  .totalOrders
              }
            </strong>
          </div>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <CheckCircle2
            size={
              19
            }
          />

          <div>
            <span>
              GOG Delivery Rate
            </span>

            <strong>
              {successRate ===
              null
                ? "New"
                : `${successRate}%`}
            </strong>
          </div>
        </article>
      </section>

      <div
        className={
          styles.layout
        }
      >
        <main
          className={
            styles.main
          }
        >
          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <Package
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Order Items
                  </h2>

                  <p>
                    {
                      itemQuantity
                    }{" "}
                    total unit
                    {itemQuantity ===
                    1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={
                styles.items
              }
            >
              {data.items.map(
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
                  >
                    <div
                      className={
                        styles.itemImage
                      }
                    >
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

                    <div
                      className={
                        styles.itemInfo
                      }
                    >
                      <strong>
                        {
                          item.name
                        }
                      </strong>

                      <span>
                        SKU:{" "}
                        {
                          item.sku
                        }
                      </span>

                      <span>
                        {
                          item.color ??
                          "Default"
                        }{" "}
                        /{" "}
                        {
                          item.size ??
                          "One Size"
                        }
                      </span>
                    </div>

                    <div
                      className={
                        styles.itemQty
                      }
                    >
                      <span>
                        Qty
                      </span>

                      <strong>
                        {
                          item.quantity
                        }
                      </strong>
                    </div>

                    <div
                      className={
                        styles.itemPrice
                      }
                    >
                      <span>
                        {formatBDT(
                          item.unitPrice,
                        )}{" "}
                        each
                      </span>

                      <strong>
                        {formatBDT(
                          item.lineTotal,
                        )}
                      </strong>
                    </div>
                  </article>
                ),
              )}
            </div>

            <div
              className={
                styles.totals
              }
            >
              <TotalRow
                label="Subtotal"
                value={
                  data.order
                    .subtotal
                }
              />

              {data.order
                .discount >
              0 ? (
                <TotalRow
                  label={`Discount${
                    data.order
                      .couponCode
                      ? ` (${data.order.couponCode})`
                      : ""
                  }`}
                  value={
                    -data.order
                      .discount
                  }
                />
              ) : null}

              <TotalRow
                label="Delivery"
                value={
                  data.order
                    .deliveryCharge
                }
              />

              <TotalRow
                label="Total"
                value={
                  data.order
                    .total
                }
                strong
              />
            </div>
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <ClipboardList
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Order Timeline
                  </h2>

                  <p>
                    Complete fulfillment history
                  </p>
                </div>
              </div>
            </div>

            <div
              className={
                styles.timeline
              }
            >
              {data.history.map(
                (
                  event,
                  index,
                ) => (
                  <div
                    key={
                      event.id
                    }
                    className={
                      styles.timelineItem
                    }
                  >
                    <div
                      className={
                        styles.timelineRail
                      }
                    >
                      <span />

                      {index <
                      data.history
                        .length -
                        1 ? (
                        <i />
                      ) : null}
                    </div>

                    <div
                      className={
                        styles.timelineBody
                      }
                    >
                      <strong>
                        {event.oldStatus
                          ? `${humanize(
                              event.oldStatus,
                            )} → ${humanize(
                              event.newStatus,
                            )}`
                          : humanize(
                              event.newStatus,
                            )}
                      </strong>

                      <span>
                        {formatDate(
                          event.createdAt,
                        )}
                      </span>

                      <small>
                        {
                          event.note ??
                          event.source
                        }
                      </small>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <FileText
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Internal Notes
                  </h2>

                  <p>
                    Admin-only information
                  </p>
                </div>
              </div>
            </div>

            <textarea
              className={
                styles.notes
              }
              value={
                notes
              }
              maxLength={
                5000
              }
              onChange={(
                event,
              ) =>
                setNotes(
                  event.target
                    .value,
                )
              }
              placeholder="Add confirmation details, customer instructions, delivery notes or internal comments..."
            />

            <div
              className={
                styles.notesFooter
              }
            >
              <span>
                {
                  notes.length
                }
                /5000
              </span>

              <button
                type="button"
                disabled={
                  savingNotes
                }
                onClick={() =>
                  void saveNotes()
                }
              >
                <Save
                  size={
                    15
                  }
                />

                {savingNotes
                  ? "Saving..."
                  : "Save Notes"}
              </button>
            </div>
          </section>
        </main>

        <aside
          className={
            styles.sidebar
          }
        >
          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <UserRound
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Customer
                  </h2>

                  <p>
                    Contact & delivery
                  </p>
                </div>
              </div>
            </div>

            <strong
              className={
                styles.customerName
              }
            >
              {
                data.order
                  .customerName
              }
            </strong>

            <div
              className={
                styles.contactActions
              }
            >
              <a
                href={`tel:${data.order.phone}`}
              >
                <Phone
                  size={
                    15
                  }
                />

                Call
              </a>

              <a
                href={
                  whatsapp
                }
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle
                  size={
                    15
                  }
                />

                WhatsApp
              </a>
            </div>

            <div
              className={
                styles.infoList
              }
            >
              <div>
                <Phone
                  size={
                    15
                  }
                />

                <span>
                  {
                    data.order
                      .phone
                  }
                </span>
              </div>

              {data.order
                .email ? (
                <div>
                  <Mail
                    size={
                      15
                    }
                  />

                  <span>
                    {
                      data.order
                        .email
                    }
                  </span>
                </div>
              ) : null}

              <div>
                <MapPin
                  size={
                    15
                  }
                />

                <span>
                  {
                    data.order
                      .shippingAddress
                  }

                  <small>
                    {
                      data.order
                        .district
                    }
                    ,{" "}
                    {
                      data.order
                        .division
                    }
                  </small>
                </span>
              </div>
            </div>
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <ShieldAlert
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Customer Risk
                  </h2>

                  <p>
                    Live FraudChecker history
                  </p>
                </div>
              </div>

              <button
                type="button"
                className={
                  styles.fraudCheckButton
                }
                disabled={
                  fraudBusy
                }
                onClick={() =>
                  void checkFraud()
                }
              >
                <RefreshCw
                  size={
                    13
                  }
                  className={
                    fraudBusy
                      ? styles.fraudSpinner
                      : undefined
                  }
                />

                {fraudBusy
                  ? "Checking..."
                  : fraudResult
                    ? "Refresh"
                    : "Check Fraud"}
              </button>
            </div>

            {fraudResult ? (
              <>
                <div
                  className={`${styles.fraudRiskSummary} ${
                    styles[
                      `fraudRisk_${fraudResult.riskStatus}`
                    ] ??
                    ""
                  }`}
                >
                  <div
                    className={
                      styles.fraudRiskIcon
                    }
                  >
                    <ShieldAlert
                      size={
                        21
                      }
                    />
                  </div>

                  <div
                    className={
                      styles.fraudRiskCopy
                    }
                  >
                    <span>
                      FraudChecker Risk
                    </span>

                    <strong>
                      {fraudResult
                        .riskStatus ===
                      "NO_HISTORY"
                        ? "No History"
                        : humanize(
                            fraudResult
                              .riskStatus,
                          )}
                    </strong>

                    <small>
                      Checked{" "}
                      {formatDate(
                        fraudResult
                          .checkedAt,
                      )}
                    </small>
                  </div>

                  {fraudResult
                    .deliveryRate !==
                  null ? (
                    <div
                      className={
                        styles.fraudRate
                      }
                    >
                      <strong>
                        {
                          fraudResult
                            .deliveryRate
                        }
                        %
                      </strong>

                      <span>
                        Delivery rate
                      </span>
                    </div>
                  ) : null}
                </div>

                <div
                  className={
                    styles.fraudStats
                  }
                >
                  <div>
                    <span>
                      Total Parcels
                    </span>

                    <strong>
                      {
                        fraudResult
                          .totalParcels
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Delivered
                    </span>

                    <strong
                      className={
                        styles.good
                      }
                    >
                      {
                        fraudResult
                          .delivered
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Cancelled
                    </span>

                    <strong
                      className={
                        fraudResult
                          .cancelled >
                        0
                          ? styles.bad
                          : ""
                      }
                    >
                      {
                        fraudResult
                          .cancelled
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Cancel Rate
                    </span>

                    <strong>
                      {fraudResult
                        .cancellationRate !==
                      null
                        ? `${fraudResult.cancellationRate}%`
                        : "—"}
                    </strong>
                  </div>
                </div>

                {fraudResult
                  .fraudReports >
                0 ? (
                  <div
                    className={
                      styles.fraudWarning
                    }
                  >
                    <ShieldAlert
                      size={
                        16
                      }
                    />

                    <span>
                      {
                        fraudResult
                          .fraudReports
                      }{" "}
                      fraud report
                      {fraudResult
                        .fraudReports ===
                      1
                        ? ""
                        : "s"}{" "}
                      found for this customer.
                    </span>
                  </div>
                ) : null}

                {Object.keys(
                  fraudResult
                    .couriers,
                ).length >
                0 ? (
                  <div
                    className={
                      styles.courierRiskSection
                    }
                  >
                    <div
                      className={
                        styles.courierRiskHeading
                      }
                    >
                      Courier History
                    </div>

                    <div
                      className={
                        styles.courierRiskList
                      }
                    >
                      {Object.entries(
                        fraudResult
                          .couriers,
                      ).map(
                        (
                          [
                            courier,
                            courierData,
                          ],
                        ) => {
                          const courierRate =
                            courierData
                              .total >
                            0
                              ? Math.round(
                                  (
                                    courierData
                                      .delivered /
                                    courierData
                                      .total
                                  ) *
                                    100,
                                )
                              : 0;

                          return (
                            <div
                              key={
                                courier
                              }
                              className={
                                styles.courierRiskItem
                              }
                            >
                              <div
                                className={
                                  styles.courierRiskTop
                                }
                              >
                                <strong>
                                  {
                                    courier
                                  }
                                </strong>

                                <span>
                                  {
                                    courierRate
                                  }
                                  %
                                </span>
                              </div>

                              <div
                                className={
                                  styles.courierRiskMeta
                                }
                              >
                                <span>
                                  {
                                    courierData
                                      .total
                                  }{" "}
                                  total
                                </span>

                                <span
                                  className={
                                    styles.good
                                  }
                                >
                                  {
                                    courierData
                                      .delivered
                                  }{" "}
                                  delivered
                                </span>

                                <span
                                  className={
                                    courierData
                                      .cancelled >
                                    0
                                      ? styles.bad
                                      : ""
                                  }
                                >
                                  {
                                    courierData
                                      .cancelled
                                  }{" "}
                                  cancelled
                                </span>
                              </div>

                              <div
                                className={
                                  styles.courierRiskBar
                                }
                              >
                                <span
                                  style={{
                                    width:
                                      `${Math.min(
                                        100,
                                        Math.max(
                                          0,
                                          courierRate,
                                        ),
                                      )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div
                className={
                  styles.riskPending
                }
              >
                <ShieldAlert
                  size={
                    22
                  }
                />

                <div>
                  <strong>
                    Check customer risk
                  </strong>

                  <span>
                    Run a live FraudChecker lookup using this customer's phone number.
                  </span>
                </div>
              </div>
            )}

            <div
              className={
                styles.historyStats
              }
            >
              <div>
                <span>
                  GOG Orders
                </span>

                <strong>
                  {
                    data.customerHistory
                      .totalOrders
                  }
                </strong>
              </div>

              <div>
                <span>
                  Delivered
                </span>

                <strong
                  className={
                    styles.good
                  }
                >
                  {
                    data.customerHistory
                      .delivered
                  }
                </strong>
              </div>

              <div>
                <span>
                  Cancelled
                </span>

                <strong>
                  {
                    data.customerHistory
                      .cancelled
                  }
                </strong>
              </div>

              <div>
                <span>
                  Failed
                </span>

                <strong
                  className={
                    data.customerHistory
                      .failedDelivery >
                    0
                      ? styles.bad
                      : ""
                  }
                >
                  {
                    data.customerHistory
                      .failedDelivery
                  }
                </strong>
              </div>
            </div>

            <div
              className={
                styles.customerValue
              }
            >
              <span>
                Delivered lifetime value
              </span>

              <strong>
                {formatBDT(
                  data.customerHistory
                    .deliveredValue,
                )}
              </strong>
            </div>

            {data.customerHistory
              .recentOrders
              .length >
            0 ? (
              <div
                className={
                  styles.previousOrders
                }
              >
                <span>
                  Previous Orders
                </span>

                {data.customerHistory
                  .recentOrders.map(
                    (
                      order,
                    ) => (
                      <Link
                        key={
                          order.id
                        }
                        href={`/admin/orders/${order.id}`}
                      >
                        <div>
                          <strong>
                            {
                              order.number
                            }
                          </strong>

                          <small>
                            {formatDate(
                              order.createdAt,
                            )}
                          </small>
                        </div>

                        <div>
                          <strong>
                            {formatBDT(
                              order.total,
                            )}
                          </strong>

                          <small>
                            {humanize(
                              order.status,
                            )}
                          </small>
                        </div>
                      </Link>
                    ),
                  )}
              </div>
            ) : (
              <div
                className={
                  styles.newCustomer
                }
              >
                New customer — no previous
                Game On Garb orders.
              </div>
            )}
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <WalletCards
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Payment
                  </h2>

                  <p>
                    Transaction information
                  </p>
                </div>
              </div>
            </div>

            <div
              className={
                styles.paymentSummary
              }
            >
              <div>
                <span>
                  Method
                </span>

                <strong>
                  {
                    data.order
                      .paymentMethod
                  }
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong
                  className={
                    data.order
                      .paymentStatus ===
                    "PAID"
                      ? styles.good
                      : ""
                  }
                >
                  {humanize(
                    data.order
                      .paymentStatus,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Amount
                </span>

                <strong>
                  {formatBDT(
                    data.order
                      .total,
                  )}
                </strong>
              </div>
            </div>

            {data.payments.map(
              (
                payment,
              ) => (
                <div
                  key={
                    payment.id
                  }
                  className={
                    styles.paymentRecord
                  }
                >
                  <div>
                    <strong>
                      {
                        payment.method
                      }{" "}
                      ·{" "}
                      {humanize(
                        payment.status,
                      )}
                    </strong>

                    <span>
                      {formatDate(
                        payment.createdAt,
                      )}
                    </span>
                  </div>

                  <strong>
                    {formatBDT(
                      payment.amount,
                    )}
                  </strong>
                </div>
              ),
            )}
          </section>

          <section
            className={
              styles.card
            }
          >
            <div
              className={
                styles.cardHeading
              }
            >
              <div>
                <span
                  className={
                    styles.sectionIcon
                  }
                >
                  <Truck
                    size={
                      17
                    }
                  />
                </span>

                <div>
                  <h2>
                    Courier
                  </h2>

                  <p>
                    Steadfast delivery operation
                  </p>
                </div>
              </div>

              {data.shipment
                ?.provider ===
              "STEADFAST" ? (
                <span
                  className={
                    styles.courierProviderBadge
                  }
                >
                  Steadfast
                </span>
              ) : null}
            </div>

            {data.shipment ? (
              <div
                className={
                  styles.shipment
                }
              >
                <div>
                  <span>
                    Provider
                  </span>

                  <strong>
                    {
                      data.shipment
                        .provider
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Courier Status
                  </span>

                  <strong
                    className={
                      data.shipment
                        .status ===
                      "booking_failed"
                        ? styles.bad
                        : ""
                    }
                  >
                    {humanize(
                      data.shipment
                        .status,
                    )}
                  </strong>
                </div>

                {data.shipment
                  .consignmentId ? (
                  <div>
                    <span>
                      Consignment
                    </span>

                    <strong>
                      {
                        data.shipment
                          .consignmentId
                      }
                    </strong>
                  </div>
                ) : null}

                {data.shipment
                  .trackingId ? (
                  <div>
                    <span>
                      Tracking
                    </span>

                    <strong>
                      {
                        data.shipment
                          .trackingId
                      }
                    </strong>
                  </div>
                ) : null}

                {data.shipment
                  .codAmount !==
                null ? (
                  <div>
                    <span>
                      COD Amount
                    </span>

                    <strong>
                      {formatBDT(
                        data.shipment
                          .codAmount,
                      )}
                    </strong>
                  </div>
                ) : null}

                <div>
                  <span>
                    Last Sync
                  </span>

                  <strong>
                    {data.shipment
                      .lastSyncedAt
                      ? formatDate(
                          data.shipment
                            .lastSyncedAt,
                        )
                      : "Not synced"}
                  </strong>
                </div>

                {canRefreshSteadfast ? (
                  <button
                    type="button"
                    className={
                      styles.courierPrimaryButton
                    }
                    disabled={
                      courierBusy !==
                      null
                    }
                    onClick={() =>
                      void refreshSteadfastStatus()
                    }
                  >
                    <RefreshCw
                      size={
                        14
                      }
                    />

                    {courierBusy ===
                    "refresh"
                      ? "Refreshing..."
                      : "Refresh Status"}
                  </button>
                ) : null}

                {failedSteadfastBooking ? (
                  <button
                    type="button"
                    className={
                      styles.courierPrimaryButton
                    }
                    disabled={
                      courierBusy !==
                        null ||
                      !canSendToSteadfast
                    }
                    onClick={() =>
                      void sendToSteadfast()
                    }
                  >
                    <Truck
                      size={
                        14
                      }
                    />

                    {courierBusy ===
                    "send"
                      ? "Retrying..."
                      : "Retry Steadfast"}
                  </button>
                ) : null}

                {data.shipment
                  .trackingUrl ? (
                  <a
                    href={
                      data.shipment
                        .trackingUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={
                      styles.externalButton
                    }
                  >
                    Open Tracking

                    <ExternalLink
                      size={
                        14
                      }
                    />
                  </a>
                ) : null}

                {data.shipment
                  .labelUrl ? (
                  <a
                    href={
                      data.shipment
                        .labelUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={
                      styles.externalButton
                    }
                  >
                    Open Label

                    <ExternalLink
                      size={
                        14
                      }
                    />
                  </a>
                ) : null}

                {data.shipment
                  .events.length >
                0 ? (
                  <div
                    className={
                      styles.courierTimeline
                    }
                  >
                    <span
                      className={
                        styles.courierTimelineTitle
                      }
                    >
                      Recent courier activity
                    </span>

                    {data.shipment
                      .events.map(
                        (
                          event,
                        ) => (
                          <div
                            key={
                              event.id
                            }
                            className={
                              styles.courierEvent
                            }
                          >
                            <span
                              className={
                                styles.courierEventDot
                              }
                            />

                            <div>
                              <strong>
                                {event.status
                                  ? humanize(
                                      event.status,
                                    )
                                  : "Courier Update"}
                              </strong>

                              <p>
                                {
                                  event.message
                                }
                              </p>

                              <small>
                                {formatDate(
                                  event.externalAt ??
                                    event.createdAt,
                                )}
                              </small>
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className={
                  styles.noShipment
                }
              >
                <span
                  className={
                    styles.courierEmptyIcon
                  }
                >
                  <Truck
                    size={
                      24
                    }
                  />
                </span>

                <strong>
                  Courier not assigned
                </strong>

                {!courierBookingReady ? (
                  <>
                    <p>
                      Steadfast becomes
                      available when this
                      order reaches Ready
                      to Ship.
                    </p>

                    <button
                      type="button"
                      className={
                        styles.courierDisabledButton
                      }
                      disabled
                    >
                      <Truck
                        size={
                          14
                        }
                      />

                      Send to Steadfast
                    </button>

                    <small
                      className={
                        styles.courierRequirement
                      }
                    >
                      Current status:{" "}
                      {humanize(
                        data.order
                          .status,
                      )}
                    </small>
                  </>
                ) : unpaidBkash ? (
                  <>
                    <p>
                      This bKash order
                      must be marked paid
                      before courier booking.
                    </p>

                    <button
                      type="button"
                      className={
                        styles.courierDisabledButton
                      }
                      disabled
                    >
                      <Truck
                        size={
                          14
                        }
                      />

                      Send to Steadfast
                    </button>

                    <small
                      className={
                        styles.courierRequirement
                      }
                    >
                      Payment required
                    </small>
                  </>
                ) : (
                  <>
                    <p>
                      This order is ready
                      to be booked as one
                      Steadfast parcel.
                    </p>

                    <button
                      type="button"
                      className={
                        styles.courierPrimaryButton
                      }
                      disabled={
                        courierBusy !==
                        null
                      }
                      onClick={() =>
                        void sendToSteadfast()
                      }
                    >
                      <Truck
                        size={
                          14
                        }
                      />

                      {courierBusy ===
                      "send"
                        ? "Sending..."
                        : "Send to Steadfast"}
                    </button>

                    <small
                      className={
                        styles.courierRequirement
                      }
                    >
                      {data.order
                        .paymentMethod ===
                      "COD"
                        ? `COD ${formatBDT(
                            data.order
                              .total,
                          )}`
                        : "Prepaid · COD ৳0"}
                    </small>
                  </>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label:
    string;

  value:
    number;

  strong?:
    boolean;
}) {
  return (
    <div
      className={
        strong
          ? styles.totalStrong
          : styles.totalRow
      }
    >
      <span>
        {label}
      </span>

      <strong>
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