import type {
  TrackingConfig,
} from "@/lib/tracking-config";

/* =========================================================
   TYPES
   ========================================================= */

export type TrackingItem = {
  id:
    string;

  name:
    string;

  price:
    number;

  quantity:
    number;

  category?:
    string;

  variant?:
    string;

  sku?:
    string;
};

type CommercePayload = {
  value:
    number;

  items:
    TrackingItem[];
};

type PurchasePayload =
  CommercePayload & {
    transactionId:
      string;
  };

declare global {
  interface Window {
    dataLayer?:
      Record<
        string,
        unknown
      >[];

    fbq?: (
      ...args:
        unknown[]
    ) => void;

    __GOG_TRACKING_CONFIG__?:
      TrackingConfig;
  }
}

/* =========================================================
   CONFIG
   ========================================================= */

function getConfig() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return (
    window
      .__GOG_TRACKING_CONFIG__ ??
    null
  );
}

function canUseGtm(
  config:
    TrackingConfig,
) {
  return (
    config.gtm.enabled &&
    Boolean(
      config.gtm
        .containerId,
    )
  );
}

function canUseMeta(
  config:
    TrackingConfig,
) {
  return (
    config.metaPixel
      .enabled &&
    Boolean(
      config.metaPixel
        .pixelId,
    )
  );
}

/* =========================================================
   DATA LAYER
   ========================================================= */

function pushDataLayer(
  payload:
    Record<
      string,
      unknown
    >,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dataLayer =
    window.dataLayer ??
    [];

  window.dataLayer.push(
    payload,
  );
}

function pushCommerceEvent({
  event,
  value,
  items,
  transactionId,
}: {
  event:
    string;

  value:
    number;

  items:
    TrackingItem[];

  transactionId?:
    string;
}) {
  /*
   * Clear any previous ecommerce
   * object before the next GA4-style
   * ecommerce event.
   */
  pushDataLayer({
    ecommerce:
      null,
  });

  pushDataLayer({
    event,

    ecommerce: {
      currency:
        "BDT",

      value,

      ...(transactionId
        ? {
            transaction_id:
              transactionId,
          }
        : {}),

      items:
        items.map(
          (
            item,
          ) => ({
            item_id:
              item.id,

            item_name:
              item.name,

            ...(item.category
              ? {
                  item_category:
                    item.category,
                }
              : {}),

            ...(item.variant
              ? {
                  item_variant:
                    item.variant,
                }
              : {}),

            ...(item.sku
              ? {
                  item_sku:
                    item.sku,
                }
              : {}),

            price:
              item.price,

            quantity:
              item.quantity,
          }),
        ),
    },
  });
}

/* =========================================================
   META
   ========================================================= */

function sendMeta(
  event:
    string,

  payload:
    Record<
      string,
      unknown
    >,

  eventId:
    string,

  attempt =
    0,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  if (
    typeof window.fbq ===
    "function"
  ) {
    window.fbq(
      "track",
      event,
      payload,
      {
        eventID:
          eventId,
      },
    );

    return;
  }

  if (
    attempt <
    20
  ) {
    window.setTimeout(
      () => {
        sendMeta(
          event,
          payload,
          eventId,
          attempt +
            1,
        );
      },

      100,
    );
  }
}

