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
} from "react";

import styles from "./reports-manager.module.css";

export type ReportOrder = {
  id:
    string;

  number:
    string;

  total:
    number;

  subtotal:
    number;

  discount:
    number;

  deliveryCharge:
    number;

  status:
    string;

  paymentMethod:
    string;

  paymentStatus:
    string;

  createdAt:
    string;
};

function formatBDT(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-BD",
    {
      style:
        "currency",

      currency:
        "BDT",

      maximumFractionDigits:
        0,
    },
  ).format(
    value,
  );
}

export function ReportsManager({
  orders,
}: {
  orders:
    ReportOrder[];
}) {
  const stats =
    useMemo(
      () => {
        const totalOrders =
          orders.length;

        const delivered =
          orders.filter(
            (
              order,
            ) =>
              order.status ===
              "DELIVERED",
          );

        const cancelled =
          orders.filter(
            (
              order,
            ) =>
              order.status ===
              "CANCELLED",
          );

        const failed =
          orders.filter(
            (
              order,
            ) =>
              order.status ===
              "FAILED_DELIVERY",
          );

        const validOrders =
          orders.filter(
            (
              order,
            ) =>
              order.status !==
                "CANCELLED" &&
              order.status !==
                "FAILED_DELIVERY",
          );

        const revenue =
          delivered.reduce(
            (
              total,
              order,
            ) =>
              total +
              order.total,

            0,
          );

        const averageOrderValue =
          delivered.length >
          0
            ? revenue /
              delivered.length
            : 0;

        return {
          totalOrders,

          delivered:
            delivered.length,

          cancelled:
            cancelled.length,

          failed:
            failed.length,

          revenue,

          averageOrderValue,

          validOrders:
            validOrders.length,
        };
      },

      [
        orders,
      ],
    );

  return (
    <div
      className={
        styles.page
      }
    >
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
            Business Intelligence
          </span>

          <h1>
            Reports & Analytics
          </h1>

          <p>
            Track sales performance,
            order health and revenue
            from live store data.
          </p>
        </div>

        <div
          className={
            styles.rangeBadge
          }
        >
          <CalendarDays
            size={
              16
            }
          />

          All Time
        </div>
      </header>

      <section
        className={
          styles.kpiGrid
        }
      >
        <ReportCard
          label="Revenue"
          value={
            formatBDT(
              stats.revenue,
            )
          }
          note="Delivered orders"
          icon={
            TrendingUp
          }
        />

        <ReportCard
          label="Total Orders"
          value={
            String(
              stats.totalOrders,
            )
          }
          note={`${stats.validOrders} active / valid`}
          icon={
            ShoppingBag
          }
        />

        <ReportCard
          label="Delivered"
          value={
            String(
              stats.delivered,
            )
          }
          note="Completed orders"
          icon={
            PackageCheck
          }
        />

        <ReportCard
          label="Average Order Value"
          value={
            formatBDT(
              stats.averageOrderValue,
            )
          }
          note="Delivered orders"
          icon={
            ReceiptText
          }
        />

        <ReportCard
          label="Cancelled"
          value={
            String(
              stats.cancelled,
            )
          }
          note="Cancelled orders"
          icon={
            XCircle
          }
        />

        <ReportCard
          label="Failed Delivery"
          value={
            String(
              stats.failed,
            )
          }
          note="Courier failures"
          icon={
            RotateCcw
          }
        />
      </section>

      <section
        className={
          styles.placeholderCard
        }
      >
        <BarChart3
          size={
            28
          }
        />

        <div>
          <strong>
            Reports V2 data layer ready
          </strong>

          <span>
            Date filters and detailed performance charts are added in the next step.
          </span>
        </div>
      </section>
    </div>
  );
}

function ReportCard({
  label,
  value,
  note,
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  note:
    string;

  icon:
    React.ComponentType<{
      size?:
        number;
    }>;
}) {
  return (
    <article
      className={
        styles.kpiCard
      }
    >
      <span
        className={
          styles.kpiIcon
        }
      >
        <Icon
          size={
            18
          }
        />
      </span>

      <div>
        <span>
          {
            label
          }
        </span>

        <strong>
          {
            value
          }
        </strong>

        <small>
          {
            note
          }
        </small>
      </div>
    </article>
  );
}