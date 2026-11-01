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

type FraudSource =
  | "LIVE"
  | "LAST_SUCCESSFUL";

type ProviderCourier = {
  courier_name?:
    string;

  total?:
    number |
    string;

  delivered?:
    number |
    string;

  cancelled?:
    number |
    string;

  total_parcels?:
    number |
    string;

  total_delivered_parcels?:
    number |
    string;

  total_cancelled_parcels?:
    number |
    string;

  status?:
    string;
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

  mobile_number?:
    string;

  total_parcels?:
    number |
    string;

  total_delivered?:
    number |
    string;

  /*
   * FraudChecker has used both names.
   * Support both so a provider-side schema
   * change does not silently erase history.
   */
  total_cancel?:
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

  /*
   * Older response shape.
   */
  couriers?:
    Record<
      string,
      ProviderCourier
    >;

  /*
   * Current response shape observed in
   * production on 2026-11-01.
   */
  apis?:
    Record<
      string,
      ProviderCourier
    >;
};

type NormalizedFraudResult = {
  phone:
    string;

  totalParcels:
    number;

  delivered:
    number;

  cancelled:
    number;

  fraudReports:
    number;

  riskStatus:
    RiskStatus;

  riskScore:
    number |
    null;

  deliveryRate:
    number |
    null;

  cancellationRate:
    number |
    null;

  providerRiskStatus:
    string |
    null;

  couriers:
    Record<
      string,
      CourierResult
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

  const cancellationRate =
    (
      cancelled /
      totalParcels
    ) *
    100;

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
  raw:
    FraudCheckerResponse,
):
  Record<
    string,
    CourierResult
  > {
  const value =
    raw.apis ??
    raw.couriers;

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
              data.total_parcels ??
              data.total,
            ),
          ),
        ),

      delivered:
        Math.max(
          0,
          Math.trunc(
            numberValue(
              data.total_delivered_parcels ??
              data.delivered,
            ),
          ),
        ),

      cancelled:
        Math.max(
          0,
          Math.trunc(
            numberValue(
              data.total_cancelled_parcels ??
              data.cancelled,
            ),
          ),
        ),
    };
  }

  return result;
}

function normalizeProviderResult(
  raw:
    FraudCheckerResponse,

  fallbackPhone:
    string,
):
  NormalizedFraudResult {
  const couriers =
    normalizeCouriers(
      raw,
    );

  const courierTotals =
    Object.values(
      couriers,
    ).reduce(
      (
        totals,
        courier,
      ) => ({
        total:
          totals.total +
          courier.total,

        delivered:
          totals.delivered +
          courier.delivered,

        cancelled:
          totals.cancelled +
          courier.cancelled,
      }),
      {
        total:
          0,

        delivered:
          0,

        cancelled:
          0,
      },
    );

  const providerTotal =
    Math.max(
      0,
      Math.trunc(
        numberValue(
          raw.total_parcels,
        ),
      ),
    );

  const providerDelivered =
    Math.max(
      0,
      Math.trunc(
        numberValue(
          raw.total_delivered,
        ),
      ),
    );

  const providerCancelled =
    Math.max(
      0,
      Math.trunc(
        numberValue(
          raw.total_cancel ??
          raw.total_cancelled,
        ),
      ),
    );

  /*
   * Use whichever source is more complete:
   * top-level totals or the sum of courier rows.
   */
  const totalParcels =
    Math.max(
      providerTotal,
      courierTotals.total,
      providerDelivered +
        providerCancelled,
      courierTotals.delivered +
        courierTotals.cancelled,
    );

  const delivered =
    Math.max(
      providerDelivered,
      courierTotals.delivered,
    );

  const cancelled =
    Math.max(
      providerCancelled,
      courierTotals.cancelled,
    );

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

  return {
    phone:
      normalizePhone(
        raw.mobile_number ??
        raw.phone ??
        fallbackPhone,
      ),

    totalParcels:
      normalizedTotal,

    delivered,

    cancelled,

    fraudReports,

    riskStatus,

    riskScore:
      cancellationRate,

    deliveryRate,

    cancellationRate,

    providerRiskStatus:
      raw.risk_status ??
      null,

    couriers,
  };
}

async function fetchFraudChecker(
  url:
    URL,
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      15_000,
    );

  try {
    const response =
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

    if (
      !response.ok
    ) {
      const providerMessage =
        raw.message ??
        raw.error;

      throw new Error(
        providerMessage ??
        `FraudChecker request failed with HTTP ${response.status}.`,
      );
    }

    if (
      raw.success ===
        false
    ) {
      throw new Error(
        raw.message ??
        raw.error ??
        "FraudChecker could not check this customer.",
      );
    }

    return raw;
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

async function sleep(
  ms:
    number,
) {
  await new Promise<
    void
  >(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        ms,
      );
    },
  );
}

