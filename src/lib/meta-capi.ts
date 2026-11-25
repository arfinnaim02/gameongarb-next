import {
  createHash,
} from "node:crypto";

import {
  db,
} from "@/lib/db";

export type MetaRequestContext = {
  clientIp:
    string | null;

  clientUserAgent:
    string | null;

  eventSourceUrl:
    string | null;

  fbp:
    string | null;

  fbc:
    string | null;
};

export type MetaCustomerData = {
  email?:
    string | null;

  phone?:
    string | null;

  firstName?:
    string | null;

  lastName?:
    string | null;

  city?:
    string | null;

  country?:
    string | null;

  externalId?:
    string | null;
};

type MetaServerEventInput = {
  eventName:
    | "PageView"
    | "ViewContent"
    | "Search"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase";

  eventId:
    string;

  eventTime?:
    number;

  eventSourceUrl?:
    string | null;

  customData?:
    Record<
      string,
      unknown
    >;

  customerData?:
    MetaCustomerData;

  context?:
    MetaRequestContext;
};

type MetaCapiConfig = {
  pixelId:
    string;

  accessToken:
    string;

  testEventCode:
    string | null;
};

function getConfig():
  MetaCapiConfig |
  null {
  const pixelId =
    process.env
      .META_CAPI_PIXEL_ID
      ?.trim() ??
    "";

  const accessToken =
    process.env
      .META_CAPI_ACCESS_TOKEN
      ?.trim() ??
    "";

  if (
    !/^\d+$/.test(
      pixelId,
    ) ||
    !accessToken
  ) {
    return null;
  }

  return {
    pixelId,

    accessToken,

    testEventCode:
      process.env
        .META_CAPI_TEST_EVENT_CODE
        ?.trim() ||
      null,
  };
}

function cookieValue(
  cookieHeader:
    string | null,

  name:
    string,
) {
  if (
    !cookieHeader
  ) {
    return null;
  }

  const prefix =
    `${name}=`;

  for (
    const part
    of cookieHeader.split(
      ";",
    )
  ) {
    const value =
      part.trim();

    if (
      value.startsWith(
        prefix,
      )
    ) {
      return decodeURIComponent(
        value.slice(
          prefix.length,
        ),
      );
    }
  }

  return null;
}

export function getMetaRequestContext(
  request:
    Request,
): MetaRequestContext {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for",
    );

  const clientIp =
    forwardedFor
      ?.split(
        ",",
      )[0]
      ?.trim() ||
    request.headers.get(
      "x-real-ip",
    ) ||
    null;

  const referer =
    request.headers.get(
      "referer",
    );

  const cookie =
    request.headers.get(
      "cookie",
    );

  return {
    clientIp,

    clientUserAgent:
      request.headers.get(
        "user-agent",
      ),

    eventSourceUrl:
      referer ||
      null,

    fbp:
      cookieValue(
        cookie,
        "_fbp",
      ),

    fbc:
      cookieValue(
        cookie,
        "_fbc",
      ),
  };
}

function sha256(
  value:
    string,
) {
  return createHash(
    "sha256",
  )
    .update(
      value,
    )
    .digest(
      "hex",
    );
}

function cleanEmail(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase();
}

function cleanPhone(
  value:
    string,
) {
  let digits =
    value.replace(
      /\D/g,
      "",
    );

  if (
    /^01\d{9}$/.test(
      digits,
    )
  ) {
    digits =
      `88${digits}`;
  }

  return digits;
}

function cleanText(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      "",
    );
}

function hashIfPresent(
  value:
    string | null | undefined,

  normalizer:
    (
      input:
        string,
    ) =>
      string,
) {
  const normalized =
    value
      ? normalizer(
          value,
        )
      : "";

  return normalized
    ? [
        sha256(
          normalized,
        ),
      ]
    : undefined;
}

function buildUserData(
  customerData:
    MetaCustomerData |
    undefined,

  context:
    MetaRequestContext |
    undefined,
) {
  const userData:
    Record<
      string,
      unknown
    > = {};

  const email =
    hashIfPresent(
      customerData?.email,
      cleanEmail,
    );

  const phone =
    hashIfPresent(
      customerData?.phone,
      cleanPhone,
    );

  const firstName =
    hashIfPresent(
      customerData?.firstName,
      cleanText,
    );

  const lastName =
    hashIfPresent(
      customerData?.lastName,
      cleanText,
    );

  const city =
    hashIfPresent(
      customerData?.city,
      cleanText,
    );

  const country =
    hashIfPresent(
      customerData?.country,
      cleanText,
    );

  const externalId =
    hashIfPresent(
      customerData?.externalId,
      cleanText,
    );

  if (email) {
    userData.em =
      email;
  }

  if (phone) {
    userData.ph =
      phone;
  }

  if (firstName) {
    userData.fn =
      firstName;
  }

  if (lastName) {
    userData.ln =
      lastName;
  }

  if (city) {
    userData.ct =
      city;
  }

  if (country) {
    userData.country =
      country;
  }

  if (externalId) {
    userData.external_id =
      externalId;
  }

  if (
    context?.clientIp
  ) {
    userData.client_ip_address =
      context.clientIp;
  }

  if (
    context
      ?.clientUserAgent
  ) {
    userData.client_user_agent =
      context
        .clientUserAgent;
  }

  if (
    context?.fbp
  ) {
    userData.fbp =
      context.fbp;
  }

  if (
    context?.fbc
  ) {
    userData.fbc =
      context.fbc;
  }

  return userData;
}

