export type JerseyCustomizationConfig = {
  enabled: boolean;
  price: number;
};

export type JerseyPersonalization = {
  name: string;
  number: string;
};

const DEFAULT_CONFIG: JerseyCustomizationConfig = {
  enabled: false,
  price: 0,
};

export function getJerseyCustomizationConfig(
  attributes: unknown,
): JerseyCustomizationConfig {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return DEFAULT_CONFIG;
  }

  const raw =
    (attributes as Record<string, unknown>)
      .jerseyCustomization;

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return DEFAULT_CONFIG;
  }

  const value =
    raw as Record<string, unknown>;

  const enabled =
    value.enabled === true;

  const price =
    typeof value.price === "number"
      ? value.price
      : typeof value.price === "string"
        ? Number(value.price)
        : 0;

  return {
    enabled,
    price:
      Number.isFinite(price) &&
      price >= 0
        ? price
        : 0,
  };
}

export function withJerseyCustomizationConfig(
  attributes: unknown,
  config: JerseyCustomizationConfig,
) {
  const base =
    attributes &&
    typeof attributes === "object" &&
    !Array.isArray(attributes)
      ? {
          ...(attributes as Record<string, unknown>),
        }
      : {};

  return {
    ...base,
    jerseyCustomization: {
      enabled:
        config.enabled,
      price:
        config.enabled
          ? Math.max(
              0,
              config.price,
            )
          : 0,
    },
  };
}

export function normalizePersonalization(
  input:
    | {
        name?: unknown;
        number?: unknown;
      }
    | null
    | undefined,
): JerseyPersonalization | null {
  if (!input) {
    return null;
  }

  const name =
    typeof input.name === "string"
      ? input.name
          .trim()
          .replace(
            /\s+/g,
            " ",
          )
      : "";

  const number =
    typeof input.number === "string"
      ? input.number.trim()
      : typeof input.number === "number"
        ? String(
            input.number,
          )
        : "";

  if (
    !name &&
    !number
  ) {
    return null;
  }

  if (
    name.length < 1 ||
    name.length > 15
  ) {
    throw new Error(
      "Jersey name must be between 1 and 15 characters.",
    );
  }

  if (
    !/^[\p{L} .'-]+$/u.test(
      name,
    )
  ) {
    throw new Error(
      "Jersey name may contain letters, spaces, dots, apostrophes and hyphens only.",
    );
  }

  if (
    !/^\d{1,2}$/.test(
      number,
    )
  ) {
    throw new Error(
      "Jersey number must be between 0 and 99.",
    );
  }

  const numericNumber =
    Number(number);

  if (
    numericNumber < 0 ||
    numericNumber > 99
  ) {
    throw new Error(
      "Jersey number must be between 0 and 99.",
    );
  }

  return {
    name:
      name.toUpperCase(),
    number:
      String(
        numericNumber,
      ),
  };
}

export function personalizationKey(
  personalization:
    JerseyPersonalization | null |
    undefined,
) {
  if (!personalization) {
    return "";
  }

  return `${personalization.name.trim().toUpperCase()}::${personalization.number.trim()}`;
}

export function personalizedOrderItemName(
  productName: string,
  personalization:
    JerseyPersonalization | null |
    undefined,
) {
  if (!personalization) {
    return productName;
  }

  return `${productName} — Name: ${personalization.name} / #${personalization.number}`;
}
