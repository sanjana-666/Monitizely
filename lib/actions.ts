"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  addTier,
  addFeature,
  setFeatureTierSetting,
  type FeatureStatus,
  type PricingModel,
} from "@/lib/data/catalog";
import { createQuote, type NewQuoteAddOn } from "@/lib/data/quotes";
import type { TermLength } from "@/lib/pricing";

export async function createProductAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Product name is required.");
  const id = await createProduct(name);
  revalidatePath("/catalog");
  redirect(`/catalog/${id}`);
}

export async function addTierAction(productId: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const basePrice = Number(formData.get("basePricePerSeat"));
  const sortOrder = Number(formData.get("sortOrder") || 0);
  if (!name) throw new Error("Tier name is required.");
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error("Base price must be a non-negative number.");
  await addTier(productId, name, basePrice, sortOrder);
  revalidatePath(`/catalog/${productId}`);
}

export async function addFeatureAction(productId: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);
  if (!name) throw new Error("Feature name is required.");
  await addFeature(productId, name, sortOrder);
  revalidatePath(`/catalog/${productId}`);
}

export async function updateFeatureTierSettingAction(params: {
  productId: string;
  featureId: string;
  tierId: string;
  status: FeatureStatus;
  pricingModel?: PricingModel | null;
  priceValue?: number | null;
}) {
  const { productId, ...rest } = params;
  await setFeatureTierSetting(rest);
  revalidatePath(`/catalog/${productId}`);
}

export interface CreateQuoteFormInput {
  name: string;
  customerName: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  addOns: NewQuoteAddOn[];
}

export async function createQuoteAction(input: CreateQuoteFormInput) {
  if (!input.name.trim()) throw new Error("Quote name is required.");
  if (!input.customerName.trim()) throw new Error("Customer name is required.");
  if (!input.productId || !input.tierId) throw new Error("Product and tier are required.");
  if (!Number.isFinite(input.seats) || input.seats <= 0) throw new Error("Seats must be a positive number.");

  const id = await createQuote({
    name: input.name.trim(),
    customerName: input.customerName.trim(),
    productId: input.productId,
    tierId: input.tierId,
    seats: input.seats,
    termLength: input.termLength,
    discountPercent: input.discountPercent || 0,
    addOns: input.addOns,
  });

  revalidatePath("/quotes");
  return id;
}
