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

type CourierResult = {
  total:
    number;

  delivered:
    number;

  cancelled:
    number;
};

type FraudCheckerResponse = {
  success?:
    boolean;

  message?:
    string;

  error?:
    string;

  phone?:
    string;

  total_parcels?:
    number |
    string;

  total_delivered?:
    number |
    string;

  total_cancelled?:
    number |
    string;

  delivery_rate?:
    number |
    string;

  risk_status?:
    string;

  total_fraud_reports?:
    number |
    string;

  fraud_reports?:
    unknown[];

  couriers?:
    Record<
      string,
      {
        total?:
          number |
          string;

        delivered?:
          number |
          string;

        cancelled?:
          number |
          string;
      }
    >;
};

function numberValue(
  value:
    unknown,
):
  number {
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
        value
          .replace(
            "%",
            "",
          )
          .trim(),
      );

    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }

  return 0;
}

function normalizePhone(
  phone:
    string,
) {
  let digits =
    phone.replace(
      /\D/g,
      "",
    );

  /*
   * FraudChecker examples use
   * Bangladesh local format:
   * 01XXXXXXXXX
   */
  if (
    digits.startsWith(
      "880",
    )
  ) {
    digits =
      `0${digits.slice(
        3,
      )}`;
  } else if (
    digits.startsWith(
      "88",
    ) &&
    digits.length ===
      13
  ) {
    digits =
      digits.slice(
        2,
      );
  }

  return digits;
}

