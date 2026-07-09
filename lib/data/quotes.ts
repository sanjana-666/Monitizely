import { db, ensureMigrated, withRetry } from "@/db/client";
import { quotes, quoteAddOns, products, tiers, features, featureTierSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { TermLength } from "@/lib/pricing";
import {
  calculateBaseProductLineItem,
  calculateAddOnLineItem,
  calculateOverallDiscountLineItem,
  sumLineItems,
  type LineItem,
} from "@/lib/pricing";

export interface NewQuoteAddOn {
  featureId: string;
  seats?: number; // only relevant for per_seat add-ons, ignored otherwise
}

export interface NewQuoteInput {
  name: string;
  customerName: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  addOns: NewQuoteAddOn[];
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function createQuote(input: NewQuoteInput) {
  await ensureMigrated();
  const id = nanoid();
  const now = new Date();
  // Quotes are valid for 30 days from creation, matching the sample quote's
  // one-month validity window (May 21 2026 -> June 21 2026).
  const validUntil = addMonths(now, 1);

  await withRetry(() =>
    db.insert(quotes).values({
      id,
      name: input.name,
      customerName: input.customerName,
      productId: input.productId,
      tierId: input.tierId,
      seats: input.seats,
      termLength: input.termLength,
      discountPercent: input.discountPercent,
      validUntil,
    })
  );

  for (const addOn of input.addOns) {
    await withRetry(() =>
      db.insert(quoteAddOns).values({
        id: nanoid(),
        quoteId: id,
        featureId: addOn.featureId,
        seats: addOn.seats ?? null,
      })
    );
  }

  return id;
}

export interface QuoteView {
  id: string;
  name: string;
  customerName: string;
  createdAt: string;
  validUntil: string;
  productName: string;
  tierName: string;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  lineItems: LineItem[];
  total: number;
}

export async function getQuoteView(quoteId: string): Promise<QuoteView | null> {
  await ensureMigrated();
  return withRetry(() => loadQuoteView(quoteId));
}

async function loadQuoteView(quoteId: string): Promise<QuoteView | null> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) return null;

  const [product] = await db.select().from(products).where(eq(products.id, quote.productId));
  const [tier] = await db.select().from(tiers).where(eq(tiers.id, quote.tierId));
  if (!product || !tier) return null;

  const addOnRows = await db.select().from(quoteAddOns).where(eq(quoteAddOns.quoteId, quoteId));

  const termLength = quote.termLength as TermLength;

  const baseLineItem = calculateBaseProductLineItem({
    productName: product.name,
    tierName: tier.name,
    seats: quote.seats,
    basePricePerSeat: tier.basePricePerSeat,
    termLength,
  });

  const addOnLineItems: LineItem[] = [];
  for (const row of addOnRows) {
    const [feature] = await db.select().from(features).where(eq(features.id, row.featureId));
    if (!feature) continue;
    const settingRows = await db
      .select()
      .from(featureTierSettings)
      .where(eq(featureTierSettings.featureId, row.featureId));
    const setting = settingRows.find((s) => s.tierId === quote.tierId);
    if (!setting || setting.status !== "addon" || !setting.pricingModel || setting.priceValue == null) {
      continue;
    }

    addOnLineItems.push(
      calculateAddOnLineItem({
        featureName: feature.name,
        pricingModel: setting.pricingModel as "fixed" | "per_seat" | "percent_of_product",
        priceValue: setting.priceValue,
        termLength,
        addOnSeats: row.seats ?? undefined,
        baseProductAmount: baseLineItem.amount,
      })
    );
  }

  const subtotalItems = [baseLineItem, ...addOnLineItems];
  const subtotal = sumLineItems(subtotalItems);

  const discountLineItem = calculateOverallDiscountLineItem({
    subtotal,
    discountPercent: quote.discountPercent,
  });

  const lineItems = discountLineItem ? [...subtotalItems, discountLineItem] : subtotalItems;
  const total = sumLineItems(lineItems);

  return {
    id: quote.id,
    name: quote.name,
    customerName: quote.customerName,
    createdAt: quote.createdAt.toISOString(),
    validUntil: quote.validUntil.toISOString(),
    productName: product.name,
    tierName: tier.name,
    seats: quote.seats,
    termLength,
    discountPercent: quote.discountPercent,
    lineItems,
    total,
  };
}

export async function listQuotes() {
  await ensureMigrated();
  return withRetry(loadQuotes);
}

async function loadQuotes() {
  const rows = await db.select().from(quotes);
  const out = [];
  for (const q of rows) {
    const [product] = await db.select().from(products).where(eq(products.id, q.productId));
    const [tier] = await db.select().from(tiers).where(eq(tiers.id, q.tierId));
    out.push({
      id: q.id,
      name: q.name,
      customerName: q.customerName,
      createdAt: q.createdAt.toISOString(),
      productName: product?.name ?? "Unknown product",
      tierName: tier?.name ?? "Unknown tier",
    });
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
