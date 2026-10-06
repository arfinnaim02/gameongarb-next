import {
  db,
} from "@/lib/db";

import {
  decryptIntegrationSecret,
} from "@/lib/integrations/secret";

const DEFAULT_BASE_URL =
  "https://portal.packzy.com/api/v1";

const REQUEST_TIMEOUT_MS =
  15_000;

export const STEADFAST_PROVIDER =
  "STEADFAST";

export type SteadfastCredentials = {
  apiKey:
    string;

  secretKey:
    string;
};

export type SteadfastConfig = {
  baseUrl?:
    string;
};

export type SteadfastParcelInput = {
  invoice:
    string;

  recipient_name:
    string;

  recipient_phone:
    string;

  recipient_address:
    string;

  cod_amount:
    number;

  note?:
    string;

  item_description?:
    string;

  total_lot?:
    number;
};

export type SteadfastCreatedParcel = {
  consignmentId:
    string;

  invoice:
    string;

  trackingCode:
    string |
    null;

  status:
    string;
};

export type SteadfastStatusResult = {
  status:
    string;

  raw:
    unknown;
};

export type SteadfastTrackingEvent = {
  status:
    string |
    null;

  message:
    string;

  at:
    string |
    null;

  raw:
    unknown;
};

export type SteadfastBalanceResult = {
  currentBalance:
    number |
    null;

  raw:
    unknown;
};

type LoadedIntegration = {
  id:
    string;

  enabled:
    boolean;

  mode:
    string;

  config:
    SteadfastConfig;

  credentials:
    SteadfastCredentials;
};

function safeBaseUrl(
  value?:
    string,
) {
  const url =
    (
      value ||
      DEFAULT_BASE_URL
    ).trim();

  return url.replace(
    /\/+$/,
    "",
  );
}