export function metaPurchaseEventId(
  orderNumber:
    string,
) {
  return `purchase_${orderNumber}`;
}

export async function sendMetaServerEvent({
  eventName,
  eventId,
  eventTime,
  eventSourceUrl,
  customData,
  customerData,
  context,
}: MetaServerEventInput) {
  const config =
    getConfig();

  if (
    !config
  ) {
    return {
      sent:
        false,

      reason:
        "not_configured",
    } as const;
  }

  const sourceUrl =
    eventSourceUrl ||
    context
      ?.eventSourceUrl ||
    "https://www.gameongarb.com/";

  const payload:
    Record<
      string,
      unknown
    > = {
    data: [
      {
        event_name:
          eventName,

        event_time:
          eventTime ??
          Math.floor(
            Date.now() /
              1000,
          ),

        event_id:
          eventId,

        action_source:
          "website",

        event_source_url:
          sourceUrl,

        user_data:
          buildUserData(
            customerData,
            context,
          ),

        ...(customData
          ? {
              custom_data:
                customData,
            }
          : {}),
      },
    ],

    ...(config.testEventCode
      ? {
          test_event_code:
            config.testEventCode,
        }
      : {}),
  };

  try {
    const response =
      await fetch(
        `https://graph.facebook.com/v25.0/${config.pixelId}/events?access_token=${encodeURIComponent(
          config.accessToken,
        )}`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload,
            ),

          cache:
            "no-store",
        },
      );

    const result =
      await response
        .json()
        .catch(
          () => null,
        );

    if (
      !response.ok
    ) {
      console.error(
        "Meta CAPI request failed:",
        {
          eventName,

          eventId,

          status:
            response.status,

          result,
        },
      );

      return {
        sent:
          false,

        reason:
          "meta_error",

        status:
          response.status,
      } as const;
    }

    return {
      sent:
        true,

      result,
    } as const;
  } catch (
    error
  ) {
    console.error(
      "Meta CAPI request error:",
      {
        eventName,

        eventId,

        error,
      },
    );

    return {
      sent:
        false,

      reason:
        "network_error",
    } as const;
  }
}

export async function sendMetaPurchaseForOrder({
  orderId,
  context,
  eventSourceUrl,
}: {
  orderId:
    string;

  context?:
    MetaRequestContext;

  eventSourceUrl?:
    string | null;
}) {
  const order =
    await db.order.findUnique({
      where: {
        id:
          orderId,
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

        email:
          true,

        district:
          true,

        total:
          true,

        items: {
          select: {
            productId:
              true,

            id:
              true,

            sku:
              true,

            unitPrice:
              true,

            quantity:
              true,
          },
        },
      },
    });

  if (
    !order
  ) {
    return {
      sent:
        false,

      reason:
        "order_not_found",
    } as const;
  }

  const nameParts =
    order.customerName
      .trim()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      );

  const firstName =
    nameParts[0] ??
    null;

  const lastName =
    nameParts.length >
      1
      ? nameParts[
          nameParts.length -
            1
        ]
      : null;

  const contents =
    order.items.map(
      (
        item,
      ) => ({
        id:
          item.productId ??
          item.sku ??
          item.id,

        quantity:
          item.quantity,

        item_price:
          Number(
            item.unitPrice,
          ),
      }),
    );

  const contentIds =
    contents.map(
      (
        item,
      ) =>
        item.id,
    );

  const numItems =
    contents.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.quantity,

      0,
    );

  return sendMetaServerEvent({
    eventName:
      "Purchase",

    eventId:
      metaPurchaseEventId(
        order.number,
      ),

    eventSourceUrl:
      eventSourceUrl ||
      context
        ?.eventSourceUrl ||
      `https://www.gameongarb.com/checkout/success/${encodeURIComponent(
        order.number,
      )}`,

    context,

    customerData: {
      email:
        order.email,

      phone:
        order.phone,

      firstName,

      lastName,

      city:
        order.district,

      country:
        "bd",

      externalId:
        order.id,
    },

    customData: {
      currency:
        "BDT",

      value:
        Number(
          order.total,
        ),

      content_type:
        "product",

      content_ids:
        contentIds,

      contents,

      num_items:
        numItems,

      order_id:
        order.number,
    },
  });
}
