export type TrackingConfig = {
  gtm: {
    enabled:
      boolean;

    containerId:
      string;
  };

  metaPixel: {
    enabled:
      boolean;

    pixelId:
      string;
  };

  events: {
    pageView:
      boolean;

    viewContent:
      boolean;

    addToCart:
      boolean;

    initiateCheckout:
      boolean;

    purchase:
      boolean;
  };
};

export const defaultTrackingConfig:
  TrackingConfig = {
  gtm: {
    enabled:
      false,

    containerId:
      "",
  },

  metaPixel: {
    enabled:
      false,

    pixelId:
      "",
  },

  events: {
    pageView:
      true,

    viewContent:
      true,

    addToCart:
      true,

    initiateCheckout:
      true,

    purchase:
      true,
  },
};

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function booleanValue(
  value:
    unknown,

  fallback:
    boolean,
) {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function stringValue(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

export function normalizeTrackingConfig(
  value:
    unknown,
): TrackingConfig {
  if (
    !isRecord(
      value,
    )
  ) {
    return defaultTrackingConfig;
  }

  const gtm =
    isRecord(
      value.gtm,
    )
      ? value.gtm
      : {};

  const metaPixel =
    isRecord(
      value.metaPixel,
    )
      ? value.metaPixel
      : {};

  const events =
    isRecord(
      value.events,
    )
      ? value.events
      : {};

  const containerId =
    stringValue(
      gtm.containerId,
    ).toUpperCase();

  const pixelId =
    stringValue(
      metaPixel.pixelId,
    );

  const validGtm =
    /^GTM-[A-Z0-9]+$/.test(
      containerId,
    );

  const validPixel =
    /^\d+$/.test(
      pixelId,
    );

  return {
    gtm: {
      enabled:
        booleanValue(
          gtm.enabled,
          false,
        ) &&
        validGtm,

      containerId:
        validGtm
          ? containerId
          : "",
    },

    metaPixel: {
      enabled:
        booleanValue(
          metaPixel.enabled,
          false,
        ) &&
        validPixel,

      pixelId:
        validPixel
          ? pixelId
          : "",
    },

    events: {
      pageView:
        booleanValue(
          events.pageView,
          true,
        ),

      viewContent:
        booleanValue(
          events.viewContent,
          true,
        ),

      addToCart:
        booleanValue(
          events.addToCart,
          true,
        ),

      initiateCheckout:
        booleanValue(
          events.initiateCheckout,
          true,
        ),

      purchase:
        booleanValue(
          events.purchase,
          true,
        ),
    },
  };
}