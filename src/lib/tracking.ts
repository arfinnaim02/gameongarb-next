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
    );

    return;
  }

  /*
   * Meta's external fbevents script is
   * asynchronous. A storefront event can
   * occur just before the Pixel bootstrap
   * finishes, especially on initial load.
   *
   * Retry briefly instead of silently
   * losing the event.
   */
  if (
    attempt <
    20
  ) {
    window.setTimeout(
      () => {
        sendMeta(
          event,
          payload,
          attempt +
            1,
        );
      },

      100,
    );
  }
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
    sendMeta(
      "PageView",
      {},
    );

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
    sendMeta(
      "ViewContent",
      {
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
      },
    );

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
    sendMeta(
      "AddToCart",
      {
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
      },
    );

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
    sendMeta(
      "InitiateCheckout",
      {
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
      },
    );

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
    sendMeta(
      "Purchase",
      {
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
      },
    );

    sent =
      true;
  }

  return sent;
}