function cleanText(
  value:
    string,
  maxLength:
    number,
) {
  /*
   * Packzy documents that these
   * characters are replaced on
   * their side. Clean them before
   * sending so what we store and
   * what Packzy receives remain
   * predictable.
   */
  return value
    .replace(
      /[{};<>$]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .slice(
      0,
      maxLength,
    );
}

function normalizePhone(
  phone:
    string,
) {
  return phone
    .replace(
      /\D/g,
      "",
    )
    .slice(
      0,
      40,
    );
}

function numberValue(
  value:
    unknown,
) {
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
        value,
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

function stringValue(
  value:
    unknown,
) {
  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  if (
    typeof value ===
    "number"
  ) {
    return String(
      value,
    );
  }

  return null;
}

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

function arrayValue(
  value:
    unknown,
) {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}

async function readResponseBody(
  response:
    Response,
) {
  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(
      text,
    ) as unknown;
  } catch {
    return text;
  }
}

function responseErrorMessage(
  status:
    number,

  body:
    unknown,
) {
  const record =
    recordValue(
      body,
    );

  const message =
    record
      ? stringValue(
          record.message,
        ) ??
        stringValue(
          record.error,
        )
      : null;

  if (
    status ===
    401
  ) {
    return (
      message ??
      "Steadfast rejected the API credentials."
    );
  }

  if (
    status ===
    403
  ) {
    return (
      message ??
      "Steadfast account is not allowed to perform this action."
    );
  }

  if (
    status ===
    422
  ) {
    return (
      message ??
      "Steadfast rejected one or more parcel fields."
    );
  }

  if (
    status ===
    429
  ) {
    return (
      message ??
      "Steadfast rate limit reached. Please wait before trying again."
    );
  }

  if (
    status >=
    500
  ) {
    return (
      message ??
      "Steadfast is temporarily unavailable."
    );
  }

  return (
    message ??
    `Steadfast request failed with status ${status}.`
  );
}

export async function loadSteadfastIntegration():
  Promise<
    LoadedIntegration
  > {
  const integration =
    await db.integration.findUnique({
      where: {
        service_provider: {
          service:
            "COURIER",

          provider:
            STEADFAST_PROVIDER,
        },
      },
    });

  if (
    !integration
  ) {
    throw new Error(
      "Steadfast integration has not been configured.",
    );
  }

  if (
    !integration.enabled
  ) {
    throw new Error(
      "Steadfast integration is disabled.",
    );
  }

  if (
    !integration.secretCiphertext
  ) {
    throw new Error(
      "Steadfast API credentials have not been configured.",
    );
  }

  const credentials =
    decryptIntegrationSecret<
      SteadfastCredentials
    >(
      integration.secretCiphertext,
    );

  if (
    !credentials.apiKey ||
    !credentials.secretKey
  ) {
    throw new Error(
      "Stored Steadfast credentials are incomplete.",
    );
  }

  const config =
    recordValue(
      integration.config,
    ) ??
    {};

  return {
    id:
      integration.id,

    enabled:
      integration.enabled,

    mode:
      integration.mode,

    config:
      {
        baseUrl:
          typeof config.baseUrl ===
          "string"
            ? config.baseUrl
            : DEFAULT_BASE_URL,
      },

    credentials,
  };
}

export class SteadfastClient {
  private readonly apiKey:
    string;

  private readonly secretKey:
    string;

  private readonly baseUrl:
    string;

  constructor({
    apiKey,
    secretKey,
    baseUrl =
      DEFAULT_BASE_URL,
  }: {
    apiKey:
      string;

    secretKey:
      string;

    baseUrl?:
      string;
  }) {
    if (
      !apiKey.trim() ||
      !secretKey.trim()
    ) {
      throw new Error(
        "Steadfast API key and secret key are required.",
      );
    }

    this.apiKey =
      apiKey.trim();

    this.secretKey =
      secretKey.trim();

    this.baseUrl =
      safeBaseUrl(
        baseUrl,
      );
  }

  static async fromDatabase() {
    const integration =
      await loadSteadfastIntegration();

    return new SteadfastClient({
      apiKey:
        integration
          .credentials
          .apiKey,

      secretKey:
        integration
          .credentials
          .secretKey,

      baseUrl:
        integration
          .config
          .baseUrl,
    });
  }

  private async request(
    path:
      string,

    options: {
      method?:
        "GET" |
        "POST";

      body?:
        unknown;

      authenticated?:
        boolean;
    } = {},
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

    try {
      const headers:
        Record<
          string,
          string
        > = {
        Accept:
          "application/json",
      };

      if (
        options.authenticated !==
        false
      ) {
        headers["Api-Key"] =
          this.apiKey;

        headers["Secret-Key"] =
          this.secretKey;
      }

      if (
        options.body !==
        undefined
      ) {
        headers[
          "Content-Type"
        ] =
          "application/json";
      }

      const response =
        await fetch(
          `${this.baseUrl}${path}`,
          {
            method:
              options.method ??
              "GET",

            headers,

            body:
              options.body ===
              undefined
                ? undefined
                : JSON.stringify(
                    options.body,
                  ),

            cache:
              "no-store",

            signal:
              controller.signal,
          },
        );

      const body =
        await readResponseBody(
          response,
        );

      if (
        !response.ok
      ) {
        throw new Error(
          responseErrorMessage(
            response.status,
            body,
          ),
        );
      }

      return body;
    } catch (
      error
    ) {
      if (
        error instanceof
          Error &&
        error.name ===
          "AbortError"
      ) {
        throw new Error(
          "Steadfast request timed out.",
        );
      }

      throw error;
    } finally {
      clearTimeout(
        timeout,
      );
    }
  }

  async ping() {
    return this.request(
      "/ping",
      {
        authenticated:
          false,
      },
    );
  }

  async getBalance():
    Promise<
      SteadfastBalanceResult
    > {
    const raw =
      await this.request(
        "/get_balance",
      );

    const root =
      recordValue(
        raw,
      );

    const data =
      recordValue(
        root?.data,
      ) ??
      root;

    const currentBalance =
      numberValue(
        data?.current_balance ??
          data?.balance ??
          data?.currentBalance,
      );

    return {
      currentBalance,
      raw,
    };
  }

  async createOrder(
    input:
      SteadfastParcelInput,
  ):
    Promise<
      SteadfastCreatedParcel
    > {
    const payload:
      SteadfastParcelInput = {
      invoice:
        cleanText(
          input.invoice,
          100,
        ),

      recipient_name:
        cleanText(
          input.recipient_name,
          100,
        ),

      recipient_phone:
        normalizePhone(
          input.recipient_phone,
        ),

      recipient_address:
        cleanText(
          input.recipient_address,
          490,
        ),

      cod_amount:
        Math.max(
          0,
          Number(
            input.cod_amount,
          ),
        ),

      ...(input.note
        ? {
            note:
              cleanText(
                input.note,
                480,
              ),
          }
        : {}),

      ...(input.item_description
        ? {
            item_description:
              cleanText(
                input.item_description,
                480,
              ),
          }
        : {}),

      ...(input.total_lot !==
      undefined
        ? {
            total_lot:
              Math.max(
                1,
                Math.trunc(
                  input.total_lot,
                ),
              ),
          }
        : {}),
    };

    const raw =
      await this.request(
        "/create_order",
        {
          method:
            "POST",

          body:
            payload,
        },
      );

    const root =
      recordValue(
        raw,
      );

    const consignment =
      recordValue(
        root?.consignment,
      ) ??
      recordValue(
        root?.data,
      ) ??
      root;

    const consignmentId =
      stringValue(
        consignment
          ?.consignment_id ??
          consignment
            ?.consignmentId ??
          consignment
            ?.id,
      );

    if (
      !consignmentId
    ) {
      throw new Error(
        "Steadfast created the parcel but did not return a consignment ID.",
      );
    }

    const invoice =
      stringValue(
        consignment?.invoice,
      ) ??
      payload.invoice;

    const trackingCode =
      stringValue(
        consignment
          ?.tracking_code ??
          consignment
            ?.trackingCode ??
          consignment
            ?.tracking_id,
      );

    const status =
      stringValue(
        consignment?.status,
      ) ??
      "in_review";

    return {
      consignmentId,
      invoice,
      trackingCode,
      status,
    };
  }

  async createBulkOrders(
    orders:
      SteadfastParcelInput[],
  ) {
    if (
      orders.length <
        1 ||
      orders.length >
        500
    ) {
      throw new Error(
        "Steadfast bulk booking supports between 1 and 500 parcels.",
      );
    }

    const data =
      orders.map(
        (
          order,
        ) => ({
          invoice:
            cleanText(
              order.invoice,
              100,
            ),

          recipient_name:
            cleanText(
              order.recipient_name,
              100,
            ),

          recipient_phone:
            normalizePhone(
              order.recipient_phone,
            ),

          recipient_address:
            cleanText(
              order.recipient_address,
              490,
            ),

          cod_amount:
            Math.max(
              0,
              Number(
                order.cod_amount,
              ),
            ),

          ...(order.note
            ? {
                note:
                  cleanText(
                    order.note,
                    480,
                  ),
              }
            : {}),

          ...(order.item_description
            ? {
                item_description:
                  cleanText(
                    order.item_description,
                    480,
                  ),
              }
            : {}),

          ...(order.total_lot !==
          undefined
            ? {
                total_lot:
                  Math.max(
                    1,
                    Math.trunc(
                      order.total_lot,
                    ),
                  ),
              }
            : {}),
        }),
      );

    return this.request(
      "/create_order/bulk-order/extended",
      {
        method:
          "POST",

        body: {
          data,
        },
      },
    );
  }

  async getStatusByConsignmentId(
    consignmentId:
      string,
  ):
    Promise<
      SteadfastStatusResult
    > {
    const raw =
      await this.request(
        `/status_by_cid/${encodeURIComponent(
          consignmentId,
        )}`,
      );

    return {
      status:
        extractStatus(
          raw,
        ),

      raw,
    };
  }

  async getStatusWithReturnByConsignmentId(
    consignmentId:
      string,
  ):
    Promise<
      SteadfastStatusResult
    > {
    const raw =
      await this.request(
        `/status_with_return_status_by_cid/${encodeURIComponent(
          consignmentId,
        )}`,
      );

    return {
      status:
        extractStatus(
          raw,
        ),

      raw,
    };
  }

  async getStatusByInvoice(
    invoice:
      string,
  ):
    Promise<
      SteadfastStatusResult
    > {
    const raw =
      await this.request(
        `/status_by_invoice/${encodeURIComponent(
          invoice,
        )}`,
      );

    return {
      status:
        extractStatus(
          raw,
        ),

      raw,
    };
  }

  async getStatusByTrackingCode(
    trackingCode:
      string,
  ):
    Promise<
      SteadfastStatusResult
    > {
    const raw =
      await this.request(
        `/status_by_trackingcode/${encodeURIComponent(
          trackingCode,
        )}`,
      );

    return {
      status:
        extractStatus(
          raw,
        ),

      raw,
    };
  }

  async getTrackingsByInvoice(
    invoice:
      string,
  ):
    Promise<
      SteadfastTrackingEvent[]
    > {
    const raw =
      await this.request(
        `/trackings_by_invoice/${encodeURIComponent(
          invoice,
        )}`,
      );

    const root =
      recordValue(
        raw,
      );

    const candidates =
      arrayValue(
        root?.data ??
          root?.trackings ??
          root?.tracking,
      );

    return candidates.map(
      (
        entry,
      ) => {
        const row =
          recordValue(
            entry,
          );

        const status =
          stringValue(
            row?.status ??
              row?.delivery_status,
          );

        const message =
          stringValue(
            row?.message ??
              row?.description ??
              row?.details ??
              row?.status,
          ) ??
          "Courier tracking update";

        const at =
          stringValue(
            row?.created_at ??
              row?.updated_at ??
              row?.date ??
              row?.time,
          );

        return {
          status,
          message,
          at,
          raw:
            entry,
        };
      },
    );
  }

  async fraudCheck(
    phone:
      string,
  ) {
    return this.request(
      `/fraud_check/score/${encodeURIComponent(
        normalizePhone(
          phone,
        ),
      )}`,
    );
  }
}

function extractStatus(
  raw:
    unknown,
) {
  const root =
    recordValue(
      raw,
    );

  const data =
    recordValue(
      root?.data,
    ) ??
    root;

  const status =
    stringValue(
      data?.delivery_status ??
        data?.status ??
        data?.current_status,
    );

  return (
    status ??
    "unknown"
  );
}

export type GOGCourierOrder = {
  number:
    string;

  customerName:
    string;

  phone:
    string;

  shippingAddress:
    string;

  total:
    number;

  paymentMethod:
    "COD" |
    "BKASH";

  paymentStatus:
    string;

  internalNotes?:
    string |
    null;

  items:
    {
      name:
        string;

      sku:
        string;

      size:
        string |
        null;

      color:
        string |
        null;

      quantity:
        number;
    }[];
};

export function buildSteadfastParcel(
  order:
    GOGCourierOrder,
):
  SteadfastParcelInput {
  if (
    order.paymentMethod ===
      "BKASH" &&
    order.paymentStatus !==
      "PAID"
  ) {
    throw new Error(
      "This bKash order must be paid before it can be sent to Steadfast.",
    );
  }

  const totalLot =
    order.items.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,
      0,
    );

  const descriptions =
    order.items.map(
      (
        item,
      ) => {
        const variant = [
          item.color,
          item.size,
        ]
          .filter(
            Boolean,
          )
          .join(
            " / ",
          );

        return `${item.name}${
          variant
            ? ` (${variant})`
            : ""
        } x${item.quantity}`;
      },
    );

  return {
    invoice:
      order.number,

    recipient_name:
      order.customerName,

    recipient_phone:
      order.phone,

    recipient_address:
      order.shippingAddress,

    cod_amount:
      order.paymentMethod ===
      "COD"
        ? order.total
        : 0,

    total_lot:
      Math.max(
        1,
        totalLot,
      ),

    item_description:
      descriptions.join(
        " | ",
      ),

    ...(order.internalNotes
      ? {
          note:
            order.internalNotes,
        }
      : {}),
  };
}