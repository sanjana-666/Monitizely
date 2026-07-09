import { db, ensureMigrated } from "./client";
import { products, tiers, features, featureTierSettings } from "./schema";
import { nanoid } from "nanoid";

async function main() {
  await ensureMigrated();
  const existing = await db.select().from(products);
  if (existing.length > 0) {
    console.log("Database already has products, skipping seed.");
    return;
  }

  const productId = nanoid();
  await db.insert(products).values({ id: productId, name: "Analytics Suite" });

  const starterId = nanoid();
  const growthId = nanoid();
  const enterpriseId = nanoid();

  await db.insert(tiers).values([
    { id: starterId, productId, name: "Starter", basePricePerSeat: 25, sortOrder: 0 },
    { id: growthId, productId, name: "Growth", basePricePerSeat: 50, sortOrder: 1 },
    { id: enterpriseId, productId, name: "Enterprise", basePricePerSeat: 100, sortOrder: 2 },
  ]);

  const ssoId = nanoid();
  const apiId = nanoid();
  const advReportingId = nanoid();

  await db.insert(features).values([
    { id: ssoId, productId, name: "Single Sign-On (SSO)", sortOrder: 0 },
    { id: apiId, productId, name: "API access", sortOrder: 1 },
    { id: advReportingId, productId, name: "Advanced Reporting", sortOrder: 2 },
  ]);

  await db.insert(featureTierSettings).values([
    // SSO: not available on Starter, paid add-on on Growth ($200/mo fixed), included on Enterprise
    { id: nanoid(), featureId: ssoId, tierId: starterId, status: "unavailable" },
    { id: nanoid(), featureId: ssoId, tierId: growthId, status: "addon", pricingModel: "fixed", priceValue: 200 },
    { id: nanoid(), featureId: ssoId, tierId: enterpriseId, status: "included" },

    // API access: not available on Starter, paid add-on on Growth ($50/seat/mo), included on Enterprise
    { id: nanoid(), featureId: apiId, tierId: starterId, status: "unavailable" },
    { id: nanoid(), featureId: apiId, tierId: growthId, status: "addon", pricingModel: "per_seat", priceValue: 50 },
    { id: nanoid(), featureId: apiId, tierId: enterpriseId, status: "included" },

    // Advanced Reporting: paid add-on on Starter (10% of product), paid add-on on Growth (10%), included on Enterprise
    {
      id: nanoid(),
      featureId: advReportingId,
      tierId: starterId,
      status: "addon",
      pricingModel: "percent_of_product",
      priceValue: 15,
    },
    {
      id: nanoid(),
      featureId: advReportingId,
      tierId: growthId,
      status: "addon",
      pricingModel: "percent_of_product",
      priceValue: 10,
    },
    { id: nanoid(), featureId: advReportingId, tierId: enterpriseId, status: "included" },
  ]);

  console.log("Seeded Analytics Suite catalog.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
