import { describe, it, expect } from "vitest";
import {
  calculateBaseProductLineItem,
  calculateAddOnLineItem,
  calculateOverallDiscountLineItem,
  sumLineItems,
  roundToCents,
} from "../pricing";

describe("calculateBaseProductLineItem", () => {
  it("matches the sample quote: 25 seats, Growth tier $50, annual term", () => {
    const item = calculateBaseProductLineItem({
      productName: "Analytics Suite",
      tierName: "Growth",
      seats: 25,
      basePricePerSeat: 50,
      termLength: "annual",
    });
    // 25 * 50 * 12 * 0.85 = 12750
    expect(item.amount).toBe(12750);
  });

  it("applies no discount for monthly term", () => {
    const item = calculateBaseProductLineItem({
      productName: "Analytics Suite",
      tierName: "Starter",
      seats: 10,
      basePricePerSeat: 25,
      termLength: "monthly",
    });
    // 10 * 25 * 1 * 1 = 250
    expect(item.amount).toBe(250);
  });

  it("applies a 25% discount for two-year term", () => {
    const item = calculateBaseProductLineItem({
      productName: "Analytics Suite",
      tierName: "Enterprise",
      seats: 4,
      basePricePerSeat: 100,
      termLength: "two_year",
    });
    // 4 * 100 * 24 * 0.75 = 7200
    expect(item.amount).toBe(7200);
  });
});

describe("calculateAddOnLineItem - fixed pricing", () => {
  it("matches the sample quote: $200/mo SSO add-on over 12 months", () => {
    const item = calculateAddOnLineItem({
      featureName: "Single Sign-On (SSO)",
      pricingModel: "fixed",
      priceValue: 200,
      termLength: "annual",
    });
    expect(item.amount).toBe(2400);
  });

  it("is not discounted by term length", () => {
    // Fixed add-ons multiply only by months, never by the term discount,
    // matching the sample quote where the add-on total has no 15% applied.
    const item = calculateAddOnLineItem({
      featureName: "Priority Support",
      pricingModel: "fixed",
      priceValue: 100,
      termLength: "two_year",
    });
    // 100 * 24 = 2400, not 2400 * 0.75
    expect(item.amount).toBe(2400);
  });
});

describe("calculateAddOnLineItem - per-seat pricing", () => {
  it("matches the sample quote: 5 seats of API access at $50/seat/month over 12 months", () => {
    const item = calculateAddOnLineItem({
      featureName: "API access",
      pricingModel: "per_seat",
      priceValue: 50,
      termLength: "annual",
      addOnSeats: 5,
    });
    expect(item.amount).toBe(3000);
  });

  it("uses an add-on seat count independent of the product's seat count", () => {
    const item = calculateAddOnLineItem({
      featureName: "API access",
      pricingModel: "per_seat",
      priceValue: 50,
      termLength: "monthly",
      addOnSeats: 2, // product itself might have 25 seats; add-on only bought for 2
    });
    expect(item.amount).toBe(100);
  });

  it("throws if no seat count is provided for a per-seat add-on", () => {
    expect(() =>
      calculateAddOnLineItem({
        featureName: "API access",
        pricingModel: "per_seat",
        priceValue: 50,
        termLength: "monthly",
      })
    ).toThrow();
  });
});

describe("calculateAddOnLineItem - percent-of-product pricing", () => {
  it("calculates a percentage of the base product line amount", () => {
    const item = calculateAddOnLineItem({
      featureName: "Premium Support",
      pricingModel: "percent_of_product",
      priceValue: 10,
      termLength: "annual",
      baseProductAmount: 12750,
    });
    // 10% of 12750 = 1275
    expect(item.amount).toBe(1275);
  });

  it("throws if no base product amount is provided", () => {
    expect(() =>
      calculateAddOnLineItem({
        featureName: "Premium Support",
        pricingModel: "percent_of_product",
        priceValue: 10,
        termLength: "annual",
      })
    ).toThrow();
  });
});

describe("calculateOverallDiscountLineItem", () => {
  it("returns null when there is no discount", () => {
    expect(calculateOverallDiscountLineItem({ subtotal: 1000, discountPercent: 0 })).toBeNull();
  });

  it("returns a negative line item for the discount amount", () => {
    const item = calculateOverallDiscountLineItem({ subtotal: 18150, discountPercent: 10 });
    expect(item?.amount).toBe(-1815);
  });
});

describe("sumLineItems", () => {
  it("matches the sample quote total of $18,150", () => {
    const base = calculateBaseProductLineItem({
      productName: "Analytics Suite",
      tierName: "Growth",
      seats: 25,
      basePricePerSeat: 50,
      termLength: "annual",
    });
    const sso = calculateAddOnLineItem({
      featureName: "Single Sign-On (SSO)",
      pricingModel: "fixed",
      priceValue: 200,
      termLength: "annual",
    });
    const api = calculateAddOnLineItem({
      featureName: "API access",
      pricingModel: "per_seat",
      priceValue: 50,
      termLength: "annual",
      addOnSeats: 5,
    });
    const total = sumLineItems([base, sso, api]);
    expect(total).toBe(18150);
  });

  it("handles floating point cent rounding correctly", () => {
    const total = sumLineItems([
      { label: "a", formula: "", amount: 0.1 },
      { label: "b", formula: "", amount: 0.2 },
    ]);
    expect(total).toBe(0.3);
  });
});

describe("roundToCents", () => {
  it("rounds to two decimal places", () => {
    expect(roundToCents(10.005)).toBe(10.01);
    expect(roundToCents(10.004)).toBe(10);
  });
});
