import {
  NextResponse,
} from "next/server";

import {
  requireAdminApi,
} from "@/lib/admin-api-auth";

import {
  hasPermission,
} from "@/lib/business";

import {
  SteadfastClient,
} from "@/lib/courier/steadfast";

import {
  db,
} from "@/lib/db";

export const dynamic =
  "force-dynamic";

type RiskStatus =
  | "NO_HISTORY"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

function recordValue(
  value:
    unknown,
):
  Record<
    string,
    unknown
  > |
  null {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return null;
}

function numberValue(
  value:
    unknown,
):
  number |
  null {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    const parsed =
      Number(
        value.replace(
          /[^0-9.-]/g,
          "",
        ),
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }

  return null;
}

function nonNegativeInteger(
  value:
    unknown,
) {
  return Math.max(
    0,
    Math.trunc(
      numberValue(
        value,
      ) ??
        0,
    ),
  );
}

function fraudReportCount(
  value:
    unknown,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.length;
  }

  return nonNegativeInteger(
    value,
  );
}

function riskFromHistory({
  totalParcels,
  delivered,
  cancelled,
  fraudReports,
}: {
  totalParcels:
    number;

  delivered:
    number;

  cancelled:
    number;

  fraudReports:
    number;
}): {
  status:
    RiskStatus;

  score:
    number |
    null;

  deliveryRate:
    number |
    null;

  cancellationRate:
    number |
    null;
} {
  const completed =
    delivered +
    cancelled;

  if (
    totalParcels ===
      0 &&
    completed ===
      0
  ) {
    return {
      status:
        "NO_HISTORY",

      score:
        null,

      deliveryRate:
        null,

      cancellationRate:
        null,
    };
  }

  const denominator =
    completed >
    0
      ? completed
      : totalParcels;

  const deliveryRate =
    denominator >
    0
      ? Math.round(
          (
            delivered /
            denominator
          ) *
            100,
        )
      : null;

  const cancellationRate =
    denominator >
    0
      ? Math.round(
          (
            cancelled /
            denominator
          ) *
            100,
        )
      : null;

  let score =
    cancellationRate ??
    0;

  if (
    fraudReports >
    0
  ) {
    score =
      Math.max(
        score,
        80,
      );
  }

  let status:
    RiskStatus =
    "LOW";

  if (
    fraudReports >
      0 ||
    score >=
      60
  ) {
    status =
      "VERY_HIGH";
  } else if (
    score >=
    40
  ) {
    status =
      "HIGH";
  } else if (
    score >=
    20
  ) {
    status =
      "MEDIUM";
  }

  return {
    status,

    score,

    deliveryRate,

    cancellationRate,
  };
}

export async function POST(
  _request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  const admin =
    await requireAdminApi();

  if (
    !admin
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized.",
      },
      {
        status:
          401,
      },
    );
  }

  if (
    !hasPermission(
      admin.role,
      "orders",
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Forbidden.",
      },
      {
        status:
          403,
      },
    );
  }

  const {
    id,
  } =
    await params;

  try {
    const order =
      await db.order.findUnique({
        where: {
          id,
        },

        select: {
          id:
            true,

          number:
            true,

          phone:
            true,

          customerName:
            true,
        },
      });

    if (
      !order
    ) {
      return NextResponse.json(
        {
          error:
            "Order not found.",
        },
        {
          status:
            404,
        },
      );
    }

    if (
      !order.phone
        .trim()
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not have a customer phone number.",
        },
        {
          status:
            409,
        },
      );
    }

    const steadfast =
      await SteadfastClient
        .fromDatabase();

    const raw =
      await steadfast
        .fraudCheck(
          order.phone,
        );

    const root =
      recordValue(
        raw,
      ) ??
      {};

    const data =
      recordValue(
        root.data,
      ) ??
      recordValue(
        root.result,
      ) ??
      root;

    const delivered =
      nonNegativeInteger(
        data.total_delivered ??
          data.delivered ??
          data.totalDelivered,
      );

    const cancelled =
      nonNegativeInteger(
        data.total_cancelled ??
          data.total_canceled ??
          data.cancelled ??
          data.canceled ??
          data.totalCancelled,
      );

    const explicitTotal =
      numberValue(
        data.Total_parcels ??
          data.total_parcels ??
          data.total_orders ??
          data.totalParcels ??
          data.totalOrders,
      );

    const totalParcels =
      Math.max(
        0,
        Math.trunc(
          explicitTotal ??
            (
              delivered +
              cancelled
            ),
        ),
      );

    const fraudReports =
      fraudReportCount(
        data.total_fraud_reports ??
          data.fraud_reports ??
          data.fraudReports,
      );

    const risk =
      riskFromHistory({
        totalParcels,
        delivered,
        cancelled,
        fraudReports,
      });

    const checkedAt =
      new Date();

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "STEADFAST_FRAUD_CHECKED",

          entityType:
            "Order",

          entityId:
            order.id,

          metadata: {
            orderNumber:
              order.number,

            phone:
              order.phone,

            totalParcels,

            delivered,

            cancelled,

            fraudReports,

            riskStatus:
              risk.status,

            riskScore:
              risk.score,

            deliveryRate:
              risk.deliveryRate,

            cancellationRate:
              risk.cancellationRate,
          },
        },
      });

    return NextResponse.json({
      message:
        "Fraud check completed.",

      result: {
        phone:
          order.phone,

        totalParcels,

        delivered,

        cancelled,

        fraudReports,

        riskStatus:
          risk.status,

        riskScore:
          risk.score,

        deliveryRate:
          risk.deliveryRate,

        cancellationRate:
          risk.cancellationRate,

        checkedAt:
          checkedAt.toISOString(),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Steadfast fraud check error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to check customer fraud history.",
      },
      {
        status:
          400,
      },
    );
  }
}