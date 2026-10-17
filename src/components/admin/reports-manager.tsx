"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import type {
  ComponentType,
} from "react";

import styles from "@/components/admin/reports-manager.module.css";

export type ReportOrder = {
  id: string;
  number: string;
  total: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;

  items: {
    productId: string | null;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};

type DatePreset =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "all";

const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURNED",
  "CANCELLED",
  "FAILED_DELIVERY",
] as const;

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PACKING: "Packing",
  READY_TO_SHIP: "Ready to Ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURN_REQUESTED: "Return Requested",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
  FAILED_DELIVERY: "Failed Delivery",
};

function formatBDT(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string | Date) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${String(date.getDate()).padStart(
    2,
    "0",
  )} ${months[date.getMonth()]}`;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(
      2,
      "0",
    ),
    String(date.getDate()).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function isValidBusinessOrder(
  order: ReportOrder,
) {
  return (
    order.status !== "CANCELLED" &&
    order.status !== "FAILED_DELIVERY"
  );
}

function escapeCsv(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return `"${String(
    value ?? "",
  ).replace(/"/g, '""')}"`;
}

export function ReportsManager({
  orders,
}: {
  orders: ReportOrder[];
}) {
  const [
    datePreset,
    setDatePreset,
  ] = useState<DatePreset>(
    "all",
  );

  const [
    customFrom,
    setCustomFrom,
  ] = useState("");

  const [
    customTo,
    setCustomTo,
  ] = useState("");

  const [
    customRangeActive,
    setCustomRangeActive,
  ] = useState(false);

  const hasValidCustomRange =
    Boolean(
      customFrom &&
        customTo &&
        customFrom <= customTo,
    );

  const filteredOrders =
    useMemo(() => {
      if (
        customRangeActive &&
        hasValidCustomRange
      ) {
        const from =
          new Date(
            `${customFrom}T00:00:00`,
          );

        const to =
          new Date(
            `${customTo}T23:59:59.999`,
          );

        return orders.filter(
          (order) => {
            const created =
              new Date(
                order.createdAt,
              );

            return (
              created >= from &&
              created <= to
            );
          },
        );
      }

      if (
        datePreset === "all"
      ) {
        return orders;
      }

      const now =
        new Date();

      return orders.filter(
        (order) => {
          const created =
            new Date(
              order.createdAt,
            );

          if (
            datePreset ===
            "today"
          ) {
            return (
              created.getFullYear() ===
                now.getFullYear() &&
              created.getMonth() ===
                now.getMonth() &&
              created.getDate() ===
                now.getDate()
            );
          }

          if (
            datePreset ===
            "7days"
          ) {
            const start =
              new Date(now);

            start.setDate(
              start.getDate() -
                6,
            );

            start.setHours(
              0,
              0,
              0,
              0,
            );

            return (
              created >= start
            );
          }

          if (
            datePreset ===
            "30days"
          ) {
            const start =
              new Date(now);

            start.setDate(
              start.getDate() -
                29,
            );

            start.setHours(
              0,
              0,
              0,
              0,
            );

            return (
              created >= start
            );
          }

          if (
            datePreset ===
            "month"
          ) {
            return (
              created.getFullYear() ===
                now.getFullYear() &&
              created.getMonth() ===
                now.getMonth()
            );
          }

          return true;
        },
      );
    }, [
      orders,
      datePreset,
      customFrom,
      customTo,
      customRangeActive,
      hasValidCustomRange,
    ]);

  const stats =
    useMemo(() => {
      const valid =
        filteredOrders.filter(
          isValidBusinessOrder,
        );

      const delivered =
        filteredOrders.filter(
          (order) =>
            order.status ===
            "DELIVERED",
        );

      const cancelled =
        filteredOrders.filter(
          (order) =>
            order.status ===
            "CANCELLED",
        );

      const failed =
        filteredOrders.filter(
          (order) =>
            order.status ===
            "FAILED_DELIVERY",
        );

      const paid =
        valid.filter(
          (order) =>
            order.paymentStatus ===
            "PAID",
        );

      const salesValue =
        valid.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.total,
          0,
        );

      const deliveredRevenue =
        delivered.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.total,
          0,
        );

      const collected =
        paid.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.total,
          0,
        );

      const averageOrder =
        valid.length > 0
          ? salesValue /
            valid.length
          : 0;

      return {
        totalOrders:
          filteredOrders.length,

        validOrders:
          valid.length,

        delivered:
          delivered.length,

        cancelled:
          cancelled.length,

        failed:
          failed.length,

        exceptions:
          cancelled.length +
          failed.length,

        salesValue,

        deliveredRevenue,

        collected,

        outstanding:
          Math.max(
            salesValue -
              collected,
            0,
          ),

        averageOrder,
      };
    }, [
      filteredOrders,
    ]);

  const salesTrend =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            date: string;
            label: string;
            value: number;
            orders: number;
          }
        >();

      filteredOrders.forEach(
        (order) => {
          if (
            !isValidBusinessOrder(
              order,
            )
          ) {
            return;
          }

          const created =
            new Date(
              order.createdAt,
            );

          if (
            Number.isNaN(
              created.getTime(),
            )
          ) {
            return;
          }

          const key =
            dateKey(created);

          const existing =
            map.get(key);

          if (existing) {
            existing.value +=
              order.total;

            existing.orders +=
              1;

            return;
          }

          map.set(key, {
            date: key,

            label:
              shortDate(
                created,
              ),

            value:
              order.total,

            orders: 1,
          });
        },
      );

      return Array.from(
        map.values(),
      )
        .sort(
          (a, b) =>
            a.date.localeCompare(
              b.date,
            ),
        )
        .slice(-14);
    }, [
      filteredOrders,
    ]);

  const chartModel =
    useMemo(() => {
      if (
        salesTrend.length ===
        0
      ) {
        return {
          points: "",
          area: "",
          max: 0,
        };
      }

      const width =
        1000;

      const height =
        240;

      const left =
        34;

      const right =
        966;

      const top =
        28;

      const bottom =
        202;

      const max =
        Math.max(
          ...salesTrend.map(
            (item) =>
              item.value,
          ),
          1,
        );

      const points =
        salesTrend.map(
          (
            item,
            index,
          ) => {
            const ratio =
              salesTrend.length ===
              1
                ? 0.5
                : index /
                  (
                    salesTrend.length -
                    1
                  );

            const x =
              left +
              (
                right -
                left
              ) *
                ratio;

            const y =
              bottom -
              (
                item.value /
                max
              ) *
                (
                  bottom -
                  top
                );

            return {
              x,
              y,
              item,
            };
          },
        );

      const line =
        points
          .map(
            (point) =>
              `${point.x},${point.y}`,
          )
          .join(" ");

      const area =
        [
          `M ${points[0].x} ${bottom}`,
          ...points.map(
            (point) =>
              `L ${point.x} ${point.y}`,
          ),
          `L ${
            points[
              points.length -
              1
            ].x
          } ${bottom}`,
          "Z",
        ].join(" ");

      return {
        points: line,
        area,
        max,
      };
    }, [
      salesTrend,
    ]);

  const productAnalytics =
    useMemo(() => {
      const productMap =
        new Map<
          string,
          {
            key: string;
            name: string;
            quantity: number;
            value: number;
            orders: Set<string>;
            skus: Set<string>;
          }
        >();

      filteredOrders.forEach(
        (order) => {
          if (
            !isValidBusinessOrder(
              order,
            )
          ) {
            return;
          }

          order.items.forEach(
            (item) => {
              const key =
                item.productId ??
                item.name;

              const current =
                productMap.get(
                  key,
                );

              if (current) {
                current.quantity +=
                  item.quantity;

                current.value +=
                  item.lineTotal;

                current.orders.add(
                  order.id,
                );

                current.skus.add(
                  item.sku,
                );

                return;
              }

              productMap.set(
                key,
                {
                  key,
                  name:
                    item.name,

                  quantity:
                    item.quantity,

                  value:
                    item.lineTotal,

                  orders:
                    new Set([
                      order.id,
                    ]),

                  skus:
                    new Set([
                      item.sku,
                    ]),
                },
              );
            },
          );
        },
      );

      const allProducts =
        Array.from(
          productMap.values(),
        )
          .map(
            (
              product,
            ) => ({
              key:
                product.key,

              name:
                product.name,

              quantity:
                product.quantity,

              value:
                product.value,

              orders:
                product.orders
                  .size,

              sku:
                product.skus
                  .size ===
                1
                  ? Array.from(
                      product.skus,
                    )[0]
                  : `${
                      product.skus
                        .size
                    } variants`,
            }),
          )
          .sort(
            (a, b) =>
              b.quantity -
                a.quantity ||
              b.value -
                a.value,
          );

      const totalUnits =
        allProducts.reduce(
          (
            total,
            product,
          ) =>
            total +
            product.quantity,
          0,
        );

      const totalValue =
        allProducts.reduce(
          (
            total,
            product,
          ) =>
            total +
            product.value,
          0,
        );

      return {
        rows:
          allProducts.slice(
            0,
            8,
          ),

        productCount:
          allProducts.length,

        totalUnits,

        totalValue,

        bestSeller:
          allProducts[0]
            ?.name ??
          "—",
      };
    }, [
      filteredOrders,
    ]);

  const paymentAnalysis =
    useMemo(() => {
      const valid =
        filteredOrders.filter(
          isValidBusinessOrder,
        );

      const cod =
        valid.filter(
          (order) =>
            order.paymentMethod ===
            "COD",
        );

      const bkash =
        valid.filter(
          (order) =>
            order.paymentMethod ===
            "BKASH",
        );

      const totalMethodOrders =
        cod.length +
        bkash.length;

      const codValue =
        cod.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.total,
          0,
        );

      const bkashValue =
        bkash.reduce(
          (
            total,
            order,
          ) =>
            total +
            order.total,
          0,
        );

      const statusNames = [
        "PAID",
        "PENDING",
        "PROCESSING",
        "FAILED",
        "REFUNDED",
      ];

      const statuses =
        statusNames.map(
          (status) => ({
            status,

            label:
              status
                .toLowerCase()
                .replace(
                  /(^|_)(\w)/g,
                  (
                    _,
                    __,
                    letter:
                      string,
                  ) =>
                    ` ${letter.toUpperCase()}`,
                )
                .trim(),

            count:
              valid.filter(
                (order) =>
                  order.paymentStatus ===
                  status,
              ).length,
          }),
        );

      return {
        codOrders:
          cod.length,

        bkashOrders:
          bkash.length,

        codValue,

        bkashValue,

        codShare:
          totalMethodOrders >
          0
            ? Math.round(
                (
                  cod.length /
                  totalMethodOrders
                ) *
                  100,
              )
            : 0,

        bkashShare:
          totalMethodOrders >
          0
            ? Math.round(
                (
                  bkash.length /
                  totalMethodOrders
                ) *
                  100,
              )
            : 0,

        statuses,
      };
    }, [
      filteredOrders,
    ]);

  const statusHealth =
    useMemo(() => {
      return ORDER_STATUSES
        .map(
          (status) => {
            const count =
              filteredOrders.filter(
                (order) =>
                  order.status ===
                  status,
              ).length;

            return {
              status,

              label:
                STATUS_LABELS[
                  status
                ],

              count,

              percentage:
                filteredOrders.length >
                0
                  ? Math.round(
                      (
                        count /
                        filteredOrders.length
                      ) *
                        100,
                    )
                  : 0,
            };
          },
        )
        .filter(
          (item) =>
            item.count > 0,
        );
    }, [
      filteredOrders,
    ]);

  const activeRangeLabel =
    customRangeActive &&
    hasValidCustomRange
      ? `${shortDate(
          new Date(
            `${customFrom}T00:00:00`,
          ),
        )} – ${shortDate(
          new Date(
            `${customTo}T00:00:00`,
          ),
        )}`
      : datePreset ===
          "today"
        ? "Today"
        : datePreset ===
            "7days"
          ? "Last 7 Days"
          : datePreset ===
              "30days"
            ? "Last 30 Days"
            : datePreset ===
                "month"
              ? "This Month"
              : "All Time";

  function selectPreset(
    preset: DatePreset,
  ) {
    setDatePreset(
      preset,
    );

    setCustomRangeActive(
      false,
    );
  }

  function exportCsv() {
    if (
      filteredOrders.length ===
      0
    ) {
      return;
    }

    const headers = [
      "Order",
      "Date",
      "Order Status",
      "Payment Method",
      "Payment Status",
      "Product",
      "SKU",
      "Quantity",
      "Unit Price",
      "Line Total",
      "Subtotal",
      "Discount",
      "Delivery Charge",
      "Order Total",
    ];

    const rows =
      filteredOrders.flatMap(
        (order) => {
          const base = [
            order.number,
            order.createdAt,
            order.status,
            order.paymentMethod,
            order.paymentStatus,
          ];

          if (
            order.items.length ===
            0
          ) {
            return [
              [
                ...base,
                "",
                "",
                0,
                0,
                0,
                order.subtotal,
                order.discount,
                order.deliveryCharge,
                order.total,
              ],
            ];
          }

          return order.items.map(
            (item) => [
              ...base,
              item.name,
              item.sku,
              item.quantity,
              item.unitPrice,
              item.lineTotal,
              order.subtotal,
              order.discount,
              order.deliveryCharge,
              order.total,
            ],
          );
        },
      );

    const csv = [
      headers
        .map(
          escapeCsv,
        )
        .join(","),

      ...rows.map(
        (row) =>
          row
            .map(
              escapeCsv,
            )
            .join(","),
      ),
    ].join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      `game-on-garb-report-${new Date()
        .toISOString()
        .slice(
          0,
          10,
        )}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    document.body.removeChild(
      anchor,
    );

    URL.revokeObjectURL(
      url,
    );
  }

  return (
    <div
      className={
        styles.page
      }
    >
      <section
        className={
          styles.hero
        }
      >
        <div
          className={
            styles.heroGlow
          }
        />

        <div
          className={
            styles.heroContent
          }
        >
          <div
            className={
              styles.heroEyebrow
            }
          >
            <BarChart3
              size={14}
            />

            Business Intelligence
          </div>

          <h1>
            Reports &
            Analytics
          </h1>

          <p>
            A live view of sales,
            orders, product
            performance and payment
            health across Game On
            Garb.
          </p>

          <div
            className={
              styles.heroFacts
            }
          >
            <span>
              <Activity
                size={
                  13
                }
              />

              Live store data
            </span>

            <span>
              <CalendarDays
                size={
                  13
                }
              />

              {
                activeRangeLabel
              }
            </span>

            <span>
              {
                filteredOrders.length
              }{" "}
              orders in view
            </span>
          </div>
        </div>

        <div
          className={
            styles.heroActions
          }
        >
          <div
            className={
              styles.rangeSummary
            }
          >
            <span>
              Current range
            </span>

            <strong>
              {
                activeRangeLabel
              }
            </strong>

            <small>
              {
                filteredOrders.length
              }{" "}
              matching orders
            </small>
          </div>

          <button
            type="button"
            className={
              styles.exportButton
            }
            onClick={
              exportCsv
            }
            disabled={
              filteredOrders.length ===
              0
            }
          >
            <Download
              size={15}
            />

            Export CSV
          </button>
        </div>
      </section>

      <section
        className={
          styles.filterPanel
        }
      >
        <div
          className={
            styles.presetGroup
          }
        >
          {[
            [
              "today",
              "Today",
            ],
            [
              "7days",
              "7 Days",
            ],
            [
              "30days",
              "30 Days",
            ],
            [
              "month",
              "This Month",
            ],
            [
              "all",
              "All Time",
            ],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                key={
                  value
                }
                type="button"
                className={
                  datePreset ===
                    value &&
                  !customRangeActive
                    ? styles.presetActive
                    : styles.presetButton
                }
                onClick={() =>
                  selectPreset(
                    value as DatePreset,
                  )
                }
              >
                {
                  label
                }
              </button>
            ),
          )}
        </div>

        <div
          className={
            styles.customFilter
          }
        >
          <label>
            <span>
              From
            </span>

            <input
              type="date"
              value={
                customFrom
              }
              onChange={(
                event,
              ) =>
                setCustomFrom(
                  event
                    .target
                    .value,
                )
              }
            />
          </label>

          <label>
            <span>
              To
            </span>

            <input
              type="date"
              value={
                customTo
              }
              onChange={(
                event,
              ) =>
                setCustomTo(
                  event
                    .target
                    .value,
                )
              }
            />
          </label>

          <button
            type="button"
            className={
              styles.applyButton
            }
            disabled={
              !hasValidCustomRange
            }
            onClick={() =>
              setCustomRangeActive(
                true,
              )
            }
          >
            Apply Range
          </button>
        </div>
      </section>

      <section
        className={
          styles.kpiGrid
        }
      >
        <MetricCard
          label="Sales Value"
          value={formatBDT(
            stats.salesValue,
          )}
          note={`${stats.validOrders} valid orders`}
          icon={
            TrendingUp
          }
          toneClass={
            styles.salesMetric
          }
        />

        <MetricCard
          label="Collected"
          value={formatBDT(
            stats.collected,
          )}
          note={`${formatBDT(
            stats.outstanding,
          )} outstanding`}
          icon={
            CheckCircle2
          }
          toneClass={
            styles.collectedMetric
          }
        />

        <MetricCard
          label="Total Orders"
          value={String(
            stats.totalOrders,
          )}
          note={`${stats.validOrders} active / valid`}
          icon={
            ShoppingBag
          }
          toneClass={
            styles.ordersMetric
          }
        />

        <MetricCard
          label="Delivered"
          value={String(
            stats.delivered,
          )}
          note={`${formatBDT(
            stats.deliveredRevenue,
          )} delivered revenue`}
          icon={
            PackageCheck
          }
          toneClass={
            styles.deliveredMetric
          }
        />

        <MetricCard
          label="Average Order"
          value={formatBDT(
            stats.averageOrder,
          )}
          note="Valid-order average"
          icon={
            ReceiptText
          }
          toneClass={
            styles.averageMetric
          }
        />

        <MetricCard
          label="Exceptions"
          value={String(
            stats.exceptions,
          )}
          note={`${stats.cancelled} cancelled · ${stats.failed} failed`}
          icon={
            XCircle
          }
          toneClass={
            styles.exceptionMetric
          }
        />
      </section>

      <section
        className={
          styles.analyticsGrid
        }
      >
        <article
          className={`${styles.card} ${styles.trendCard}`}
        >
          <CardHeader
            eyebrow="Sales Performance"
            title="Order Value Trend"
            icon={
              TrendingUp
            }
          />

          <div
            className={
              styles.trendSummary
            }
          >
            <div>
              <span>
                Period value
              </span>

              <strong>
                {formatBDT(
                  stats.salesValue,
                )}
              </strong>
            </div>

            <div>
              <span>
                Valid orders
              </span>

              <strong>
                {
                  stats.validOrders
                }
              </strong>
            </div>

            <div>
              <span>
                Avg. order
              </span>

              <strong>
                {formatBDT(
                  stats.averageOrder,
                )}
              </strong>
            </div>
          </div>

          {salesTrend.length >
          0 ? (
            <div
              className={
                styles.chartArea
              }
            >
              <div
                className={
                  styles.chartScale
                }
              >
                <span>
                  {formatBDT(
                    chartModel.max,
                  )}
                </span>

                <span>
                  {formatBDT(
                    chartModel.max /
                      2,
                  )}
                </span>

                <span>
                  BDT 0
                </span>
              </div>

              <div
                className={
                  styles.chartMain
                }
              >
                <div
                  className={
                    styles.chartGrid
                  }
                />

                <svg
                  className={
                    styles.lineChart
                  }
                  viewBox="0 0 1000 240"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="Sales value trend"
                >
                  <defs>
                    <linearGradient
                      id="reportAreaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="currentColor"
                        stopOpacity="0.28"
                      />

                      <stop
                        offset="100%"
                        stopColor="currentColor"
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d={
                      chartModel.area
                    }
                    className={
                      styles.chartAreaFill
                    }
                  />

                  <polyline
                    points={
                      chartModel.points
                    }
                    className={
                      styles.chartLine
                    }
                  />
                </svg>

                <div
                  className={
                    styles.chartLabels
                  }
                >
                  {salesTrend.map(
                    (
                      item,
                    ) => (
                      <div
                        key={
                          item.date
                        }
                      >
                        <strong>
                          {
                            item.label
                          }
                        </strong>

                        <span>
                          {
                            item.orders
                          }{" "}
                          orders
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={
                BarChart3
              }
              title="No sales activity"
              text="No valid order data exists for this date range."
            />
          )}
        </article>

        <article
          className={
            styles.card
          }
        >
          <CardHeader
            eyebrow="Order Pipeline"
            title="Order Health"
            icon={
              Activity
            }
          />

          <div
            className={
              styles.healthHero
            }
          >
            <div>
              <span>
                Valid orders
              </span>

              <strong>
                {
                  stats.validOrders
                }
              </strong>
            </div>

            <div>
              <span>
                Exceptions
              </span>

              <strong>
                {
                  stats.exceptions
                }
              </strong>
            </div>
          </div>

          {statusHealth.length >
          0 ? (
            <div
              className={
                styles.statusList
              }
            >
              {statusHealth.map(
                (item) => (
                  <div
                    key={
                      item.status
                    }
                    className={
                      styles.statusRow
                    }
                  >
                    <div
                      className={
                        styles.statusRowTop
                      }
                    >
                      <span>
                        {
                          item.label
                        }
                      </span>

                      <strong>
                        {
                          item.count
                        }
                      </strong>
                    </div>

                    <div
                      className={
                        styles.statusTrack
                      }
                    >
                      <span
                        style={{
                          width:
                            `${Math.max(
                              item.percentage,
                              3,
                            )}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyState
              icon={
                RotateCcw
              }
              title="No order activity"
              text="Order-status distribution will appear here."
            />
          )}
        </article>
      </section>

      <article
        className={
          styles.card
        }
      >
        <CardHeader
          eyebrow="Product Intelligence"
          title="Top Product Performance"
          icon={
            ShoppingBag
          }
        />

        <div
          className={
            styles.productSummary
          }
        >
          <SummaryStat
            label="Products"
            value={String(
              productAnalytics.productCount,
            )}
          />

          <SummaryStat
            label="Units"
            value={String(
              productAnalytics.totalUnits,
            )}
          />

          <SummaryStat
            label="Product Value"
            value={formatBDT(
              productAnalytics.totalValue,
            )}
          />

          <SummaryStat
            label="Best Seller"
            value={
              productAnalytics.bestSeller
            }
            compact
          />
        </div>

        {productAnalytics
          .rows.length >
        0 ? (
          <div
            className={
              styles.tableWrap
            }
          >
            <table
              className={
                styles.productTable
              }
            >
              <thead>
                <tr>
                  <th>
                    Rank
                  </th>

                  <th>
                    Product
                  </th>

                  <th>
                    SKU /
                    Variants
                  </th>

                  <th>
                    Orders
                  </th>

                  <th>
                    Units
                  </th>

                  <th>
                    Product Value
                  </th>
                </tr>
              </thead>

              <tbody>
                {productAnalytics.rows.map(
                  (
                    product,
                    index,
                  ) => (
                    <tr
                      key={
                        product.key
                      }
                    >
                      <td>
                        <span
                          className={
                            styles.rankBadge
                          }
                        >
                          #
                          {
                            index +
                            1
                          }
                        </span>
                      </td>

                      <td>
                        <strong
                          className={
                            styles.productName
                          }
                        >
                          {
                            product.name
                          }
                        </strong>
                      </td>

                      <td>
                        <span
                          className={
                            styles.sku
                          }
                        >
                          {
                            product.sku
                          }
                        </span>
                      </td>

                      <td>
                        {
                          product.orders
                        }
                      </td>

                      <td>
                        <strong>
                          {
                            product.quantity
                          }
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {formatBDT(
                            product.value,
                          )}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={
              ShoppingBag
            }
            title="No product activity"
            text="Product rankings will appear when valid orders exist."
          />
        )}
      </article>

      <article
        className={
          styles.card
        }
      >
        <CardHeader
          eyebrow="Payment Intelligence"
          title="Payment Analysis"
          icon={
            CreditCard
          }
        />

        <div
          className={
            styles.paymentSummary
          }
        >
          <SummaryStat
            label="Sales Value"
            value={formatBDT(
              stats.salesValue,
            )}
          />

          <SummaryStat
            label="Collected"
            value={formatBDT(
              stats.collected,
            )}
          />

          <SummaryStat
            label="Outstanding"
            value={formatBDT(
              stats.outstanding,
            )}
          />

          <SummaryStat
            label="Paid Share"
            value={
              stats.salesValue >
              0
                ? `${Math.round(
                    (
                      stats.collected /
                      stats.salesValue
                    ) *
                      100,
                  )}%`
                : "0%"
            }
          />
        </div>

        <div
          className={
            styles.paymentGrid
          }
        >
          <div
            className={
              styles.paymentPanel
            }
          >
            <div
              className={
                styles.panelTitle
              }
            >
              <span>
                Payment Methods
              </span>

              <strong>
                COD vs bKash
              </strong>
            </div>

            <PaymentMethod
              name="Cash on Delivery"
              orders={
                paymentAnalysis.codOrders
              }
              value={
                paymentAnalysis.codValue
              }
              share={
                paymentAnalysis.codShare
              }
            />

            <PaymentMethod
              name="bKash"
              orders={
                paymentAnalysis.bkashOrders
              }
              value={
                paymentAnalysis.bkashValue
              }
              share={
                paymentAnalysis.bkashShare
              }
            />
          </div>

          <div
            className={
              styles.paymentPanel
            }
          >
            <div
              className={
                styles.panelTitle
              }
            >
              <span>
                Payment Status
              </span>

              <strong>
                Collection Health
              </strong>
            </div>

            <div
              className={
                styles.paymentStatuses
              }
            >
              {paymentAnalysis.statuses.map(
                (item) => (
                  <div
                    key={
                      item.status
                    }
                  >
                    <span>
                      {
                        item.label
                      }
                    </span>

                    <strong>
                      {
                        item.count
                      }
                    </strong>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  toneClass,
}: {
  label: string;
  value: string;
  note: string;
  icon: ComponentType<{
    size?: number;
  }>;
  toneClass: string;
}) {
  return (
    <article
      className={`${styles.metricCard} ${toneClass}`}
    >
      <div
        className={
          styles.metricTop
        }
      >
        <span
          className={
            styles.metricIcon
          }
        >
          <Icon
            size={17}
          />
        </span>

        <span
          className={
            styles.metricLabel
          }
        >
          {label}
        </span>
      </div>

      <strong
        className={
          styles.metricValue
        }
      >
        {value}
      </strong>

      <small
        className={
          styles.metricNote
        }
      >
        {note}
      </small>
    </article>
  );
}

function CardHeader({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  icon: ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <div
      className={
        styles.cardHeader
      }
    >
      <div>
        <span>
          {eyebrow}
        </span>

        <h2>
          {title}
        </h2>
      </div>

      <div
        className={
          styles.cardHeaderIcon
        }
      >
        <Icon
          size={17}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        styles.summaryStat
      }
    >
      <span>
        {label}
      </span>

      <strong
        className={
          compact
            ? styles.summaryCompact
            : undefined
        }
      >
        {value}
      </strong>
    </div>
  );
}

function PaymentMethod({
  name,
  orders,
  value,
  share,
}: {
  name: string;
  orders: number;
  value: number;
  share: number;
}) {
  return (
    <div
      className={
        styles.paymentMethod
      }
    >
      <div
        className={
          styles.paymentMethodTop
        }
      >
        <div>
          <strong>
            {name}
          </strong>

          <span>
            {orders}{" "}
            {orders === 1
              ? "order"
              : "orders"}
          </span>
        </div>

        <div>
          <strong>
            {share}%
          </strong>

          <span>
            {formatBDT(
              value,
            )}
          </span>
        </div>
      </div>

      <div
        className={
          styles.paymentTrack
        }
      >
        <span
          style={{
            width:
              `${share}%`,
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{
    size?: number;
  }>;
  title: string;
  text: string;
}) {
  return (
    <div
      className={
        styles.empty
      }
    >
      <span>
        <Icon
          size={22}
        />
      </span>

      <strong>
        {title}
      </strong>

      <p>
        {text}
      </p>
    </div>
  );
}