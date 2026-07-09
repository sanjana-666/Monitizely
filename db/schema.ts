import { pgTable, text, doublePrecision, integer, timestamp } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Catalog tables
// ---------------------------------------------------------------------------

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tiers = pgTable("tiers", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Base price per seat, per month, in USD.
  basePricePerSeat: doublePrecision("base_price_per_seat").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const features = pgTable("features", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Status of a feature within a specific tier: "included" | "addon" | "unavailable"
// Pricing model of an add-on: "fixed" | "per_seat" | "percent_of_product"
export const featureTierSettings = pgTable("feature_tier_settings", {
  id: text("id").primaryKey(),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id, { onDelete: "cascade" }),
  tierId: text("tier_id")
    .notNull()
    .references(() => tiers.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // included | addon | unavailable
  pricingModel: text("pricing_model"), // fixed | per_seat | percent_of_product (only when status = addon)
  // Meaning depends on pricingModel:
  //   fixed              -> price value in USD / month
  //   per_seat           -> price value in USD / seat / month
  //   percent_of_product -> price value as a percentage (e.g. 10 = 10%)
  priceValue: doublePrecision("price_value"),
});

// ---------------------------------------------------------------------------
// Quote tables
// ---------------------------------------------------------------------------

// monthly | annual | two_year
export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  customerName: text("customer_name").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  tierId: text("tier_id")
    .notNull()
    .references(() => tiers.id),
  seats: integer("seats").notNull(),
  termLength: text("term_length").notNull(),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  validUntil: timestamp("valid_until").notNull(),
});

export const quoteAddOns = pgTable("quote_add_ons", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  featureId: text("feature_id")
    .notNull()
    .references(() => features.id),
  // Only used when the underlying add-on pricing model is per_seat.
  seats: integer("seats"),
});