function normalizeRiskStatus(
  value:
    string |
    undefined,

  {
    totalParcels,
    cancelled,
  }: {
    totalParcels:
      number;

    cancelled:
      number;
  },
):
  RiskStatus {
  if (
    totalParcels <=
    0
  ) {
    return "NO_HISTORY";
  }

  const normalized =
    (
      value ??
      ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[_-]+/g,
        " ",
      );

  if (
    normalized.includes(
      "very high",
    ) ||
    normalized.includes(
      "very risky",
    )
  ) {
    return "VERY_HIGH";
  }

  if (
    normalized.includes(
      "high",
    )
  ) {
    return "HIGH";
  }

  if (
    normalized.includes(
      "medium",
    ) ||
    normalized.includes(
      "moderate",
    )
  ) {
    return "MEDIUM";
  }

  if (
    normalized.includes(
      "low",
    ) ||
    normalized.includes(
      "safe",
    )
  ) {
    return "LOW";
  }

  /*
   * Fallback only if FraudChecker
   * does not provide a recognizable
   * risk_status.
   */
  const cancellationRate =
    totalParcels >
    0
      ? (
          cancelled /
          totalParcels
        ) *
        100
      : 0;

  if (
    cancellationRate >=
    60
  ) {
    return "VERY_HIGH";
  }

  if (
    cancellationRate >=
    40
  ) {
    return "HIGH";
  }

  if (
    cancellationRate >=
    20
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function normalizeCouriers(
  value:
    FraudCheckerResponse[
      "couriers"
    ],
):
  Record<
    string,
    CourierResult
  > {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {};
  }

  const result:
    Record<
      string,
      CourierResult
    > = {};

  for (
    const [
      courier,
      data,
    ]
    of Object.entries(
      value,
    )
  ) {
    result[courier] = {
      total:
        Math.max(
          0,
          Math.trunc(
            numberValue(
              data?.total,
            ),
          ),
        ),

      delivered:
        Math.max(
          0,
          Math.trunc(
            numberValue(
              data?.delivered,
            ),
          ),
        ),

      cancelled:
        Math.max(
          0,
          Math.trunc(
            numberValue(
              data?.cancelled,
            ),
          ),
        ),
    };
  }

  return result;
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
    const apiKey =
      process.env
        .FRAUD_API
        ?.trim();

    if (
      !apiKey
    ) {
      throw new Error(
        "FraudChecker API key is not configured. Add FRAUD_API to the server environment.",
      );
    }

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

          customerName:
            true,

          phone:
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

    const phone =
      normalizePhone(
        order.phone,
      );

    if (
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not contain a valid Bangladesh mobile number.",
        },
        {
          status:
            422,
        },
      );
    }

    const url =
      new URL(
        "https://fraudchecker.link/api/v1/qc/",
      );

    url.searchParams.set(
      "api_key",
      apiKey,
    );

    url.searchParams.set(
      "phone",
      phone,
    );

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        15_000,
      );

    let response:
      Response;

    try {
      response =
        await fetch(
          url.toString(),
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json",
            },

            cache:
              "no-store",

            signal:
              controller.signal,
          },
        );
    } finally {
      clearTimeout(
        timeout,
      );
    }

    const responseText =
      await response.text();

    let raw:
      FraudCheckerResponse;

    try {
      raw =
        responseText
          ? JSON.parse(
              responseText,
            ) as FraudCheckerResponse
          : {};
    } catch {
      throw new Error(
        `FraudChecker returned an invalid response (HTTP ${response.status}).`,
      );
    }

    /*
     * Keep this temporarily while
     * testing the real API response.
     *
     * Never log the API key.
     */
    console.log(
      "FRAUDCHECKER RESPONSE:",
      JSON.stringify(
        raw,
        null,
        2,
      ),
    );

    if (
      !response.ok
    ) {
      const providerMessage =
        raw.message ??
        raw.error;

      return NextResponse.json(
        {
          error:
            providerMessage ??
            `FraudChecker request failed with HTTP ${response.status}.`,
        },
        {
          status:
            response.status >=
              400 &&
            response.status <
              600
              ? response.status
              : 502,
        },
      );
    }

    if (
      raw.success ===
      false
    ) {
      return NextResponse.json(
        {
          error:
            raw.message ??
            raw.error ??
            "FraudChecker could not check this customer.",
        },
        {
          status:
            502,
        },
      );
    }

    const totalParcels =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            raw.total_parcels,
          ),
        ),
      );

    const delivered =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            raw.total_delivered,
          ),
        ),
      );

    const cancelled =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            raw.total_cancelled,
          ),
        ),
      );

    /*
     * If the provider's reported total
     * is unexpectedly lower than the
     * delivered + cancelled figures,
     * use the actual completed counts.
     */
    const normalizedTotal =
      Math.max(
        totalParcels,
        delivered +
          cancelled,
      );

    const providerDeliveryRate =
      numberValue(
        raw.delivery_rate,
      );

    const deliveryRate =
      normalizedTotal >
      0
        ? providerDeliveryRate >
          0
          ? Math.round(
              providerDeliveryRate *
                100,
            ) /
            100
          : Math.round(
              (
                delivered /
                normalizedTotal
              ) *
                10_000,
            ) /
            100
        : null;

    const cancellationRate =
      normalizedTotal >
      0
        ? Math.round(
            (
              cancelled /
              normalizedTotal
            ) *
              10_000,
          ) /
          100
        : null;

    const fraudReports =
      Array.isArray(
        raw.fraud_reports,
      )
        ? raw
            .fraud_reports
            .length
        : Math.max(
            0,
            Math.trunc(
              numberValue(
                raw.total_fraud_reports,
              ),
            ),
          );

    const riskStatus =
      normalizeRiskStatus(
        raw.risk_status,
        {
          totalParcels:
            normalizedTotal,

          cancelled,
        },
      );

    /*
     * Keep riskScore compatible with
     * the existing dashboard model.
     * Here it represents return /
     * cancellation percentage.
     */
    const riskScore =
      cancellationRate;

    const couriers =
      normalizeCouriers(
        raw.couriers,
      );

    const checkedAt =
      new Date();

    await db
      .activityLog
      .create({
        data: {
          actorId:
            admin.id,

          action:
            "FRAUDCHECKER_CUSTOMER_CHECKED",

          entityType:
            "Order",

          entityId:
            order.id,

          metadata: {
            provider:
              "FRAUDCHECKER",

            orderNumber:
              order.number,

            phone,

            totalParcels:
              normalizedTotal,

            delivered,

            cancelled,

            fraudReports,

            providerRiskStatus:
              raw.risk_status ??
              null,

            riskStatus,

            riskScore,

            deliveryRate,

            cancellationRate,

            couriers,
          },
        },
      });

    return NextResponse.json({
      message:
        "Fraud check completed.",

      result: {
        phone,

        totalParcels:
          normalizedTotal,

        delivered,

        cancelled,

        fraudReports,

        riskStatus,

        riskScore,

        deliveryRate,

        cancellationRate,

        checkedAt:
          checkedAt.toISOString(),

        providerRiskStatus:
          raw.risk_status ??
          null,

        couriers,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "FraudChecker error:",
      error,
    );

    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      return NextResponse.json(
        {
          error:
            "FraudChecker request timed out. Please try again.",
        },
        {
          status:
            504,
        },
      );
    }

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
          500,
      },
    );
  }
}