import { db, ensureMigrated } from "@/db/client";
import { products, tiers, features, featureTierSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export type FeatureStatus = "included" | "addon" | "unavailable";
export type PricingModel = "fixed" | "per_seat" | "percent_of_product";

export async function listProducts() {
  await ensureMigrated();
  return db.select().from(products).orderBy(asc(products.createdAt));
}

export async function getAllProductDetails(): Promise<ProductDetail[]> {
  const rows = await listProducts();
  const details = await Promise.all(rows.map((p) => getProductDetail(p.id)));
  return details.filter((d): d is ProductDetail => d !== null);
}

export async function createProduct(name: string) {
  await ensureMigrated();
  const id = nanoid();
  await db.insert(products).values({ id, name });
  return id;
}

export async function addTier(productId: string, name: string, basePricePerSeat: number, sortOrder: number) {
  await ensureMigrated();
  const id = nanoid();
  await db.insert(tiers).values({ id, productId, name, basePricePerSeat, sortOrder });
  return id;
}

export async function addFeature(productId: string, name: string, sortOrder: number) {
  await ensureMigrated();
  const id = nanoid();
  await db.insert(features).values({ id, productId, name, sortOrder });
  return id;
}

/**
 * Create or update the setting for how a feature behaves within a tier.
 * There is at most one setting per (feature, tier) pair.
 */
export async function setFeatureTierSetting(params: {
  featureId: string;
  tierId: string;
  status: FeatureStatus;
  pricingModel?: PricingModel | null;
  priceValue?: number | null;
}) {
  await ensureMigrated();
  const { featureId, tierId, status, pricingModel = null, priceValue = null } = params;

  const existing = await db
    .select()
    .from(featureTierSettings)
    .where(eq(featureTierSettings.featureId, featureId));

  const match = existing.find((row) => row.tierId === tierId);

  if (match) {
    await db
      .update(featureTierSettings)
      .set({ status, pricingModel, priceValue })
      .where(eq(featureTierSettings.id, match.id));
    return match.id;
  }

  const id = nanoid();
  await db.insert(featureTierSettings).values({
    id,
    featureId,
    tierId,
    status,
    pricingModel,
    priceValue,
  });
  return id;
}

export interface ProductDetail {
  id: string;
  name: string;
  tiers: { id: string; name: string; basePricePerSeat: number; sortOrder: number }[];
  features: {
    id: string;
    name: string;
    sortOrder: number;
    settingsByTierId: Record<
      string,
      { status: FeatureStatus; pricingModel: PricingModel | null; priceValue: number | null }
    >;
  }[];
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  await ensureMigrated();
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) return null;

  const tierRows = await db
    .select()
    .from(tiers)
    .where(eq(tiers.productId, productId))
    .orderBy(asc(tiers.sortOrder));

  const featureRows = await db
    .select()
    .from(features)
    .where(eq(features.productId, productId))
    .orderBy(asc(features.sortOrder));

  const settingRows = featureRows.length
    ? await db.select().from(featureTierSettings)
    : [];

  const featureIds = new Set(featureRows.map((f) => f.id));

  const featuresOut = featureRows.map((f) => {
    const settingsByTierId: ProductDetail["features"][number]["settingsByTierId"] = {};
    for (const row of settingRows) {
      if (row.featureId !== f.id) continue;
      settingsByTierId[row.tierId] = {
        status: row.status as FeatureStatus,
        pricingModel: (row.pricingModel as PricingModel) ?? null,
        priceValue: row.priceValue ?? null,
      };
    }
    // Default any tier without an explicit setting to "unavailable".
    for (const t of tierRows) {
      if (!settingsByTierId[t.id]) {
        settingsByTierId[t.id] = { status: "unavailable", pricingModel: null, priceValue: null };
      }
    }
    return { id: f.id, name: f.name, sortOrder: f.sortOrder, settingsByTierId };
  });

  return {
    id: product.id,
    name: product.name,
    tiers: tierRows.map((t) => ({
      id: t.id,
      name: t.name,
      basePricePerSeat: t.basePricePerSeat,
      sortOrder: t.sortOrder,
    })),
    features: featuresOut.filter((f) => featureIds.has(f.id)),
  };
}
