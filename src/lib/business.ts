export type ShippingSettings = {
  insideDhaka: number;
  outsideDhaka: number;
};

export type DeliveryZone =
  | "INSIDE_DHAKA"
  | "OUTSIDE_DHAKA";

export type CouponRule = {
  type:
    | "PERCENTAGE"
    | "FIXED"
    | "FREE_SHIPPING";

  value: number;
  minimum?: number;
  maximum?: number;
};

/* =========================================================
   BANGLADESH DISTRICT DETECTION
   ========================================================= */

const DISTRICT_ALIASES =
  new Map<string, string>([
    ["bagerhat", "Bagerhat"],
    ["bandarban", "Bandarban"],
    ["barguna", "Barguna"],
    ["barishal", "Barishal"],
    ["barisal", "Barishal"],
    ["bhola", "Bhola"],
    ["bogura", "Bogura"],
    ["bogra", "Bogura"],
    ["brahmanbaria", "Brahmanbaria"],
    ["chandpur", "Chandpur"],
    ["chapainawabganj", "Chapainawabganj"],
    ["chapai nawabganj", "Chapainawabganj"],
    ["chattogram", "Chattogram"],
    ["chittagong", "Chattogram"],
    ["chuadanga", "Chuadanga"],
    ["cox s bazar", "Cox's Bazar"],
    ["coxs bazar", "Cox's Bazar"],
    ["cumilla", "Cumilla"],
    ["comilla", "Cumilla"],
    ["dhaka", "Dhaka"],
    ["dinajpur", "Dinajpur"],
    ["faridpur", "Faridpur"],
    ["feni", "Feni"],
    ["gaibandha", "Gaibandha"],
    ["gazipur", "Gazipur"],
    ["gopalganj", "Gopalganj"],
    ["habiganj", "Habiganj"],
    ["jamalpur", "Jamalpur"],
    ["jashore", "Jashore"],
    ["jessore", "Jashore"],
    ["jhalokati", "Jhalokati"],
    ["jhenaidah", "Jhenaidah"],
    ["joypurhat", "Joypurhat"],
    ["khagrachhari", "Khagrachhari"],
    ["khagrachari", "Khagrachhari"],
    ["khulna", "Khulna"],
    ["kishoreganj", "Kishoreganj"],
    ["kurigram", "Kurigram"],
    ["kushtia", "Kushtia"],
    ["lakshmipur", "Lakshmipur"],
    ["laxmipur", "Lakshmipur"],
    ["lalmonirhat", "Lalmonirhat"],
    ["madaripur", "Madaripur"],
    ["magura", "Magura"],
    ["manikganj", "Manikganj"],
    ["meherpur", "Meherpur"],
    ["moulvibazar", "Moulvibazar"],
    ["maulvibazar", "Moulvibazar"],
    ["munshiganj", "Munshiganj"],
    ["mymensingh", "Mymensingh"],
    ["naogaon", "Naogaon"],
    ["narail", "Narail"],
    ["narayanganj", "Narayanganj"],
    ["narsingdi", "Narsingdi"],
    ["natore", "Natore"],
    ["netrokona", "Netrokona"],
    ["nilphamari", "Nilphamari"],
    ["noakhali", "Noakhali"],
    ["pabna", "Pabna"],
    ["panchagarh", "Panchagarh"],
    ["patuakhali", "Patuakhali"],
    ["pirojpur", "Pirojpur"],
    ["rajbari", "Rajbari"],
    ["rajshahi", "Rajshahi"],
    ["rangamati", "Rangamati"],
    ["rangpur", "Rangpur"],
    ["satkhira", "Satkhira"],
    ["shariatpur", "Shariatpur"],
    ["sherpur", "Sherpur"],
    ["sirajganj", "Sirajganj"],
    ["sunamganj", "Sunamganj"],
    ["sylhet", "Sylhet"],
    ["tangail", "Tangail"],
    ["thakurgaon", "Thakurgaon"],
  ]);

/*
 * Useful when someone writes:
 *
 * "House 4, Road 7, Mirpur 1"
 *
 * without explicitly adding "Dhaka".
 *
 * We only use this after checking for
 * an explicit district.
 */
