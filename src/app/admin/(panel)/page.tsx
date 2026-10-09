import Link from "next/link";

import type {
  Prisma,
} from "@prisma/client";

import {
  ArrowRight,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  Package,
  PackageCheck,
  PackageX,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  db,
} from "@/lib/db";

import {
  formatBDT,
} from "@/lib/money";

import styles from "./dashboard.module.css";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
   ========================================================= */

type DashboardSearchParams =
  Promise<{
    preset?:
      string;

    from?:
      string;

    to?:
      string;
  }>;

/* =========================================================
   DATE HELPERS
   ========================================================= */

function startOfDay(
  date:
    Date,
) {
  const next =
    new Date(
      date,
    );

  next.setHours(
    0,
    0,
    0,
    0,
  );

  return next;
}

function endOfDay(
  date:
    Date,
) {
  const next =
    new Date(
      date,
    );

  next.setHours(
    23,
    59,
    59,
    999,
  );

  return next;
}

function inputDate(
  date:
    Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function parseInputDate(
  value:
    string |
    undefined,

  fallback:
    Date,
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return fallback;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(
        Number,
      );

  const parsed =
    new Date(
      year,
      month - 1,
      day,
    );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? fallback
    : parsed;
}

function resolveRange(
  preset:
    string,

  from:
    string |
    undefined,

  to:
    string |
    undefined,
) {
  const today =
    startOfDay(
      new Date(),
    );

  if (
    preset ===
    "daily"
  ) {
    return {
      start:
        today,

      end:
        endOfDay(
          today,
        ),

      preset:
        "daily",
    };
  }

  if (
    preset ===
    "yearly"
  ) {
    const start =
      new Date(
        today.getFullYear(),
        0,
        1,
      );

    return {
      start,

      end:
        endOfDay(
          today,
        ),

      preset:
        "yearly",
    };
  }

  if (
    preset ===
    "custom"
  ) {
    const fallbackStart =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );

    let start =
      startOfDay(
        parseInputDate(
          from,
          fallbackStart,
        ),
      );

    let end =
      endOfDay(
        parseInputDate(
          to,
          today,
        ),
      );

    if (
      start >
      end
    ) {
      [
        start,
        end,
      ] = [
        startOfDay(
          end,
        ),
        endOfDay(
          start,
        ),
      ];
    }

    return {
      start,
      end,
      preset:
        "custom",
    };
  }

  return {
    start:
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),

    end:
      endOfDay(
        today,
      ),

    preset:
      "monthly",
  };
}

/* =========================================================
   DISPLAY HELPERS
   ========================================================= */

function formatStatus(
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
        char,
      ) =>
        char.toUpperCase(),
    );
}

function dateLabel(
  value:
    Date,
) {
  return new Intl.DateTimeFormat(
    "en",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    value,
  );
}

function shortRangeLabel(
  start:
    Date,

  end:
    Date,
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      },
    );

  return `${formatter.format(
    start,
  )} – ${formatter.format(
    end,
  )}`;
}

