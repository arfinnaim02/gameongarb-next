import Link from "next/link";

import {
  ArrowUpRight,
  Heart,
  MapPin,
  PackageCheck,
  Ticket,
} from "lucide-react";

import {
  HomeProductRail,
} from "@/components/home/home-product-rail";

import styles from "@/components/account/account-page.module.css";

import {
  getProducts,
} from "@/lib/catalog";

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

  if (
    [
      "NEW",
      "CONFIRMED",
      "PACKING",
      "READY_TO_SHIP",
      "SHIPPED",
    ].includes(
      status,
    )
  ) {
    return styles.statusProgress;
  }

  return styles.statusNeutral;
}

function statusLabel(
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
        value,
      ) =>
        value.toUpperCase(),
    );
}

export default async function Account() {
  const {
    user,
    customer,
  } =
    await requireCustomer();

  const profile =
    await withDatabaseRetry(
      () =>
        db.customer.findUniqueOrThrow({
          where: {
            id:
              customer.id,
          },

          include: {
            _count: {
              select: {
                orders:
                  true,

                addresses:
                  true,
              },
            },

            wishlist: {
              include: {
                items: {
                  select: {
                    productId:
                      true,
                  },
                },
              },
            },

            orders: {
              orderBy: {
                createdAt:
                  "desc",
              },

              take:
                4,

              include: {
                _count: {
                  select: {
                    items:
                      true,
                  },
                },
              },
            },
          },
        }),
    );

  const couponCount =
    await withDatabaseRetry(
      () =>
        db.coupon.count({
          where: {
            active:
              true,

            validFrom: {
              lte:
                new Date(),
            },

            OR: [
              {
                validUntil:
                  null,
              },

              {
                validUntil: {
                  gte:
                    new Date(),
                },
              },
            ],
          },
        }),
    );

  const recommended =
    await withDatabaseRetry(
      () =>
        getProducts({
          featured:
            true,

          take:
            8,
        }),
    );

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span>
            Game On Garb Account
          </span>

          <h2>
            Welcome back,
            {" "}
            {
              user.name.split(
                " ",
              )[0]
            }.
          </h2>

          <p>
            Track your orders,
            manage delivery
            addresses and keep
            your favourite pieces
            saved in one place.
          </p>
        </div>

        <Link
          href="/shop"
          className={styles.heroAction}
        >
          Continue Shopping

          <ArrowUpRight
            size={14}
          />
        </Link>
      </section>

      <div className={styles.metrics}>
        {[
          {
            icon:
              PackageCheck,

            value:
              profile._count
                .orders,

            label:
              "Total Orders",
          },

          {
            icon:
              MapPin,

            value:
              profile._count
                .addresses,

            label:
              "Saved Addresses",
          },

          {
            icon:
              Heart,

            value:
              profile.wishlist
                ?.items.length ??
              0,

            label:
              "Wishlist Items",
          },

          {
            icon:
              Ticket,

            value:
              couponCount,

            label:
              "Available Offers",
          },
        ].map(
          (
            metric,
          ) => {
            const Icon =
              metric.icon;

            return (
              <div
                key={
                  metric.label
                }
                className={styles.metric}
              >
                <div className={styles.metricIcon}>
                  <Icon
                    size={17}
                  />
                </div>

                <strong>
                  {
                    metric.value
                  }
                </strong>

                <span>
                  {
                    metric.label
                  }
                </span>
              </div>
            );
          },
        )}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span>
              Recent Activity
            </span>

            <h2>
              Recent Orders
            </h2>
          </div>

          <Link href="/account/orders">
            View All Orders
          </Link>
        </div>

        {profile.orders.length >
        0 ? (
          <div className={styles.orderList}>
            {profile.orders.map(
              (
                order,
              ) => (
                <div
                  key={
                    order.id
                  }
                  className={styles.orderRow}
                >
                  <div>
                    <div className={styles.orderNumber}>
                      {
                        order.number
                      }
                    </div>

                    <span className={styles.orderMeta}>
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

                  <strong className={styles.orderTotal}>
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
                    {statusLabel(
                      order.status,
                    )}
                  </span>

                  <Link
                    href={`/account/orders/${order.id}`}
                    className={styles.orderLink}
                  >
                    View
                  </Link>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>
              No orders yet
            </h2>

            <p>
              Your orders will
              appear here after
              checkout.
            </p>

            <Link
              href="/shop"
              className="btn btn-primary"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </section>

      {recommended.length >
      0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>
                Recommended
              </span>

              <h2>
                You May Like
              </h2>
            </div>

            <Link href="/shop">
              View Shop
            </Link>
          </div>

          <HomeProductRail
            products={
              recommended
            }
            direction="right-to-left"
            label="Recommended products"
          />
        </section>
      ) : null}
    </>
  );
}