const DHAKA_LOCALITIES = [
  "adabor",
  "agargaon",
  "azimpur",
  "badda",
  "banani",
  "baridhara",
  "basabo",
  "bashundhara",
  "cantonment",
  "dakshinkhan",
  "demra",
  "dhanmondi",
  "elephant road",
  "farmgate",
  "gulshan",
  "jatrabari",
  "kafrul",
  "kalabagan",
  "kamrangirchar",
  "kazipara",
  "khilgaon",
  "khilkhet",
  "kuril",
  "lalbagh",
  "mirpur",
  "mohakhali",
  "mohammadpur",
  "motijheel",
  "mugda",
  "new market",
  "niketon",
  "nikunja",
  "paltan",
  "panthapath",
  "ramna",
  "rampura",
  "sabujbagh",
  "shahbagh",
  "shahjahanpur",
  "shewrapara",
  "shyamoli",
  "tejgaon",
  "uttara",
  "uttarkhan",
  "wari",
];

/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizePlace(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /['’]/g,
      "",
    )
    .replace(
      /\b(?:district|zilla|zila)\b/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

/* =========================================================
   DISTRICT FROM ADDRESS
   ========================================================= */

function findDistrict(
  address: string,
) {
  const parts =
    address
      .split(
        /[,\n]/,
      )
      .map(
        (
          part,
        ) =>
          normalizePlace(
            part,
          ),
      )
      .filter(Boolean);

  /*
   * Check from the end first because
   * our checkout placeholder asks the
   * customer to put District last:
   *
   * House/Road, Area, City, District
   */
  for (
    let index =
      parts.length - 1;
    index >= 0;
    index -= 1
  ) {
    const part =
      parts[index];

    const matched =
      DISTRICT_ALIASES.get(
        part,
      );

    if (matched) {
      return matched;
    }
  }

  /*
   * If commas were omitted, still
   * recognize explicit district names.
   *
   * Remove "Dhaka Division" first so:
   *
   * Gazipur, Dhaka Division
   *
   * cannot accidentally become an
   * inside-Dhaka delivery.
   */
  const normalizedAddress =
    normalizePlace(
      address,
    ).replace(
      /\bdhaka division\b/g,
      " ",
    );

  const aliases = [
    ...DISTRICT_ALIASES.entries(),
  ].sort(
    (
      first,
      second,
    ) =>
      second[0].length -
      first[0].length,
  );

  for (
    const [
      alias,
      district,
    ] of aliases
  ) {
    const escaped =
      alias.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

    const matcher =
      new RegExp(
        `(?:^|\\s)${escaped}(?:$|\\s)`,
        "i",
      );

    if (
      matcher.test(
        normalizedAddress,
      )
    ) {
      return district;
    }
  }

  return null;
}

/* =========================================================
   DELIVERY ZONE
   ========================================================= */

export function detectDeliveryZone(
  address: string,
): DeliveryZone | null {
  const trimmed =
    address.trim();

  if (
    trimmed.length <
    3
  ) {
    return null;
  }

  const district =
    findDistrict(
      trimmed,
    );

  if (district) {
    return district ===
      "Dhaka"
      ? "INSIDE_DHAKA"
      : "OUTSIDE_DHAKA";
  }

  const normalized =
    normalizePlace(
      trimmed,
    );

  const matchesDhakaLocality =
    DHAKA_LOCALITIES.some(
      (
        locality,
      ) => {
        const escaped =
          locality.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

        return new RegExp(
          `(?:^|\\s)${escaped}(?:$|\\s)`,
          "i",
        ).test(
          normalized,
        );
      },
    );

  if (
    matchesDhakaLocality
  ) {
    return "INSIDE_DHAKA";
  }

  /*
   * If Dhaka was explicitly written
   * and no other district was found,
   * classify it as Dhaka.
   */
  if (
    /(?:^|\s)dhaka(?:$|\s)/i.test(
      normalized.replace(
        /\bdhaka division\b/g,
        " ",
      ),
    )
  ) {
    return "INSIDE_DHAKA";
  }

  /*
   * Unknown locations safely use the
   * outside-Dhaka rate rather than
   * incorrectly undercharging.
   */
  return "OUTSIDE_DHAKA";
}

/* =========================================================
   DISTRICT LABEL
   ========================================================= */

export function inferDistrictFromAddress(
  address: string,
) {
  const explicitDistrict =
    findDistrict(
      address,
    );

  if (
    explicitDistrict
  ) {
    return explicitDistrict;
  }

  if (
    detectDeliveryZone(
      address,
    ) ===
    "INSIDE_DHAKA"
  ) {
    return "Dhaka";
  }

  const parts =
    address
      .split(
        /[,\n]/,
      )
      .map(
        (
          part,
        ) =>
          part.trim(),
      )
      .filter(Boolean);

  const candidates =
    parts.filter(
      (
        part,
      ) => {
        const normalized =
          normalizePlace(
            part,
          );

        return (
          normalized !==
            "bangladesh" &&
          normalized !==
            "bd" &&
          normalized !==
            "dhaka division"
        );
      },
    );

  return (
    candidates[
      candidates.length -
        1
    ] ??
    "Outside Dhaka"
  );
}

/* =========================================================
   DELIVERY FEE
   ========================================================= */

export function deliveryFee(
  location: string,
  settings:
    ShippingSettings,
) {
  return detectDeliveryZone(
    location,
  ) ===
    "INSIDE_DHAKA"
    ? settings.insideDhaka
    : settings.outsideDhaka;
}

/* =========================================================
   COUPON
   ========================================================= */

export function couponDiscount(
  subtotal: number,
  shipping: number,
  rule: CouponRule,
) {
  if (
    subtotal <
    (
      rule.minimum ??
      0
    )
  ) {
    return 0;
  }

  if (
    rule.type ===
    "FREE_SHIPPING"
  ) {
    return shipping;
  }

  const raw =
    rule.type ===
    "PERCENTAGE"
      ? (
          subtotal *
          rule.value
        ) /
        100
      : rule.value;

  return Math.max(
    0,
    Math.min(
      raw,
      rule.maximum ??
        raw,
      subtotal +
        shipping,
    ),
  );
}

/* =========================================================
   ORDER TOTAL
   ========================================================= */

export function orderTotal(
  subtotal: number,
  shipping: number,
  discount: number,
) {
  return Math.max(
    0,
    subtotal +
      shipping -
      discount,
  );
}

/* =========================================================
   STOCK
   ========================================================= */

export function stockAfterAdjustment(
  current: number,
  change: number,
) {
  if (
    !Number.isInteger(
      current,
    ) ||
    !Number.isInteger(
      change,
    )
  ) {
    throw new Error(
      "Stock quantities must be whole numbers.",
    );
  }

  const next =
    current +
    change;

  if (
    next <
    0
  ) {
    throw new Error(
      "Adjustment would make stock negative.",
    );
  }

  return next;
}

/* =========================================================
   CATEGORY TREE
   ========================================================= */

export function categoryMoveIsValid(
  categoryId: string,
  parentLineage:
    string[],
  maxParents = 2,
) {
  return (
    !parentLineage.includes(
      categoryId,
    ) &&
    parentLineage.length <=
      maxParents
  );
}

/* =========================================================
   ORDER STATUS
   ========================================================= */

const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PACKING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "FAILED_DELIVERY",
] as const;

export function canTransition(
  from: string,
  to: string,
) {
  if (
    from ===
    "DELIVERED"
  ) {
    return false;
  }

  if (
    from ===
    to
  ) {
    return false;
  }

  return ORDER_STATUSES.includes(
    to as
      (typeof ORDER_STATUSES)[number],
  );
}

/* =========================================================
   PERMISSIONS
   ========================================================= */

export const permissions = {
  SUPER_ADMIN: [
    "*",
  ],

  ADMIN: [
    "products",
    "orders",
    "customers",
    "inventory",
    "coupons",
    "homepage",
    "settings",
    "integrations",
    "reports",
    "users",
  ],

  MANAGER: [
    "products",
    "orders",
    "customers",
    "inventory",
    "coupons",
    "reports",
  ],

  STAFF: [
    "orders",
    "customers",
    "inventory",
  ],
} as const;

export function hasPermission(
  role:
    keyof typeof permissions,
  permission:
    string,
) {
  const allowed =
    permissions[
      role
    ] as readonly string[];

  return (
    allowed.includes(
      "*",
    ) ||
    allowed.includes(
      permission,
    )
  );
}