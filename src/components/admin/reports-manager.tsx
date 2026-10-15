"use client";

import {
  BarChart3,
  CalendarDays,
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
import type { ComponentType } from "react";

import styles from "@/app/admin/(panel)/reports/reports.module.css";

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

function formatBDT(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}

type DatePreset =
  | "today"
  | "7days"
  | "30days"
  | "month"
  | "all";

export function ReportsManager({
  orders,
}: {
  orders: ReportOrder[];
}) {
  const [datePreset, setDatePreset] =
    useState<DatePreset>("all");

  const [customFrom, setCustomFrom] =
    useState("");

  const [customTo, setCustomTo] =
    useState("");

  const [customRangeActive, setCustomRangeActive] =
    useState(false);

  const filteredOrders = useMemo(() => {
    if (customRangeActive && customFrom && customTo) {
      const fromDate = new Date(`${customFrom}T00:00:00`);
      const toDate = new Date(`${customTo}T23:59:59.999`);

      return orders.filter((order) => {
        const orderDate = new Date(order.createdAt);

        return (
          orderDate >= fromDate &&
          orderDate <= toDate
        );
      });
    }

    if (datePreset === "all") {
      return orders;
    }

    const now = new Date();

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt);

      if (datePreset === "today") {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        );
      }

      if (datePreset === "7days") {
        const start = new Date(now);

        start.setDate(
          start.getDate() - 6,
        );

        start.setHours(
          0,
          0,
          0,
          0,
        );

        return orderDate >= start;
      }

      if (datePreset === "30days") {
        const start = new Date(now);

        start.setDate(
          start.getDate() - 29,
        );

        start.setHours(
          0,
          0,
          0,
          0,
        );

        return orderDate >= start;
      }

      if (datePreset === "month") {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth()
        );
      }

      return true;
    });
  }, [
    orders,
    datePreset,
    customFrom,
    customTo,
    customRangeActive,
  ]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;

    const delivered = filteredOrders.filter(
      (order) => order.status === "DELIVERED",
    );

    const cancelled = filteredOrders.filter(
      (order) => order.status === "CANCELLED",
    );

    const failed = filteredOrders.filter(
      (order) => order.status === "FAILED_DELIVERY",
    );

    const validOrders = filteredOrders.filter(
      (order) =>
        order.status !== "CANCELLED" &&
        order.status !== "FAILED_DELIVERY",
    );

    const revenue = delivered.reduce(
      (total, order) => total + order.total,
      0,
    );

    const averageOrderValue =
      delivered.length > 0
        ? revenue / delivered.length
        : 0;

    return {
      totalOrders,
      delivered: delivered.length,
      cancelled: cancelled.length,
      failed: failed.length,
      revenue,
      averageOrderValue,
      validOrders: validOrders.length,
    };
  }, [filteredOrders]);
    const productPerformance = useMemo(() => {
    const productMap = new Map<
      string,
      {
        key: string;
        name: string;
        sku: string;
        quantity: number;
        revenue: number;
        orders: Set<string>;
      }
    >();

    filteredOrders.forEach((order) => {
      const isValidOrder =
        order.status !== "CANCELLED" &&
        order.status !== "FAILED_DELIVERY";

      if (!isValidOrder) {
        return;
      }

      order.items.forEach((item) => {
        const key =
          item.productId ??
          `${item.name}-${item.sku}`;

        const existing =
          productMap.get(key);

        const deliveredRevenue =
          order.status === "DELIVERED"
            ? item.lineTotal
            : 0;

        if (existing) {
          existing.quantity +=
            item.quantity;

          existing.revenue +=
            deliveredRevenue;

          existing.orders.add(
            order.id,
          );

          return;
        }

        productMap.set(key, {
          key,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          revenue: deliveredRevenue,
          orders: new Set([
            order.id,
          ]),
        });
      });
    });

    return Array.from(
      productMap.values(),
    )
      .map((product) => ({
        key: product.key,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        revenue: product.revenue,
        orders:
          product.orders.size,
      }))
      .sort((a, b) => {
        if (
          b.quantity !==
          a.quantity
        ) {
          return (
            b.quantity -
            a.quantity
          );
        }

        return (
          b.revenue -
          a.revenue
        );
      })
      .slice(
        0,
        8,
      );
  }, [filteredOrders]);

  const productTotals = useMemo(() => {
    return productPerformance.reduce(
      (
        totals,
        product,
      ) => ({
        quantity:
          totals.quantity +
          product.quantity,

        revenue:
          totals.revenue +
          product.revenue,
      }),
      {
        quantity: 0,
        revenue: 0,
      },
    );
  }, [productPerformance]);

  const salesTrend = useMemo(() => {
    const trendMap = new Map<
      string,
      {
        date: string;
        label: string;
        revenue: number;
        orders: number;
      }
    >();

    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);

      if (Number.isNaN(orderDate.getTime())) {
        return;
      }

      const year = orderDate.getFullYear();
      const month = String(
        orderDate.getMonth() + 1,
      ).padStart(2, "0");
      const day = String(
        orderDate.getDate(),
      ).padStart(2, "0");

      const dateKey =
        `${year}-${month}-${day}`;

      const existing =
        trendMap.get(dateKey);

      const isValidOrder =
        order.status !== "CANCELLED" &&
        order.status !== "FAILED_DELIVERY";

      const deliveredRevenue =
        order.status === "DELIVERED"
          ? order.total
          : 0;

      if (existing) {
        if (isValidOrder) {
          existing.orders += 1;
        }

        existing.revenue +=
          deliveredRevenue;

        return;
      }

      trendMap.set(dateKey, {
        date: dateKey,
        label: orderDate.toLocaleDateString(
          "en-BD",
          {
            day: "2-digit",
            month: "short",
          },
        ),
        revenue: deliveredRevenue,
        orders: isValidOrder ? 1 : 0,
      });
    });

    return Array.from(
      trendMap.values(),
    )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime(),
      )
      .slice(-14);
  }, [filteredOrders]);

  const maxTrendRevenue = useMemo(() => {
    return Math.max(
      ...salesTrend.map(
        (item) => item.revenue,
      ),
      1,
    );
  }, [salesTrend]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Business Intelligence
          </span>

          <h1>Reports & Analytics</h1>

          <p>
            Track sales performance, order health and revenue
            from live store data.
          </p>
        </div>

            <div className={styles.periodBadge}>
            <CalendarDays size={16} />

            <div>
                <span>Active Range</span>

                <strong>
                {customRangeActive && customFrom && customTo
                    ? `${customFrom} → ${customTo}`
                    : datePreset === "today"
                    ? "Today"
                    : datePreset === "7days"
                        ? "Last 7 Days"
                        : datePreset === "30days"
                        ? "Last 30 Days"
                        : datePreset === "month"
                            ? "This Month"
                            : "All Time"}
                </strong>
            </div>
            </div>
      </header>

      <section className={styles.rangeCard}>
        <div className={styles.presets}>
          <a
            href="#"
            className={
              datePreset === "today" &&
              !customRangeActive
                ? styles.activePreset
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              setDatePreset("today");
              setCustomRangeActive(false);
            }}
          >
            Today
          </a>

          <a
            href="#"
            className={
              datePreset === "7days" &&
              !customRangeActive
                ? styles.activePreset
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              setDatePreset("7days");
              setCustomRangeActive(false);
            }}
          >
            Last 7 Days
          </a>

          <a
            href="#"
            className={
              datePreset === "30days" &&
              !customRangeActive
                ? styles.activePreset
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              setDatePreset("30days");
              setCustomRangeActive(false);
            }}
          >
            Last 30 Days
          </a>

          <a
            href="#"
            className={
              datePreset === "month" &&
              !customRangeActive
                ? styles.activePreset
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              setDatePreset("month");
              setCustomRangeActive(false);
            }}
          >
            This Month
          </a>

          <a
            href="#"
            className={
              datePreset === "all" &&
              !customRangeActive
                ? styles.activePreset
                : undefined
            }
            onClick={(event) => {
              event.preventDefault();
              setDatePreset("all");
              setCustomRangeActive(false);
            }}
          >
            All Time
          </a>
        </div>

        <div className={styles.customRange}>
          <label>
            <span>From</span>

            <input
              type="date"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(
                  event.target.value,
                );
              }}
            />
          </label>

          <label>
            <span>To</span>

            <input
              type="date"
              value={customTo}
              onChange={(event) => {
                setCustomTo(
                  event.target.value,
                );
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (!customFrom || !customTo) {
                return;
              }

              setCustomRangeActive(true);
            }}
          >
            Apply Range
          </button>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <ReportCard
          label="Revenue"
          value={formatBDT(stats.revenue)}
          note="Delivered orders"
          icon={TrendingUp}
        />

        <ReportCard
          label="Total Orders"
          value={String(stats.totalOrders)}
          note={`${stats.validOrders} active / valid`}
          icon={ShoppingBag}
        />

        <ReportCard
          label="Delivered"
          value={String(stats.delivered)}
          note="Completed orders"
          icon={PackageCheck}
        />

        <ReportCard
          label="Average Order Value"
          value={formatBDT(stats.averageOrderValue)}
          note="Delivered orders"
          icon={ReceiptText}
        />

        <ReportCard
          label="Cancelled"
          value={String(stats.cancelled)}
          note="Cancelled orders"
          icon={XCircle}
        />

        <ReportCard
          label="Failed Delivery"
          value={String(stats.failed)}
          note="Courier failures"
          icon={RotateCcw}
        />
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Sales Performance</span>
            <strong>Revenue Trend</strong>
          </div>

          <TrendingUp size={20} />
        </div>

        {salesTrend.length > 0 ? (
          <div className={styles.trendChart}>
            <div className={styles.trendChartHeader}>
              <div>
                <span>Selected Period</span>

                <strong>
                  {formatBDT(
                    salesTrend.reduce(
                      (total, item) =>
                        total +
                        item.revenue,
                      0,
                    ),
                  )}
                </strong>
              </div>

              <div>
                <span>Orders</span>

                <strong>
                  {salesTrend.reduce(
                    (total, item) =>
                      total +
                      item.orders,
                    0,
                  )}
                </strong>
              </div>
            </div>

            <div className={styles.trendBars}>
              {salesTrend.map((item) => {
                const barHeight =
                  item.revenue > 0
                    ? Math.max(
                        (
                          item.revenue /
                          maxTrendRevenue
                        ) *
                          100,
                        6,
                      )
                    : 2;

                return (
                  <div
                    className={styles.trendItem}
                    key={item.date}
                  >
                    <div
                      className={
                        styles.trendBarArea
                      }
                    >
                      <div
                        className={
                          styles.trendBar
                        }
                        style={{
                          height:
                            `${barHeight}%`,
                        }}
                        title={
                          `${item.label}: ${formatBDT(
                            item.revenue,
                          )}`
                        }
                      />
                    </div>

                    <div
                      className={
                        styles.trendMeta
                      }
                    >
                      <strong>
                        {formatBDT(
                          item.revenue,
                        )}
                      </strong>

                      <span>
                        {item.orders}{" "}
                        {item.orders === 1
                          ? "order"
                          : "orders"}
                      </span>

                      <small>
                        {item.label}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={styles.trendEmpty}>
            <BarChart3 size={28} />

            <strong>
              No sales data
            </strong>

            <span>
              No orders were found for the
              selected date range.
            </span>
          </div>
        )}
      </section>


      <section className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Product Analytics</span>

            <strong>
              Top Product Performance
            </strong>
          </div>

          <ShoppingBag size={20} />
        </div>

        {productPerformance.length > 0 ? (
          <>
            <div
              className={
                styles.productSummary
              }
            >
              <div>
                <span>
                  Products
                </span>

                <strong>
                  {
                    productPerformance.length
                  }
                </strong>
              </div>

              <div>
                <span>
                  Units Sold
                </span>

                <strong>
                  {
                    productTotals.quantity
                  }
                </strong>
              </div>

              <div>
                <span>
                  Delivered Revenue
                </span>

                <strong>
                  {formatBDT(
                    productTotals.revenue,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Best Seller
                </span>

                <strong>
                  {
                    productPerformance[0]
                      ?.name
                  }
                </strong>
              </div>
            </div>

            <div
              className={
                styles.productTableWrap
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
                      SKU
                    </th>

                    <th>
                      Orders
                    </th>

                    <th>
                      Units
                    </th>

                    <th>
                      Revenue
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {productPerformance.map(
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
                              styles.productRank
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
                              styles.productSku
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
                              product.revenue,
                            )}
                          </strong>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className={styles.trendEmpty}>
            <ShoppingBag size={28} />

            <strong>
              No product data
            </strong>

            <span>
              No product sales were found
              for the selected date range.
            </span>
          </div>
        )}
      </section>



      <section className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Reports V2</span>
            <strong>Analytics data layer ready</strong>
          </div>

          <BarChart3 size={20} />
        </div>

        <div className={styles.summaryGrid}>
          <div>
            <span>Next Step</span>
            <strong>Date Filters</strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>Sales Trends</strong>
          </div>

          <div>
            <span>Completed</span>
            <strong>Product Performance</strong>
          </div>

          <div>
            <span>Next Step</span>
            <strong>Payment Analysis</strong>
          </div>

          <div>
            <span>Next Step</span>
            <strong>CSV Export</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ComponentType<{
    size?: number;
  }>;
}) {
  return (
    <article className={styles.kpiCard}>
      <span className={styles.kpiIcon}>
        <Icon size={18} />
      </span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}