function statusTone(
  value:
    string,
) {
  if (
    value ===
      "DELIVERED"
  ) {
    return styles.statusGreen;
  }

  if (
    value ===
      "CANCELLED" ||
    value ===
      "FAILED_DELIVERY" ||
    value ===
      "RETURNED"
  ) {
    return styles.statusRed;
  }

  if (
    value ===
      "SHIPPED" ||
    value ===
      "READY_TO_SHIP"
  ) {
    return styles.statusBlue;
  }

  return styles.statusOrange;
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function Dashboard({
  searchParams,
}: {
  searchParams:
    DashboardSearchParams;
}) {
  const params =
    await searchParams;

  const {
    start,
    end,
    preset,
  } =
    resolveRange(
      params.preset ??
        "monthly",

      params.from,

      params.to,
    );

  const validOrderWhere:
    Prisma.OrderWhereInput = {
    createdAt: {
      gte:
        start,

      lte:
        end,
    },

    status: {
      notIn: [
        "CANCELLED",
        "FAILED_DELIVERY",
      ],
    },
  };

  const [
    orders,
    orderItems,
    recentOrders,
    activeVariants,
    totalProducts,
    totalCustomers,
  ] =
    await Promise.all([
      db.order.findMany({
        where:
          validOrderWhere,

        select: {
          id:
            true,

          number:
            true,

          customerId:
            true,

          customerName:
            true,

          phone:
            true,

          total:
            true,

          paymentMethod:
            true,

          paymentStatus:
            true,

          status:
            true,

          createdAt:
            true,
        },

        orderBy: {
          createdAt:
            "asc",
        },
      }),

      db.orderItem.findMany({
        where: {
          order:
            validOrderWhere,
        },

        select: {
          productId:
            true,

          name:
            true,

          quantity:
            true,

          lineTotal:
            true,

          product: {
            select: {
              categories: {
                select: {
                  primary:
                    true,

                  category: {
                    select: {
                      id:
                        true,

                      name:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      db.order.findMany({
        orderBy: {
          createdAt:
            "desc",
        },

        take:
          7,

        select: {
          id:
            true,

          number:
            true,

          customerName:
            true,

          total:
            true,

          paymentMethod:
            true,

          paymentStatus:
            true,

          status:
            true,

          createdAt:
            true,
        },
      }),

      db.productVariant.findMany({
        where: {
          active:
            true,
        },

        select: {
          id:
            true,

          sku:
            true,

          size:
            true,

          color:
            true,

          stock:
            true,

          lowStockThreshold:
            true,

          product: {
            select: {
              name:
                true,
            },
          },
        },

        orderBy: {
          stock:
            "asc",
        },
      }),

      db.product.count(),

      db.customer.count(),
    ]);

  /* =======================================================
     RANGE METRICS
     ======================================================= */

  const totalSales =
    orders.reduce(
      (
        total,
        order,
      ) =>
        total +
        Number(
          order.total,
        ),
      0,
    );

  const paidRevenue =
    orders
      .filter(
        (
          order,
        ) =>
          order.paymentStatus ===
          "PAID",
      )
      .reduce(
        (
          total,
          order,
        ) =>
          total +
          Number(
            order.total,
          ),
        0,
      );

  const averageOrderValue =
    orders.length >
    0
      ? totalSales /
        orders.length
      : 0;

  const uniqueCustomers =
    new Set(
      orders.map(
        (
          order,
        ) =>
          order.customerId ??
          order.phone,
      ),
    ).size;

  /* =======================================================
     SALES CHART
     ======================================================= */

  const rangeDays =
    Math.max(
      1,
      Math.ceil(
        (
          end.getTime() -
          start.getTime()
        ) /
          86400000,
      ) +
        1,
    );

  const useMonthlyBuckets =
    rangeDays >
    45;

  const bucketMap =
    new Map<
      string,
      {
        key:
          string;

        label:
          string;

        sales:
          number;

        orders:
          number;
      }
    >();

  const cursor =
    new Date(
      start,
    );

  while (
    cursor <=
    end
  ) {
    const key =
      useMonthlyBuckets
        ? `${cursor.getFullYear()}-${cursor.getMonth()}`
        : inputDate(
            cursor,
          );

    if (
      !bucketMap.has(
        key,
      )
    ) {
      bucketMap.set(
        key,
        {
          key,

          label:
            useMonthlyBuckets
              ? new Intl.DateTimeFormat(
                  "en",
                  {
                    month:
                      "short",
                  },
                ).format(
                  cursor,
                )
              : String(
                  cursor.getDate(),
                ).padStart(
                  2,
                  "0",
                ),

          sales:
            0,

          orders:
            0,
        },
      );
    }

    if (
      useMonthlyBuckets
    ) {
      cursor.setMonth(
        cursor.getMonth() +
          1,
        1,
      );
    } else {
      cursor.setDate(
        cursor.getDate() +
          1,
      );
    }
  }

  orders.forEach(
    (
      order,
    ) => {
      const key =
        useMonthlyBuckets
          ? `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`
          : inputDate(
              order.createdAt,
            );

      const bucket =
        bucketMap.get(
          key,
        );

      if (!bucket) {
        return;
      }

      bucket.sales +=
        Number(
          order.total,
        );

      bucket.orders +=
        1;
    },
  );

  const salesData =
    [
      ...bucketMap.values(),
    ];

  const maxSales =
    Math.max(
      1,
      ...salesData.map(
        (
          item,
        ) =>
          item.sales,
      ),
    );

  const chartWidth =
    1000;

  const chartHeight =
    250;

  const chartLeft =
    24;

  const chartRight =
    976;

  const chartTop =
    24;

  const chartBottom =
    210;

  const chartSpan =
    chartRight -
    chartLeft;

  const chartPoints =
    salesData.map(
      (
        item,
        index,
      ) => {
        const x =
          salesData.length <=
          1
            ? chartLeft
            : chartLeft +
              (
                index /
                (
                  salesData.length -
                  1
                )
              ) *
                chartSpan;

        const y =
          chartBottom -
          (
            item.sales /
            maxSales
          ) *
            (
              chartBottom -
              chartTop
            );

        return {
          ...item,
          x,
          y,
        };
      },
    );

  const linePath =
    chartPoints
      .map(
        (
          point,
          index,
        ) =>
          `${index ===
          0
            ? "M"
            : "L"} ${point.x.toFixed(
            2,
          )} ${point.y.toFixed(
            2,
          )}`,
      )
      .join(
        " ",
      );

  const areaPath =
    chartPoints.length >
    0
      ? `${linePath} L ${chartPoints[
          chartPoints.length -
            1
        ].x.toFixed(
          2,
        )} ${chartBottom} L ${chartPoints[0].x.toFixed(
          2,
        )} ${chartBottom} Z`
      : "";

  /* =======================================================
     TOP PRODUCTS
     ======================================================= */

  const productSales =
    new Map<
      string,
      {
        name:
          string;

        quantity:
          number;

        amount:
          number;
      }
    >();

  orderItems.forEach(
    (
      item,
    ) => {
      const key =
        item.productId ??
        item.name;

      const current =
        productSales.get(
          key,
        ) ?? {
          name:
            item.name,

          quantity:
            0,

          amount:
            0,
        };

      current.quantity +=
        item.quantity;

      current.amount +=
        Number(
          item.lineTotal,
        );

      productSales.set(
        key,
        current,
      );
    },
  );

  const topProducts =
    [
      ...productSales.values(),
    ]
      .sort(
        (
          first,
          second,
        ) =>
          second.quantity -
          first.quantity,
      )
      .slice(
        0,
        7,
      );

  /* =======================================================
     TOP CUSTOMERS
     ======================================================= */

  const customerSales =
    new Map<
      string,
      {
        name:
          string;

        orders:
          number;

        amount:
          number;
      }
    >();

  orders.forEach(
    (
      order,
    ) => {
      const key =
        order.customerId ??
        order.phone;

      const current =
        customerSales.get(
          key,
        ) ?? {
          name:
            order.customerName ||
            "Guest",

          orders:
            0,

          amount:
            0,
        };

      current.orders +=
        1;

      current.amount +=
        Number(
          order.total,
        );

      customerSales.set(
        key,
        current,
      );
    },
  );

  const topCustomers =
    [
      ...customerSales.values(),
    ]
      .sort(
        (
          first,
          second,
        ) =>
          second.amount -
          first.amount,
      )
      .slice(
        0,
        7,
      );

  /* =======================================================
     TOP CATEGORIES
     ======================================================= */

  const categorySales =
    new Map<
      string,
      {
        name:
          string;

        amount:
          number;
      }
    >();

  orderItems.forEach(
    (
      item,
    ) => {
      const categories =
        item.product
          ?.categories ??
        [];

      const primary =
        categories.find(
          (
            relation,
          ) =>
            relation.primary,
        ) ??
        categories[0];

      if (!primary) {
        return;
      }

      const current =
        categorySales.get(
          primary.category
            .id,
        ) ?? {
          name:
            primary.category
              .name,

          amount:
            0,
        };

      current.amount +=
        Number(
          item.lineTotal,
        );

      categorySales.set(
        primary.category
          .id,
        current,
      );
    },
  );

  const topCategories =
    [
      ...categorySales.values(),
    ]
      .sort(
        (
          first,
          second,
        ) =>
          second.amount -
          first.amount,
      )
      .slice(
        0,
        5,
      );

  const topCategoryTotal =
    Math.max(
      1,
      topCategories.reduce(
        (
          total,
          category,
        ) =>
          total +
          category.amount,
        0,
      ),
    );

  /* =======================================================
     STOCK
     ======================================================= */

  const stockAttention =
    activeVariants
      .filter(
        (
          variant,
        ) =>
          variant.stock <=
          variant.lowStockThreshold,
      )
      .slice(
        0,
        7,
      );

  const lowStockCount =
    activeVariants.filter(
      (
        variant,
      ) =>
        variant.stock >
          0 &&
        variant.stock <=
          variant.lowStockThreshold,
    ).length;

  const outOfStockCount =
    activeVariants.filter(
      (
        variant,
      ) =>
        variant.stock <=
        0,
    ).length;

  return (
    <div
      className={
        styles.page
      }
    >
      {/* ===================================================
          PAGE HEADER
          =================================================== */}

      <header
        className={
          styles.pageHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            Commerce Intelligence
          </span>

          <h1>
            Dashboard
          </h1>

          <p>
            Monitor sales,
            customers,
            inventory and store
            performance from one
            place.
          </p>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <Link
            href="/admin/orders"
            className={
              styles.secondaryButton
            }
          >
            <ShoppingBag
              size={
                15
              }
            />

            Orders
          </Link>

          <Link
            href="/admin/products"
            className={
              styles.primaryButton
            }
          >
            <Package
              size={
                15
              }
            />

            Products
          </Link>
        </div>
      </header>

      {/* ===================================================
          GLOBAL DATE CONTROL
          =================================================== */}

      <section
        className={
          styles.rangePanel
        }
      >
        <div
          className={
            styles.rangeHeading
          }
        >
          <div
            className={
              styles.rangeIcon
            }
          >
            <CalendarDays
              size={
                18
              }
            />
          </div>

          <div>
            <strong>
              Analytics Period
            </strong>

            <span>
              {shortRangeLabel(
                start,
                end,
              )}
            </span>
          </div>
        </div>

        <div
          className={
            styles.presetTabs
          }
        >
          <Link
            href="/admin?preset=daily"
            className={
              preset ===
              "daily"
                ? styles.presetActive
                : ""
            }
          >
            Today
          </Link>

          <Link
            href="/admin?preset=monthly"
            className={
              preset ===
              "monthly"
                ? styles.presetActive
                : ""
            }
          >
            Monthly
          </Link>

          <Link
            href="/admin?preset=yearly"
            className={
              preset ===
              "yearly"
                ? styles.presetActive
                : ""
            }
          >
            Yearly
          </Link>
        </div>

        <form
          method="get"
          className={
            styles.dateForm
          }
        >
          <input
            type="hidden"
            name="preset"
            value="custom"
          />

          <label>
            <span>
              From
            </span>

            <input
              type="date"
              name="from"
              defaultValue={
                inputDate(
                  start,
                )
              }
            />
          </label>

          <span
            className={
              styles.dateSeparator
            }
          >
            —
          </span>

          <label>
            <span>
              To
            </span>

            <input
              type="date"
              name="to"
              defaultValue={
                inputDate(
                  end,
                )
              }
            />
          </label>

          <button
            type="submit"
          >
            Apply
          </button>
        </form>
      </section>

      {/* ===================================================
          KPI ROW
          =================================================== */}

      <section
        className={
          styles.kpiGrid
        }
      >
        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <CircleDollarSign
              size={
                19
              }
            />
          </div>

          <div>
            <span>
              Total Sales
            </span>

            <strong>
              {formatBDT(
                totalSales,
              )}
            </strong>

            <small>
              Selected period
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <ShoppingBag
              size={
                19
              }
            />
          </div>

          <div>
            <span>
              Orders
            </span>

            <strong>
              {
                orders.length
              }
            </strong>

            <small>
              Valid orders
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <Users
              size={
                19
              }
            />
          </div>

          <div>
            <span>
              Customers
            </span>

            <strong>
              {
                uniqueCustomers
              }
            </strong>

            <small>
              {
                totalCustomers
              }{" "}
              total profiles
            </small>
          </div>
        </article>

        <article
          className={
            styles.kpiCard
          }
        >
          <div
            className={
              styles.kpiIcon
            }
          >
            <Boxes
              size={
                19
              }
            />
          </div>

          <div>
            <span>
              Avg. Order
            </span>

            <strong>
              {formatBDT(
                averageOrderValue,
              )}
            </strong>

            <small>
              {
                totalProducts
              }{" "}
              products live
            </small>
          </div>
        </article>
      </section>

      {/* ===================================================
          SALES OVERVIEW
          =================================================== */}

      <section
        className={`${styles.card} ${styles.salesCard}`}
      >
        <div
          className={
            styles.cardHeader
          }
        >
          <div>
            <span
              className={
                styles.sectionEyebrow
              }
            >
              Revenue
            </span>

            <h2>
              Sales Overview
            </h2>

            <p>
              Total sale:{" "}
              <strong>
                {formatBDT(
                  totalSales,
                )}
              </strong>
            </p>
          </div>

          <div
            className={
              styles.salesSummary
            }
          >
            <span>
              Paid Revenue
            </span>

            <strong>
              {formatBDT(
                paidRevenue,
              )}
            </strong>
          </div>
        </div>

        <div
          className={
            styles.chartWrap
          }
        >
          <svg
            className={
              styles.salesChart
            }
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            aria-label="Sales chart"
          >
            <defs>
              <linearGradient
                id="dashboardArea"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--orange)"
                  stopOpacity=".30"
                />

                <stop
                  offset="100%"
                  stopColor="var(--orange)"
                  stopOpacity=".015"
                />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map(
              (
                line,
              ) => {
                const y =
                  chartTop +
                  (
                    line /
                    3
                  ) *
                    (
                      chartBottom -
                      chartTop
                    );

                return (
                  <line
                    key={
                      line
                    }
                    x1={
                      chartLeft
                    }
                    x2={
                      chartRight
                    }
                    y1={
                      y
                    }
                    y2={
                      y
                    }
                    className={
                      styles.gridLine
                    }
                  />
                );
              },
            )}

            {areaPath ? (
              <path
                d={
                  areaPath
                }
                fill="url(#dashboardArea)"
              />
            ) : null}

            {linePath ? (
              <path
                d={
                  linePath
                }
                className={
                  styles.linePath
                }
              />
            ) : null}

            {chartPoints.map(
              (
                point,
              ) => (
                <circle
                  key={
                    point.key
                  }
                  cx={
                    point.x
                  }
                  cy={
                    point.y
                  }
                  r="4.5"
                  className={
                    styles.chartPoint
                  }
                />
              ),
            )}
          </svg>

          <div
            className={
              styles.chartLabels
            }
          >
            {salesData.map(
              (
                item,
              ) => (
                <span
                  key={
                    item.key
                  }
                >
                  {
                    item.label
                  }
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ===================================================
          ANALYTICS GRID
          =================================================== */}

      <section
        className={
          styles.analyticsGrid
        }
      >
        {/* TOP PRODUCTS */}

        <article
          className={
            styles.card
          }
        >
          <div
            className={
              styles.compactHeader
            }
          >
            <div>
              <span>
                Sales Ranking
              </span>

              <h2>
                Top Products
              </h2>
            </div>

            <Link
              href="/admin/products"
            >
              View all
            </Link>
          </div>

          <div
            className={
              styles.listHeader
            }
          >
            <span>
              Product
            </span>

            <span>
              Qty
            </span>

            <span>
              Amount
            </span>
          </div>

          {topProducts.length >
          0 ? (
            <div
              className={
                styles.rankList
              }
            >
              {topProducts.map(
                (
                  product,
                  index,
                ) => (
                  <div
                    key={`${product.name}-${index}`}
                    className={
                      styles.rankRow
                    }
                  >
                    <span
                      className={
                        styles.rankNumber
                      }
                    >
                      {
                        index +
                        1
                      }
                    </span>

                    <div
                      className={
                        styles.rankName
                      }
                    >
                      <strong>
                        {
                          product.name
                        }
                      </strong>
                    </div>

                    <span
                      className={
                        styles.qtyPill
                      }
                    >
                      {
                        product.quantity
                      }
                    </span>

                    <span
                      className={
                        styles.amountPill
                      }
                    >
                      {formatBDT(
                        product.amount,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyMessage
              text="Product sales will appear here after orders are placed."
            />
          )}
        </article>

        {/* TOP CATEGORIES */}

        <article
          className={
            styles.card
          }
        >
          <div
            className={
              styles.compactHeader
            }
          >
            <div>
              <span>
                Category Mix
              </span>

              <h2>
                Top Categories
              </h2>
            </div>
          </div>

          {topCategories.length >
          0 ? (
            <div
              className={
                styles.categoryPerformance
              }
            >
              <div
                className={
                  styles.categoryHero
                }
              >
                <strong>
                  {
                    topCategories.length
                  }
                </strong>

                <span>
                  Top Categories
                </span>
              </div>

              <div
                className={
                  styles.categoryList
                }
              >
                {topCategories.map(
                  (
                    category,
                    index,
                  ) => {
                    const percentage =
                      Math.round(
                        (
                          category.amount /
                          topCategoryTotal
                        ) *
                          100,
                      );

                    return (
                      <div
                        key={
                          category.name
                        }
                        className={
                          styles.categoryRow
                        }
                      >
                        <div
                          className={
                            styles.categoryRowTop
                          }
                        >
                          <span>
                            <b>
                              {String(
                                index +
                                  1,
                              ).padStart(
                                2,
                                "0",
                              )}
                            </b>

                            {
                              category.name
                            }
                          </span>

                          <strong>
                            {
                              percentage
                            }
                            %
                          </strong>
                        </div>

                        <div
                          className={
                            styles.categoryTrack
                          }
                        >
                          <span
                            style={{
                              width:
                                `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ) : (
            <EmptyMessage
              text="Category sales data will appear here after orders are placed."
            />
          )}
        </article>
      </section>

      {/* ===================================================
          SECOND ANALYTICS GRID
          =================================================== */}

      <section
        className={
          styles.analyticsGrid
        }
      >
        {/* CUSTOMERS */}

        <article
          className={
            styles.card
          }
        >
          <div
            className={
              styles.compactHeader
            }
          >
            <div>
              <span>
                Customer Value
              </span>

              <h2>
                Top Customers
              </h2>
            </div>

            <Link
              href="/admin/customers"
            >
              View all
            </Link>
          </div>

          <div
            className={
              styles.listHeaderCustomers
            }
          >
            <span>
              Customer
            </span>

            <span>
              Orders
            </span>

            <span>
              Amount
            </span>
          </div>

          {topCustomers.length >
          0 ? (
            <div
              className={
                styles.rankList
              }
            >
              {topCustomers.map(
                (
                  customer,
                  index,
                ) => (
                  <div
                    key={`${customer.name}-${index}`}
                    className={
                      styles.customerRankRow
                    }
                  >
                    <span
                      className={
                        styles.rankNumber
                      }
                    >
                      {
                        index +
                        1
                      }
                    </span>

                    <strong>
                      {
                        customer.name
                      }
                    </strong>

                    <span
                      className={
                        styles.qtyPill
                      }
                    >
                      {
                        customer.orders
                      }
                    </span>

                    <span
                      className={
                        styles.amountPill
                      }
                    >
                      {formatBDT(
                        customer.amount,
                      )}
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyMessage
              text="Customer rankings will appear when orders are placed."
            />
          )}
        </article>

        {/* STOCK */}

        <article
          className={
            styles.card
          }
        >
          <div
            className={
              styles.compactHeader
            }
          >
            <div>
              <span>
                Inventory Health
              </span>

              <h2>
                Low Stock Alert
              </h2>
            </div>

            <Link
              href="/admin/inventory"
            >
              Inventory
            </Link>
          </div>

          <div
            className={
              styles.stockSummary
            }
          >
            <div>
              <TriangleAlert
                size={
                  16
                }
              />

              <span>
                Low
              </span>

              <strong>
                {
                  lowStockCount
                }
              </strong>
            </div>

            <div>
              <PackageX
                size={
                  16
                }
              />

              <span>
                Out
              </span>

              <strong>
                {
                  outOfStockCount
                }
              </strong>
            </div>

            <div>
              <PackageCheck
                size={
                  16
                }
              />

              <span>
                Variants
              </span>

              <strong>
                {
                  activeVariants.length
                }
              </strong>
            </div>
          </div>

          {stockAttention.length >
          0 ? (
            <div
              className={
                styles.stockList
              }
            >
              {stockAttention.map(
                (
                  variant,
                  index,
                ) => (
                  <div
                    key={
                      variant.id
                    }
                    className={
                      styles.stockRow
                    }
                  >
                    <span
                      className={
                        styles.rankNumber
                      }
                    >
                      {
                        index +
                        1
                      }
                    </span>

                    <div>
                      <strong>
                        {
                          variant
                            .product
                            .name
                        }
                      </strong>

                      <small>
                        {
                          variant.sku
                        }

                        {variant.color
                          ? ` · ${variant.color}`
                          : ""}

                        {variant.size
                          ? ` · ${variant.size}`
                          : ""}
                      </small>
                    </div>

                    <span
                      className={
                        variant.stock <=
                        0
                          ? styles.stockZero
                          : styles.stockLow
                      }
                    >
                      {
                        variant.stock
                      }
                    </span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              className={
                styles.stockHealthy
              }
            >
              <PackageCheck
                size={
                  28
                }
              />

              <strong>
                Inventory looks healthy
              </strong>

              <span>
                No low-stock variants
                require attention.
              </span>
            </div>
          )}
        </article>
      </section>

      {/* ===================================================
          RECENT ORDERS
          =================================================== */}

      <section
        className={
          styles.card
        }
      >
        <div
          className={
            styles.compactHeader
          }
        >
          <div>
            <span>
              Live Operations
            </span>

            <h2>
              Recent Orders
            </h2>
          </div>

          <Link
            href="/admin/orders"
          >
            All orders

            <ArrowRight
              size={
                13
              }
            />
          </Link>
        </div>

        {recentOrders.length >
        0 ? (
          <div
            className={
              styles.orderTableWrap
            }
          >
            <table
              className={
                styles.orderTable
              }
            >
              <thead>
                <tr>
                  <th>
                    Order
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Total
                  </th>

                  <th>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map(
                  (
                    order,
                  ) => (
                    <tr
                      key={
                        order.id
                      }
                    >
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className={
                            styles.orderNumber
                          }
                        >
                          {
                            order.number
                          }
                        </Link>
                      </td>

                      <td>
                        {
                          order.customerName
                        }
                      </td>

                      <td>
                        {dateLabel(
                          order.createdAt,
                        )}
                      </td>

                      <td>
                        <div
                          className={
                            styles.paymentCell
                          }
                        >
                          <strong>
                            {
                              order.paymentMethod
                            }
                          </strong>

                          <span>
                            {formatStatus(
                              order.paymentStatus,
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {formatBDT(
                            Number(
                              order.total,
                            ),
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${statusTone(
                            order.status,
                          )}`}
                        >
                          {formatStatus(
                            order.status,
                          )}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyMessage
            text="New orders will appear here automatically."
          />
        )}
      </section>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
   ========================================================= */

function EmptyMessage({
  text,
}: {
  text:
    string;
}) {
  return (
    <div
      className={
        styles.empty
      }
    >
      <Boxes
        size={
          25
        }
      />

      <strong>
        No data yet
      </strong>

      <span>
        {
          text
        }
      </span>
    </div>
  );
}