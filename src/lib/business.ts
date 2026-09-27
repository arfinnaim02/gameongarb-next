export type ShippingSettings = { insideDhaka: number; outsideDhaka: number };
export type CouponRule = {
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minimum?: number;
  maximum?: number;
};

export function deliveryFee(district: string, settings: ShippingSettings) {
  return district.trim().toLowerCase() === "dhaka"
    ? settings.insideDhaka
    : settings.outsideDhaka;
}

export function couponDiscount(
  subtotal: number,
  shipping: number,
  rule: CouponRule,
) {
  if (subtotal < (rule.minimum ?? 0)) return 0;
  if (rule.type === "FREE_SHIPPING") return shipping;
  const raw =
    rule.type === "PERCENTAGE" ? (subtotal * rule.value) / 100 : rule.value;
  return Math.max(0, Math.min(raw, rule.maximum ?? raw, subtotal + shipping));
}

export function orderTotal(
  subtotal: number,
  shipping: number,
  discount: number,
) {
  return Math.max(0, subtotal + shipping - discount);
}

export function stockAfterAdjustment(current: number, change: number) {
  if (!Number.isInteger(current) || !Number.isInteger(change))
    throw new Error("Stock quantities must be whole numbers.");
  const next = current + change;
  if (next < 0) throw new Error("Adjustment would make stock negative.");
  return next;
}

export function categoryMoveIsValid(
  categoryId: string,
  parentLineage: string[],
  maxParents = 2,
) {
  return (
    !parentLineage.includes(categoryId) && parentLineage.length <= maxParents
  );
}

const transitions: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKING", "CANCELLED"],
  PACKING: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "FAILED_DELIVERY", "RETURN_REQUESTED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED"],
  FAILED_DELIVERY: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};
export function canTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}

export const permissions = {
  SUPER_ADMIN: ["*"],
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
  STAFF: ["orders", "customers", "inventory"],
} as const;
export function hasPermission(
  role: keyof typeof permissions,
  permission: string,
) {
  const allowed = permissions[role] as readonly string[];
  return allowed.includes("*") || allowed.includes(permission);
}
