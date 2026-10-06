import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { notFound } from "next/navigation";

import {
  OrdersDashboard,
  type OrdersDashboardData,
} from "@/components/admin/orders-dashboard";

import {
  hasPermission,
} from "@/lib/business";

import {
  db,
} from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/session";

export const dynamic =
  "force-dynamic";

const ORDER_STATUSES: OrderStatus[] = [
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

const PAYMENT_METHODS: PaymentMethod[] = [
  "COD",
  "BKASH",
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PROCESSING",
  "PAID",
  "FAILED",
  "REFUNDED",
];

type SearchParams =
  Record<
    string,
    string |
      string[] |
      undefined
  >;

function getParam(
  params: SearchParams,
  key: string,
) {
  const value =
    params[key];

  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return value ?? "";
}

function positiveInt(
  value: string,
  fallback: number,
) {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(
      parsed,
    ) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

function getDhakaStartOfToday() {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Dhaka",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    );

  const parts =
    formatter.formatToParts(
      new Date(),
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ],
      ),
    );

  return new Date(
    `${values.year}-${values.month}-${values.day}T00:00:00+06:00`,
  );
}

function getPeriodStart(
  period: string,
) {
  if (
    period ===
    "TODAY"
  ) {
    return getDhakaStartOfToday();
  }

  const now =
    new Date();

  if (
    period ===
    "7D"
  ) {
    return new Date(
      now.getTime() -
        7 *
          24 *
          60 *
          60 *
          1000,
    );
  }

  if (
    period ===
    "30D"
  ) {
    return new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000,
    );
  }

  return null;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin =
    await requireAdmin();

  if (
    !hasPermission(
      admin.role,
      "orders",
    )
  ) {
    notFound();
  }

  const params =
    await searchParams;

  const search =
    getParam(
      params,
      "search",
    ).trim();

const problem =
  getParam(
    params,
    "problem",
  ) ===
  "1";

