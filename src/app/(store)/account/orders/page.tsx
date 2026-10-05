import Image from "next/image";
import Link from "next/link";

import type {
  Prisma,
} from "@prisma/client";

import styles from "@/components/account/account-page.module.css";

import {
  db,
  withDatabaseRetry,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

import {
  requireCustomer,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

function statusClass(
  status:
    string,
) {
  if (
    status ===
    "DELIVERED"
  ) {
    return styles.statusSuccess;
  }

  if (
    [
      "CANCELLED",
      "RETURNED",
      "FAILED_DELIVERY",
    ].includes(
      status,
    )
  ) {
    return styles.statusDanger;
  }

  return styles.statusProgress;
}

function prettyStatus(
  status:
    string,
) {
  return status
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

export default async function MyOrders({
  searchParams,
}: {
  searchParams:
    Promise<{
      status?:
        string;

      q?:
        string;

      sort?:
        string;
    }>;
}) {
  const {
    customer,
  } =
    await requireCustomer();

  const params =
    await searchParams;

  const selectedStatus =
    params.status ??
    "ALL";

  const where:
    Prisma.OrderWhereInput = {
    customerId:
      customer.id,
  };

  if (
    selectedStatus ===
    "PROCESSING"
  ) {
    where.status = {
      in: [
        "NEW",
        "CONFIRMED",
        "PACKING",
        "READY_TO_SHIP",
      ],
    };
  } else if (
    selectedStatus !==
    "ALL"
  ) {
    where.status =
      selectedStatus as Prisma.EnumOrderStatusFilter;
  }

  if (
    params.q?.trim()
  ) {
    const query =
      params.q.trim();

    where.OR = [
      {
        number: {
          contains:
            query,

          mode:
            "insensitive",
        },
      },

      {
        items: {
          some: {
            name: {
              contains:
                query,

              mode:
                "insensitive",
            },
          },
        },
      },
    ];
  }

  const orders =
    await withDatabaseRetry(
      () =>
        db.order.findMany({
          where,

          include: {
            _count: {
              select: {
                items:
                  true,
              },
            },

            items: {
              select: {
                image:
                  true,

                name:
                  true,
              },

              take:
                1,
            },
          },

          orderBy: {
            createdAt:
              params.sort ===
              "oldest"
                ? "asc"
                : "desc",
          },
        }),
    );

  const tabs = [
    [
      "ALL",
      "All Orders",
    ],

    [
      "PROCESSING",
      "Processing",
    ],

    [
      "SHIPPED",
      "Shipped",
    ],

    [
      "DELIVERED",
      "Delivered",
    ],

    [
      "CANCELLED",
      "Cancelled",
    ],
  ] as const;

  return (
    <>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Order History
        </span>

        <h1>
          My Orders
        </h1>

        <p>
          View every order,
          check delivery
          progress and open the
          full purchase details.
        </p>
      </header>

      <nav className={styles.tabs}>
        {tabs.map(
          (
            [
              value,
              label,
            ],
          ) => {
            const href =
              value ===
              "ALL"
                ? "/account/orders"
                : `/account/orders?status=${value}`;

            return (
              <Link
                key={
                  value
                }
                href={
                  href
                }
                className={`${styles.tab} ${
                  selectedStatus ===
                  value
                    ? styles.tabActive
                    : ""
                }`}
              >
                {
                  label
                }
              </Link>
            );
          },
        )}
      </nav>

      <form className={styles.toolbar}>
        {selectedStatus !==
        "ALL" ? (
          <input
            type="hidden"
            name="status"
            value={
              selectedStatus
            }
          />
        ) : null}

        <input
          name="q"
          defaultValue={
            params.q ??
            ""
          }
          placeholder="Search order number or product..."
          aria-label="Search orders"
        />

        <select
          name="sort"
          defaultValue={
            params.sort ??
            "newest"
          }
          aria-label="Sort orders"
        >
          <option value="newest">
            Newest First
          </option>

          <option value="oldest">
            Oldest First
          </option>
        </select>

        <button type="submit">
          Search
        </button>
      </form>

      {orders.length >
      0 ? (
        <div className={styles.orders}>
          {orders.map(
            (
              order,
            ) => {
              const firstItem =
                order.items[0];

              return (
                <article
                  key={
                    order.id
                  }
                  className={styles.orderCard}
                >
                  <div className={styles.orderImage}>
                    <Image
                      src={
                        firstItem
                          ?.image ??
                        "/images/products/tshirt.svg"
                      }
                      alt={
                        firstItem
                          ?.name ??
                        "Order product"
                      }
                      fill
                      sizes="68px"
                    />
                  </div>

                  <div className={styles.orderCardCopy}>
                    <strong>
                      {
                        order.number
                      }
                    </strong>

                    <span>
                      {order.createdAt.toLocaleDateString(
                        "en-BD",
                        {
                          day:
                            "numeric",

                          month:
                            "short",

                          year:
                            "numeric",
                        },
                      )}
                      {" · "}
                      {
                        order._count
                          .items
                      }
                      {" "}
                      item
                      {order._count
                        .items ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                  <div className={styles.orderCardRight}>
                    <strong>
                      {formatBDT(
                        Number(
                          order.total,
                        ),
                      )}
                    </strong>

                    <span
                      className={`${styles.status} ${statusClass(
                        order.status,
                      )}`}
                    >
                      {prettyStatus(
                        order.status,
                      )}
                    </span>
                  </div>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className={styles.orderLink}
                  >
                    View Details
                  </Link>
                </article>
              );
            },
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>
            No orders found
          </h2>

          <p>
            Your matching
            customer orders will
            appear here.
          </p>

          <Link
            href="/shop"
            className="btn btn-primary"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </>
  );
}