// Core pricing math for the quoting tool.
//
// These are pure functions with no I/O so they can be unit tested in
// isolation from the database and UI. Every function returns not just a
// number but a human-readable description of how that number was derived,
// because the brief requires the math to be "visible" on the quote.

export type TermLength = "monthly" | "annual" | "two_year";

export const TERM_LENGTH_MONTHS: Record<TermLength, number> = {
  monthly: 1,
  annual: 12,
  two_year: 24,
};

// Discount applied to the *base product* per-seat price only. Add-ons are not
// discounted by term length (see README "Decisions" for why).
export const TERM_LENGTH_DISCOUNT: Record<TermLength, number> = {
  monthly: 0,
  annual: 0.15,
  two_year: 0.25,
};

export const TERM_LENGTH_LABEL: Record<TermLength, string> = {
  monthly: "Monthly",
  annual: "Annual",
  two_year: "Two-year",
};

export type AddOnPricingModel = "fixed" | "per_seat" | "percent_of_product";

export interface LineItem {
  label: string;
  formula: string;
  note?: string;
  amount: number;
}

export interface BaseProductInput {
  productName: string;
  tierName: string;
  seats: number;
  basePricePerSeat: number; // USD / seat / month
  termLength: TermLength;
}

/**
 * Round to cents. Every intermediate money value in this module is rounded
 * to cents before being combined, so the numbers shown on the quote always
 * sum exactly to the totals shown (no silent floating point drift).
 */
export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateBaseProductLineItem(input: BaseProductInput): LineItem {
  const { productName, tierName, seats, basePricePerSeat, termLength } = input;
  const months = TERM_LENGTH_MONTHS[termLength];
  const discount = TERM_LENGTH_DISCOUNT[termLength];

  const rawAmount = seats * basePricePerSeat * months * (1 - discount);
  const amount = roundToCents(rawAmount);

  const discountClause =
    discount > 0 ? ` × (1 - ${Math.round(discount * 100)}% ${TERM_LENGTH_LABEL[termLength].toLowerCase()} discount)` : "";

  return {
    label: `${productName} - ${tierName} tier`,
    formula: `${seats} seats × $${formatMoney(basePricePerSeat)} per seat per month × ${months} month${months > 1 ? "s" : ""}${discountClause}`,
    note: "Base product cost",
    amount,
  };
}

export interface AddOnInput {
  featureName: string;
  pricingModel: AddOnPricingModel;
  priceValue: number; // meaning depends on pricingModel, see db/schema.ts
  termLength: TermLength;
  // Required when pricingModel === "per_seat"
  addOnSeats?: number;
  // Required when pricingModel === "percent_of_product"
  baseProductAmount?: number;
}

export function calculateAddOnLineItem(input: AddOnInput): LineItem {
  const { featureName, pricingModel, priceValue, termLength, addOnSeats, baseProductAmount } = input;
  const months = TERM_LENGTH_MONTHS[termLength];

  if (pricingModel === "fixed") {
    const amount = roundToCents(priceValue * months);
    return {
      label: `Add-on: ${featureName}`,
      formula: `$${formatMoney(priceValue)} per month × ${months} month${months > 1 ? "s" : ""}`,
      note: "Fixed monthly add-on price",
      amount,
    };
  }

  if (pricingModel === "per_seat") {
    if (addOnSeats === undefined || addOnSeats === null) {
      throw new Error(`Add-on "${featureName}" is per-seat but no seat count was provided.`);
    }
    const amount = roundToCents(addOnSeats * priceValue * months);
    return {
      label: `Add-on: ${featureName}`,
      formula: `${addOnSeats} seats × $${formatMoney(priceValue)} per seat per month × ${months} month${months > 1 ? "s" : ""}`,
      note:
        "Per-seat add-on. The add-on seat count is independent of the product's seat count.",
      amount,
    };
  }

  // percent_of_product
  if (baseProductAmount === undefined || baseProductAmount === null) {
    throw new Error(`Add-on "${featureName}" is percent-of-product but no base amount was provided.`);
  }
  const amount = roundToCents(baseProductAmount * (priceValue / 100));
  return {
    label: `Add-on: ${featureName}`,
    formula: `${priceValue}% × $${formatMoney(baseProductAmount)} base product cost`,
    note: "Percentage-of-product add-on, calculated against the base product line above",
    amount,
  };
}

export interface QuoteDiscountInput {
  subtotal: number;
  discountPercent: number;
}

export function calculateOverallDiscountLineItem(input: QuoteDiscountInput): LineItem | null {
  const { subtotal, discountPercent } = input;
  if (!discountPercent) return null;
  const amount = roundToCents(-1 * subtotal * (discountPercent / 100));
  return {
    label: `Quote discount (${discountPercent}%)`,
    formula: `-${discountPercent}% × $${formatMoney(subtotal)} subtotal`,
    note: "Applied to the subtotal of all line items above",
    amount,
  };
}

export function sumLineItems(items: LineItem[]): number {
  return roundToCents(items.reduce((total, item) => total + item.amount, 0));
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(value: number): string {
  return `$${formatMoney(value)}`;
}
