import type {
  ProductVariant,
} from "@/lib/data";

/* =========================================================
   COLOR HELPERS
   ========================================================= */

const NAMED_COLORS:
  Record<
    string,
    string
  > = {
  black: "#111111",
  white: "#f7f7f5",

  navy: "#172239",
  "navy blue": "#172239",

  blue: "#2e5fa8",
  sky: "#80b6d9",

  red: "#c83c35",
  maroon: "#6f2634",

  orange: "#ef641f",

  green: "#496d52",
  olive: "#707348",

  brown: "#72513e",

  beige: "#d8c6ad",
  sand: "#d8c6ad",
  cream: "#eee5d5",

  grey: "#919593",
  gray: "#919593",

  charcoal: "#454948",

  pink: "#dca0ae",

  purple: "#71598c",

  yellow: "#d9b637",
};

function resolveNamedColor(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    /^#[0-9a-f]{6}$/i.test(
      normalized,
    )
  ) {
    return normalized;
  }

  return (
    NAMED_COLORS[
      normalized
    ] ??
    "#d8dad7"
  );
}

export function getColorSwatch(
  color: string,
  colorHex?: string,
) {
  if (
    colorHex &&
    /^#[0-9a-f]{6}$/i.test(
      colorHex.trim(),
    )
  ) {
    return colorHex;
  }

  const parts =
    color
      .split(
        /\s*(?:\/|\+|&)\s*/,
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(Boolean);

  if (
    parts.length >=
    2
  ) {
    const first =
      resolveNamedColor(
        parts[0],
      );

    const second =
      resolveNamedColor(
        parts[1],
      );

    return `linear-gradient(
      135deg,
      ${first} 0%,
      ${first} 49%,
      ${second} 51%,
      ${second} 100%
    )`;
  }

  return resolveNamedColor(
    color,
  );
}

/* =========================================================
   SIZE HELPERS
   ========================================================= */

const SIZE_ORDER =
  new Map(
    [
      "XXS",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "XXL",
      "3XL",
      "XXXL",
      "4XL",
      "5XL",
      "ONE SIZE",
    ].map(
      (
        size,
        index,
      ) => [
        size,
        index,
      ],
    ),
  );

export function sortProductSizes(
  values: string[],
) {
  return [
    ...values,
  ].sort(
    (
      first,
      second,
    ) => {
      const a =
        first
          .trim()
          .toUpperCase();

      const b =
        second
          .trim()
          .toUpperCase();

      const aNumber =
        Number(a);

      const bNumber =
        Number(b);

      /*
       * Shoe sizes:
       * 39, 40, 41, 42...
       */
      if (
        Number.isFinite(
          aNumber,
        ) &&
        Number.isFinite(
          bNumber,
        )
      ) {
        return (
          aNumber -
          bNumber
        );
      }

      const aOrder =
        SIZE_ORDER.get(
          a,
        );

      const bOrder =
        SIZE_ORDER.get(
          b,
        );

      if (
        aOrder !==
          undefined &&
        bOrder !==
          undefined
      ) {
        return (
          aOrder -
          bOrder
        );
      }

      if (
        aOrder !==
        undefined
      ) {
        return -1;
      }

      if (
        bOrder !==
        undefined
      ) {
        return 1;
      }

      return first.localeCompare(
        second,
        undefined,
        {
          numeric: true,
        },
      );
    },
  );
}

/* =========================================================
   VARIANT HELPERS
   ========================================================= */

export function uniqueVariantColors(
  variants:
    ProductVariant[],
) {
  const map =
    new Map<
      string,
      ProductVariant
    >();

  for (
    const variant
    of variants
  ) {
    if (
      !map.has(
        variant.color,
      )
    ) {
      map.set(
        variant.color,
        variant,
      );
    }
  }

  return [
    ...map.values(),
  ];
}

export function variantIsAvailable(
  variant:
    ProductVariant,
) {
  return (
    variant.stock >
    0
  );
}