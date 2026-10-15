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

import { useMemo } from "react";
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

export function ReportsManager({
  orders,
}: {
  orders: ReportOrder[];
}) {
  const stats = useMemo(() => {
    const totalOrders = orders.length;

    const delivered = orders.filter(
      (order) => order.status === "DELIVERED",
    );

    const cancelled = orders.filter(
      (order) => order.status === "CANCELLED",
    );

    const failed = orders.filter(
      (order) => order.status === "FAILED_DELIVERY",
    );

    const validOrders = orders.filter(
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
  }, [orders]);

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
          <span>All Time</span>
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