const requestedStatus =
  getParam(
    params,
    "status",
  );
  const status =
    ORDER_STATUSES.includes(
      requestedStatus as OrderStatus,
    )
      ? (
          requestedStatus as OrderStatus
        )
      : null;

  const requestedPayment =
    getParam(
      params,
      "payment",
    );

  const payment =
    PAYMENT_METHODS.includes(
      requestedPayment as PaymentMethod,
    )
      ? (
          requestedPayment as PaymentMethod
        )
      : null;

  const requestedPaymentStatus =
    getParam(
      params,
      "paymentStatus",
    );

  const paymentStatus =
    PAYMENT_STATUSES.includes(
      requestedPaymentStatus as PaymentStatus,
    )
      ? (
          requestedPaymentStatus as PaymentStatus
        )
      : null;

  const courier =
    getParam(
      params,
      "courier",
    ).toUpperCase();

  const area =
    getParam(
      params,
      "area",
    ).toUpperCase();

  const period =
    getParam(
      params,
      "period",
    ).toUpperCase();

  const sort =
    getParam(
      params,
      "sort",
    ).toUpperCase();

  const page =
    positiveInt(
      getParam(
        params,
        "page",
      ),
      1,
    );

  const pageSize =
    25;

  const where:
    Prisma.OrderWhereInput = {};

  const and:
    Prisma.OrderWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        {
          number: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          customerName: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          phone: {
            contains:
              search,
          },
        },

        {
          district: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },

        {
          shippingAddress: {
            contains:
              search,

            mode:
              "insensitive",
          },
        },
      ],
    });
  }

  if (problem) {
    and.push({
      status: {
        in: [
          "CANCELLED",
          "FAILED_DELIVERY",
          "RETURN_REQUESTED",
          "RETURNED",
        ],
      },
    });
  } else if (status) {
    and.push({
      status,
    });
  }

  if (payment) {
    and.push({
      paymentMethod:
        payment,
    });
  }

  if (
    paymentStatus
  ) {
    and.push({
      paymentStatus,
    });
  }

  if (
    area ===
    "DHAKA"
  ) {
    and.push({
      district: {
        equals:
          "Dhaka",

        mode:
          "insensitive",
      },
    });
  }

  if (
    area ===
    "OUTSIDE_DHAKA"
  ) {
    and.push({
      NOT: {
        district: {
          equals:
            "Dhaka",

          mode:
            "insensitive",
        },
      },
    });
  }

  const periodStart =
    getPeriodStart(
      period,
    );

  if (
    periodStart
  ) {
    and.push({
      createdAt: {
        gte:
          periodStart,
      },
    });
  }

  if (
    courier ===
    "UNASSIGNED"
  ) {
    and.push({
      shipment: {
        is:
          null,
      },
    });
  } else if (
    courier ===
      "STEADFAST" ||
    courier ===
      "PATHAO"
  ) {
    and.push({
      shipment: {
        is: {
          provider: {
            equals:
              courier,

            mode:
              "insensitive",
          },
        },
      },
    });
  }

  if (
    and.length >
    0
  ) {
    where.AND =
      and;
  }

  let orderBy:
    Prisma.OrderOrderByWithRelationInput = {
      createdAt:
        "desc",
    };

  if (
    sort ===
    "OLDEST"
  ) {
    orderBy = {
      createdAt:
        "asc",
    };
  }

  if (
    sort ===
    "AMOUNT_HIGH"
  ) {
    orderBy = {
      total:
        "desc",
    };
  }

  if (
    sort ===
    "AMOUNT_LOW"
  ) {
    orderBy = {
      total:
        "asc",
    };
  }

  const todayStart =
    getDhakaStartOfToday();

  const [
    filteredCount,
    rows,
    totalOrders,
    newOrders,
    confirmedOrders,
    packingOrders,
    readyOrders,
    shippedOrders,
    deliveredOrders,
    problemOrders,
    todayOrders,
    todayRevenue,
  ] =
    await Promise.all([
      db.order.count({
        where,
      }),

      db.order.findMany({
        where,

        orderBy,

        skip:
          (page - 1) *
          pageSize,

        take:
          pageSize,

        include: {
          items: {
            select: {
              quantity:
                true,
            },
          },

          shipment:
            true,
        },
      }),

      db.order.count(),

      db.order.count({
        where: {
          status:
            "NEW",
        },
      }),

      db.order.count({
        where: {
          status:
            "CONFIRMED",
        },
      }),

      db.order.count({
        where: {
          status:
            "PACKING",
        },
      }),

      db.order.count({
        where: {
          status:
            "READY_TO_SHIP",
        },
      }),

      db.order.count({
        where: {
          status:
            "SHIPPED",
        },
      }),

      db.order.count({
        where: {
          status:
            "DELIVERED",
        },
      }),

      db.order.count({
        where: {
          status: {
            in: [
              "CANCELLED",
              "FAILED_DELIVERY",
              "RETURN_REQUESTED",
              "RETURNED",
            ],
          },
        },
      }),

      db.order.count({
        where: {
          createdAt: {
            gte:
              todayStart,
          },
        },
      }),

      db.order.aggregate({
        where: {
          createdAt: {
            gte:
              todayStart,
          },

          status: {
            not:
              "CANCELLED",
          },
        },

        _sum: {
          total:
            true,
        },
      }),
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCount /
          pageSize,
      ),
    );

  const safePage =
    Math.min(
      page,
      totalPages,
    );

  const data:
    OrdersDashboardData = {
    rows:
      rows.map(
        (
          order,
        ) => ({
          id:
            order.id,

          number:
            order.number,

          customer:
            order.customerName,

          phone:
            order.phone,

          district:
            order.district,

          address:
            order.shippingAddress,

          itemCount:
            order.items.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.quantity,
              0,
            ),

          total:
            Number(
              order.total,
            ),

          payment:
            order.paymentMethod,

          paymentStatus:
            order.paymentStatus,

          status:
            order.status,

          date:
            order.createdAt.toISOString(),

          courier:
            order.shipment
              ?.provider ??
            null,

          courierStatus:
            order.shipment
              ?.status ??
            null,

          trackingId:
            order.shipment
              ?.trackingId ??
            null,

          risk: {
            status:
              "PENDING",

            score:
              null,
          },
        }),
      ),

    stats: {
      total:
        totalOrders,

      new:
        newOrders,

      confirmed:
        confirmedOrders,

      packing:
        packingOrders,

      ready:
        readyOrders,

      shipped:
        shippedOrders,

      delivered:
        deliveredOrders,

      problem:
        problemOrders,

      today:
        todayOrders,

      todayRevenue:
        Number(
          todayRevenue
            ._sum
            .total ??
            0,
        ),
    },

    pagination: {
      page:
        safePage,

      pageSize,

      total:
        filteredCount,

      totalPages,
    },

    filters: {
      search,

      status:
        status ?? "",

      payment:
        payment ?? "",

      paymentStatus:
        paymentStatus ??
        "",

      courier,

      area,

      period,

      sort,
    },
  };

  return (
    <OrdersDashboard
      data={
        data
      }
    />
  );
}