async function getLastSuccessfulResult(
  phone:
    string,
) {
  const logs =
    await db.activityLog.findMany({
      where: {
        action:
          "FRAUDCHECKER_CUSTOMER_CHECKED",

        metadata: {
          path: [
            "phone",
          ],

          equals:
            phone,
        },
      },

      select: {
        metadata:
          true,

        createdAt:
          true,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take:
        20,
    });

  for (
    const log
    of logs
  ) {
    const metadata =
      log.metadata;

    if (
      !metadata ||
      typeof metadata !==
        "object" ||
      Array.isArray(
        metadata,
      )
    ) {
      continue;
    }

    const data =
      metadata as
        Record<
          string,
          unknown
        >;

    const totalParcels =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            data.totalParcels,
          ),
        ),
      );

    if (
      totalParcels <=
      0
    ) {
      continue;
    }

    const delivered =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            data.delivered,
          ),
        ),
      );

    const cancelled =
      Math.max(
        0,
        Math.trunc(
          numberValue(
            data.cancelled,
          ),
        ),
      );

    const cancellationRate =
      data.cancellationRate ===
        null
        ? null
        : numberValue(
            data.cancellationRate,
          );

    const deliveryRate =
      data.deliveryRate ===
        null
        ? null
        : numberValue(
            data.deliveryRate,
          );

    const riskStatusValue =
      typeof data.riskStatus ===
        "string"
        ? data.riskStatus
        : "LOW";

    const riskStatus:
      RiskStatus =
        [
          "NO_HISTORY",
          "LOW",
          "MEDIUM",
          "HIGH",
          "VERY_HIGH",
        ].includes(
          riskStatusValue,
        )
          ? riskStatusValue as
              RiskStatus
          : normalizeRiskStatus(
              undefined,
              {
                totalParcels,
                cancelled,
              },
            );

    const rawCouriers =
      data.couriers;

    const couriers:
      Record<
        string,
        CourierResult
      > =
        rawCouriers &&
        typeof rawCouriers ===
          "object" &&
        !Array.isArray(
          rawCouriers,
        )
          ? Object.fromEntries(
              Object.entries(
                rawCouriers,
              ).map(
                (
                  [
                    name,
                    value,
                  ],
                ) => {
                  const item =
                    value &&
                    typeof value ===
                      "object" &&
                    !Array.isArray(
                      value,
                    )
                      ? value as
                          Record<
                            string,
                            unknown
                          >
                      : {};

                  return [
                    name,
                    {
                      total:
                        Math.max(
                          0,
                          Math.trunc(
                            numberValue(
                              item.total,
                            ),
                          ),
                        ),

                      delivered:
                        Math.max(
                          0,
                          Math.trunc(
                            numberValue(
                              item.delivered,
                            ),
                          ),
                        ),

                      cancelled:
                        Math.max(
                          0,
                          Math.trunc(
                            numberValue(
                              item.cancelled,
                            ),
                          ),
                        ),
                    },
                  ];
                },
              ),
            )
          : {};

    return {
      result: {
        phone,

        totalParcels,

        delivered,

        cancelled,

        fraudReports:
          Math.max(
            0,
            Math.trunc(
              numberValue(
                data.fraudReports,
              ),
            ),
          ),

        riskStatus,

        riskScore:
          cancellationRate,

        deliveryRate,

        cancellationRate,

        providerRiskStatus:
          typeof data.providerRiskStatus ===
            "string"
            ? data.providerRiskStatus
            : null,

        couriers,
      } satisfies NormalizedFraudResult,

      checkedAt:
        log.createdAt,
    };
  }

  return null;
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

    /*
     * FraudChecker has been observed returning
     * contradictory zero/non-zero results for the
     * same number. Retry once when the first live
     * lookup unexpectedly reports no history.
     */
    let attempts =
      1;

    let raw =
      await fetchFraudChecker(
        url,
      );

    let liveResult =
      normalizeProviderResult(
        raw,
        phone,
      );

    if (
      liveResult.totalParcels ===
      0
    ) {
      await sleep(
        700,
      );

      attempts =
        2;

      raw =
        await fetchFraudChecker(
          url,
        );

      liveResult =
        normalizeProviderResult(
          raw,
          phone,
        );
    }

    const providerCheckedAt =
      new Date();

    let resolvedResult =
      liveResult;

    let source:
      FraudSource =
        "LIVE";

    let resultCheckedAt =
      providerCheckedAt;

    /*
     * A fresh zero must not erase a known-good
     * historical result when the provider is
     * temporarily inconsistent. We clearly mark
     * the fallback as cached/last-successful.
     */
    if (
      liveResult.totalParcels ===
      0
    ) {
      const previous =
        await getLastSuccessfulResult(
          phone,
        );

      if (
        previous
      ) {
        resolvedResult =
          previous.result;

        source =
          "LAST_SUCCESSFUL";

        resultCheckedAt =
          previous.checkedAt;
      }
    }

    await db.activityLog.create({
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
            resolvedResult.totalParcels,

          delivered:
            resolvedResult.delivered,

          cancelled:
            resolvedResult.cancelled,

          fraudReports:
            resolvedResult.fraudReports,

          providerRiskStatus:
            resolvedResult.providerRiskStatus,

          riskStatus:
            resolvedResult.riskStatus,

          riskScore:
            resolvedResult.riskScore,

          deliveryRate:
            resolvedResult.deliveryRate,

          cancellationRate:
            resolvedResult.cancellationRate,

          couriers:
            resolvedResult.couriers,

          source,

          attempts,

          providerReturnedZero:
            liveResult.totalParcels ===
            0,

          providerCheckedAt:
            providerCheckedAt.toISOString(),

          resultCheckedAt:
            resultCheckedAt.toISOString(),
        },
      },
    });

    /*
     * Keep only a compact production diagnostic.
     * Never log the API key or full provider payload.
     */
    console.info(
      "FRAUDCHECKER CHECK",
      {
        phone,

        attempts,

        providerTotal:
          liveResult.totalParcels,

        resolvedTotal:
          resolvedResult.totalParcels,

        source,
      },
    );

    return NextResponse.json({
      message:
        source ===
        "LAST_SUCCESSFUL"
          ? "FraudChecker returned no history right now. Showing the last successful result for this customer."
          : attempts >
              1
            ? "Fraud check completed after retrying the provider."
            : "Fraud check completed.",

      result: {
        ...resolvedResult,

        checkedAt:
          resultCheckedAt.toISOString(),

        providerCheckedAt:
          providerCheckedAt.toISOString(),

        source,

        attempts,

        providerReturnedZero:
          liveResult.totalParcels ===
          0,
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