function metaEventId(
  prefix:
    string,
) {
  const suffix =
    typeof crypto !==
      "undefined" &&
    "randomUUID" in
      crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(
            36,
          )
          .slice(
            2,
          )}`;

  return `${prefix}_${suffix}`;
}

export function metaPurchaseEventId(
  transactionId:
    string,
) {
  return `purchase_${transactionId}`;
}

function sendMetaServerCopy({
  config,
  eventName,
  eventId,
  customData,
}: {
  config:
    TrackingConfig;

  eventName:
    | "PageView"
    | "ViewContent"
    | "Search"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase";

  eventId:
    string;

  customData?:
    Record<
      string,
      unknown
    >;
}) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  void fetch(
    "/api/tracking/meta",
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json",
      },

      body:
        JSON.stringify({
          pixelId:
            config.metaPixel
              .pixelId,

          eventName,

          eventId,

          eventSourceUrl:
            window.location
              .href,

          ...(customData
            ? {
                customData,
              }
            : {}),
        }),

      keepalive:
        true,

      credentials:
        "same-origin",
    },
  ).catch(
    () => {
      /*
       * Tracking must never affect
       * the customer experience.
       */
    },
  );
}

function metaContents(
  items:
    TrackingItem[],
) {
  return items.map(
    (
      item,
    ) => ({
      id:
        item.id,

      quantity:
        item.quantity,

      item_price:
        item.price,
    }),
  );
}

function itemCount(
  items:
    TrackingItem[],
) {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total +
      item.quantity,

    0,
  );
}

/* =========================================================
   PAGE VIEW
   ========================================================= */

export function trackPageView() {
  const config =
    getConfig();

  if (
    !config ||
    !config.events.pageView
  ) {
    return false;
  }

  let sent =
    false;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushDataLayer({
      event:
        "page_view",

      page_path:
        window.location
          .pathname,

      page_location:
        window.location
          .href,

      page_title:
        document.title,
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const eventId =
      metaEventId(
        "pageview",
      );

    sendMeta(
      "PageView",
      {},
      eventId,
    );

    sendMetaServerCopy({
      config,

      eventName:
        "PageView",

      eventId,
    });

    sent =
      true;
  }

  return sent;
}

/* =========================================================
   VIEW CONTENT
   ========================================================= */

export function trackViewContent(
  item:
    TrackingItem,
) {
  const config =
    getConfig();

  if (
    !config ||
    !config.events
      .viewContent
  ) {
    return false;
  }

  let sent =
    false;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushCommerceEvent({
      event:
        "view_item",

      value:
        item.price *
        item.quantity,

      items: [
        item,
      ],
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const payload = {
      content_ids: [
        item.id,
      ],

      content_name:
        item.name,

      content_type:
        "product",

      contents:
        metaContents([
          item,
        ]),

      value:
        item.price *
        item.quantity,

      currency:
        "BDT",
    };

    const eventId =
      metaEventId(
        "viewcontent",
      );

    sendMeta(
      "ViewContent",
      payload,
      eventId,
    );

    sendMetaServerCopy({
      config,

      eventName:
        "ViewContent",

      eventId,

      customData:
        payload,
    });

    sent =
      true;
  }

  return sent;
}

/* =========================================================
   ADD TO CART
   ========================================================= */

export function trackAddToCart(
  item:
    TrackingItem,
) {
  const config =
    getConfig();

  if (
    !config ||
    !config.events
      .addToCart
  ) {
    return false;
  }

  let sent =
    false;

  const value =
    item.price *
    item.quantity;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushCommerceEvent({
      event:
        "add_to_cart",

      value,

      items: [
        item,
      ],
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const payload = {
      content_ids: [
        item.id,
      ],

      content_name:
        item.name,

      content_type:
        "product",

      contents:
        metaContents([
          item,
        ]),

      value,

      currency:
        "BDT",
    };

    const eventId =
      metaEventId(
        "addtocart",
      );

    sendMeta(
      "AddToCart",
      payload,
      eventId,
    );

    sendMetaServerCopy({
      config,

      eventName:
        "AddToCart",

      eventId,

      customData:
        payload,
    });

    sent =
      true;
  }

  return sent;
}

/* =========================================================
   BEGIN CHECKOUT
   ========================================================= */

export function trackInitiateCheckout({
  value,
  items,
}: CommercePayload) {
  const config =
    getConfig();

  if (
    !config ||
    !config.events
      .initiateCheckout
  ) {
    return false;
  }

  let sent =
    false;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushCommerceEvent({
      event:
        "begin_checkout",

      value,

      items,
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const payload = {
      content_ids:
        items.map(
          (
            item,
          ) =>
            item.id,
        ),

      content_type:
        "product",

      contents:
        metaContents(
          items,
        ),

      num_items:
        itemCount(
          items,
        ),

      value,

      currency:
        "BDT",
    };

    const eventId =
      metaEventId(
        "initiatecheckout",
      );

    sendMeta(
      "InitiateCheckout",
      payload,
      eventId,
    );

    sendMetaServerCopy({
      config,

      eventName:
        "InitiateCheckout",

      eventId,

      customData:
        payload,
    });

    sent =
      true;
  }

  return sent;
}

/* =========================================================
   SEARCH
   ========================================================= */

export function trackSearch(
  searchString:
    string,
) {
  const config =
    getConfig();

  const clean =
    searchString.trim();

  if (
    !clean ||
    !config ||
    !config.events.search
  ) {
    return false;
  }

  let sent =
    false;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushDataLayer({
      event:
        "search",

      search_term:
        clean,
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const payload = {
      search_string:
        clean,
    };

    const eventId =
      metaEventId(
        "search",
      );

    sendMeta(
      "Search",
      payload,
      eventId,
    );

    sendMetaServerCopy({
      config,

      eventName:
        "Search",

      eventId,

      customData:
        payload,
    });

    sent =
      true;
  }

  return sent;
}

/* =========================================================
   PURCHASE
   ========================================================= */

export function trackPurchase({
  transactionId,
  value,
  items,
}: PurchasePayload) {
  const config =
    getConfig();

  if (
    !config ||
    !config.events.purchase
  ) {
    return false;
  }

  let sent =
    false;

  if (
    canUseGtm(
      config,
    )
  ) {
    pushCommerceEvent({
      event:
        "purchase",

      transactionId,

      value,

      items,
    });

    sent =
      true;
  }

  if (
    canUseMeta(
      config,
    )
  ) {
    const payload = {
      content_ids:
        items.map(
          (
            item,
          ) =>
            item.id,
        ),

      content_type:
        "product",

      contents:
        metaContents(
          items,
        ),

      num_items:
        itemCount(
          items,
        ),

      value,

      currency:
        "BDT",

      order_id:
        transactionId,
    };

    const eventId =
      metaPurchaseEventId(
        transactionId,
      );

    /*
     * Purchase has one authoritative server-side source:
     * the committed order/payment backend.
     *
     * Keep the browser Pixel copy here with the same
     * deterministic event_id so Meta can deduplicate
     * Browser + Server without creating a second CAPI
     * request from the success page.
     */
    sendMeta(
      "Purchase",
      payload,
      eventId,
    );

    sent =
      true;
  }

  return sent;
}