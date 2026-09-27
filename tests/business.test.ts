import { describe, expect, it } from "vitest";
import {
  canTransition,
  categoryMoveIsValid,
  couponDiscount,
  deliveryFee,
  hasPermission,
  orderTotal,
  stockAfterAdjustment,
} from "../src/lib/business";
describe("delivery fee", () => {
  const s = { insideDhaka: 80, outsideDhaka: 150 };
  it("uses settings for Dhaka", () => expect(deliveryFee("Dhaka", s)).toBe(80));
  it("uses settings outside Dhaka", () =>
    expect(deliveryFee("Sylhet", s)).toBe(150));
  it("reflects settings changes immediately", () =>
    expect(deliveryFee("Dhaka", { insideDhaka: 95, outsideDhaka: 175 })).toBe(
      95,
    ));
});
describe("coupons and totals", () => {
  it("caps percentage discounts", () =>
    expect(
      couponDiscount(10000, 80, {
        type: "PERCENTAGE",
        value: 10,
        maximum: 500,
      }),
    ).toBe(500));
  it("supports free shipping", () =>
    expect(couponDiscount(1500, 150, { type: "FREE_SHIPPING", value: 0 })).toBe(
      150,
    ));
  it("enforces minimum", () =>
    expect(
      couponDiscount(500, 80, { type: "FIXED", value: 100, minimum: 1000 }),
    ).toBe(0));
  it("calculates total", () => expect(orderTotal(1290, 80, 100)).toBe(1270));
});
describe("workflow and permissions", () => {
  it("allows only valid status transitions", () => {
    expect(canTransition("NEW", "CONFIRMED")).toBe(true);
    expect(canTransition("NEW", "DELIVERED")).toBe(false);
  });
  it("enforces role permissions", () => {
    expect(hasPermission("STAFF", "orders")).toBe(true);
    expect(hasPermission("STAFF", "settings")).toBe(false);
    expect(hasPermission("SUPER_ADMIN", "settings")).toBe(true);
  });
});
describe("inventory and category hierarchy", () => {
  it("applies stock adjustments without allowing negative stock", () => {
    expect(stockAfterAdjustment(10, -4)).toBe(6);
    expect(() => stockAfterAdjustment(2, -3)).toThrow(/negative/);
  });
  it("prevents category cycles and hierarchy deeper than three levels", () => {
    expect(categoryMoveIsValid("sports", ["football"])).toBe(true);
    expect(categoryMoveIsValid("sports", ["football", "sports"])).toBe(false);
    expect(categoryMoveIsValid("jerseys", ["training", "football", "sports"])).toBe(false);
  });
});
