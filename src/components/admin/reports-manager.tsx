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
            <span>Next Step</span>
            <strong>Sales Trends</strong>
          </div>

          <div>
            <span>Next Step</span>
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