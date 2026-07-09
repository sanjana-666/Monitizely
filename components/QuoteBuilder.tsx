"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProductDetail } from "@/lib/data/catalog";
import {
  calculateBaseProductLineItem,
  calculateAddOnLineItem,
  calculateOverallDiscountLineItem,
  sumLineItems,
  formatCurrency,
  TERM_LENGTH_LABEL,
  TERM_LENGTH_DISCOUNT,
  type TermLength,
  type LineItem,
} from "@/lib/pricing";
import { createQuoteAction } from "@/lib/actions";

const TERM_OPTIONS: TermLength[] = ["monthly", "annual", "two_year"];

function pricingLabel(pricingModel: string | null, priceValue: number | null): string {
  if (priceValue == null) return "";
  if (pricingModel === "fixed") return `$${priceValue}/mo`;
  if (pricingModel === "per_seat") return `$${priceValue}/seat/mo`;
  if (pricingModel === "percent_of_product") return `${priceValue}% of product`;
  return "";
}

export default function QuoteBuilder({ products }: { products: ProductDetail[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [quoteName, setQuoteName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  const [tierId, setTierId] = useState(product?.tiers[0]?.id ?? "");
  const tier = useMemo(() => product?.tiers.find((t) => t.id === tierId) ?? null, [product, tierId]);

  const [seats, setSeats] = useState(1);
  const [termLength, setTermLength] = useState<TermLength>("monthly");
  const [discountPercent, setDiscountPercent] = useState(0);

  // Selected add-ons: featureId -> seats (only meaningful for per_seat add-ons)
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number | null>>({});

  function onProductChange(id: string) {
    setProductId(id);
    const p = products.find((pr) => pr.id === id);
    setTierId(p?.tiers[0]?.id ?? "");
    setSelectedAddOns({});
  }

  function onTierChange(id: string) {
    setTierId(id);
    setSelectedAddOns({});
  }

  const availableAddOns = useMemo(() => {
    if (!product || !tier) return [];
    return product.features
      .map((f) => ({ feature: f, setting: f.settingsByTierId[tier.id] }))
      .filter((x) => x.setting?.status === "addon");
  }, [product, tier]);

  const { lineItems, total, baseLineItem } = useMemo(() => {
    if (!product || !tier) return { lineItems: [] as LineItem[], total: 0, baseLineItem: null as LineItem | null };

    const base = calculateBaseProductLineItem({
      productName: product.name,
      tierName: tier.name,
      seats,
      basePricePerSeat: tier.basePricePerSeat,
      termLength,
    });

    const addOnItems: LineItem[] = [];
    for (const { feature, setting } of availableAddOns) {
      if (!(feature.id in selectedAddOns)) continue;
      if (!setting.pricingModel || setting.priceValue == null) continue;
      const addOnSeats = selectedAddOns[feature.id] ?? undefined;
      if (setting.pricingModel === "per_seat" && (!addOnSeats || addOnSeats <= 0)) continue;
      try {
        addOnItems.push(
          calculateAddOnLineItem({
            featureName: feature.name,
            pricingModel: setting.pricingModel,
            priceValue: setting.priceValue,
            termLength,
            addOnSeats,
            baseProductAmount: base.amount,
          })
        );
      } catch {
        // incomplete input, skip until valid
      }
    }

    const subtotalItems = [base, ...addOnItems];
    const subtotal = sumLineItems(subtotalItems);
    const discountItem = calculateOverallDiscountLineItem({ subtotal, discountPercent });
    const items = discountItem ? [...subtotalItems, discountItem] : subtotalItems;
    return { lineItems: items, total: sumLineItems(items), baseLineItem: base };
  }, [product, tier, seats, termLength, availableAddOns, selectedAddOns, discountPercent]);

  function toggleAddOn(featureId: string, checked: boolean, pricingModel: string) {
    setSelectedAddOns((prev) => {
      const next = { ...prev };
      if (checked) {
        next[featureId] = pricingModel === "per_seat" ? seats : null;
      } else {
        delete next[featureId];
      }
      return next;
    });
  }

  function setAddOnSeats(featureId: string, value: number) {
    setSelectedAddOns((prev) => ({ ...prev, [featureId]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!product || !tier) {
      setError("Choose a product and tier.");
      return;
    }
    if (!quoteName.trim() || !customerName.trim()) {
      setError("Quote name and customer name are required.");
      return;
    }

    const addOns = Object.entries(selectedAddOns).map(([featureId, addOnSeats]) => ({
      featureId,
      seats: addOnSeats ?? undefined,
    }));

    startTransition(async () => {
      try {
        const id = await createQuoteAction({
          name: quoteName,
          customerName,
          productId: product.id,
          tierId: tier.id,
          seats,
          termLength,
          discountPercent,
          addOns,
        });
        router.push(`/quotes/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong saving the quote.");
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-[var(--slate)]">
          No products in the catalog yet.{" "}
          <Link className="font-medium text-[var(--ledger-green)] underline" href="/catalog">
            Set up a product
          </Link>{" "}
          before building a quote.
        </p>
      </div>
    );
  }

  const selectedAddOnCount = Object.keys(selectedAddOns).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Step 1: name + customer */}
        <StepSection index={1} title="Quote details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Quote name</label>
              <input
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="e.g. Acme Corp — Q3 2026 proposal"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Customer name</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="field-input"
              />
            </div>
          </div>
        </StepSection>

        {/* Step 2: product */}
        <StepSection index={2} title="Product">
          {products.length === 1 ? (
            <div className="option-card" data-selected="true">
              <span className="font-medium">{product?.name}</span>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onProductChange(p.id)}
                  className="option-card"
                  data-selected={p.id === productId}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.id === productId && <Check />}
                  </div>
                  <span className="mt-0.5 block text-xs text-[var(--slate)]">
                    {p.tiers.length} tier{p.tiers.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </StepSection>

        {/* Step 3: tier */}
        <StepSection index={3} title="Tier">
          {product && product.tiers.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {product.tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTierChange(t.id)}
                  className="option-card"
                  data-selected={t.id === tierId}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.name}</span>
                    {t.id === tierId && <Check />}
                  </div>
                  <span className="mt-1 block font-mono-figures text-sm text-[var(--ink)]">
                    ${t.basePricePerSeat.toFixed(2)}
                    <span className="text-xs text-[var(--slate)]"> /seat/mo</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--slate)]">This product has no tiers yet.</p>
          )}
        </StepSection>

        {/* Step 4: seats + term */}
        <StepSection index={4} title="Seats & term">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label mb-1.5">Seats</label>
              <Stepper value={seats} onChange={(v) => setSeats(Math.max(1, v))} min={1} />
            </div>
            <div>
              <label className="field-label mb-1.5">Term length</label>
              <div className="segmented">
                {TERM_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTermLength(t)}
                    data-active={t === termLength}
                  >
                    {TERM_LENGTH_LABEL[t]}
                  </button>
                ))}
              </div>
              {TERM_LENGTH_DISCOUNT[termLength] > 0 && (
                <p className="mt-2 text-xs text-[var(--ledger-green)]">
                  Includes {Math.round(TERM_LENGTH_DISCOUNT[termLength] * 100)}% term discount on the base product.
                </p>
              )}
            </div>
          </div>
        </StepSection>

        {/* Step 5: add-ons */}
        <StepSection
          index={5}
          title="Add-ons"
          hint={tier ? `Available on ${tier.name}` : undefined}
          badge={selectedAddOnCount > 0 ? `${selectedAddOnCount} selected` : undefined}
        >
          {availableAddOns.length === 0 ? (
            <p className="text-sm text-[var(--slate)]">No paid add-ons for this tier.</p>
          ) : (
            <div className="space-y-2.5">
              {availableAddOns.map(({ feature, setting }) => {
                const checked = feature.id in selectedAddOns;
                return (
                  <div
                    key={feature.id}
                    className="option-card flex flex-wrap items-center gap-3"
                    data-selected={checked}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleAddOn(feature.id, e.target.checked, setting.pricingModel!)}
                        />
                        <span className="track" />
                        <span className="thumb" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{feature.name}</span>
                        <span className="text-xs text-[var(--slate)]">
                          {pricingLabel(setting.pricingModel, setting.priceValue)}
                        </span>
                      </span>
                    </label>
                    {checked && setting.pricingModel === "per_seat" && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[var(--slate)]">Seats</label>
                        <Stepper
                          value={selectedAddOns[feature.id] ?? 1}
                          onChange={(v) => setAddOnSeats(feature.id, Math.max(1, v))}
                          min={1}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </StepSection>

        {/* Step 6: discount */}
        <StepSection index={6} title="Quote discount" hint="Optional">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="field-input w-28 pr-7 font-mono-figures"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--slate)]">
                %
              </span>
            </div>
            <span className="text-sm text-[var(--slate)]">off the quote subtotal</span>
          </div>
        </StepSection>

        {error && (
          <p className="animate-rise rounded-[var(--radius)] border border-[var(--rust)] bg-[var(--rust-tint)] px-4 py-3 text-sm text-[var(--rust)]">
            {error}
          </p>
        )}
      </div>

      {/* Live preview */}
      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <div className="card overflow-hidden">
          <div className="accent-bar" />
          <div className="flex items-center justify-between border-b hairline bg-[var(--paper)] px-5 py-3">
            <h2 className="section-label">Live preview</h2>
            <span className="badge badge-teal">Updates as you go</span>
          </div>
          <div className="space-y-3 px-5 py-4 text-sm">
            {lineItems.map((item, i) => (
              <div key={i} className="border-b hairline pb-3 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-mono-figures whitespace-nowrap">
                    {item.amount < 0 ? "−" : ""}
                    {formatCurrency(Math.abs(item.amount))}
                  </span>
                </div>
                <p className="mt-0.5 font-mono-figures text-xs text-[var(--slate)]">{item.formula}</p>
              </div>
            ))}
            {lineItems.length === 0 && (
              <p className="text-[var(--slate)]">Choose a product and tier to see pricing.</p>
            )}
          </div>
          <div className="flex items-baseline justify-between border-t-2 border-[var(--navy)] px-5 py-4">
            <span className="font-semibold">Total</span>
            <span className="text-gradient font-mono-figures text-xl font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending || !baseLineItem}
          className="btn btn-primary mt-4 w-full py-3"
        >
          {isPending ? "Saving quote…" : "Save quote"}
        </button>
        <p className="mt-2 text-center text-xs text-[var(--slate)]">
          A shareable, read-only link is created on save.
        </p>
      </aside>
    </div>
  );
}

const STEP_ACCENTS = [
  { dot: "var(--ledger-green-dark)", dotBg: "var(--ledger-green-tint)" },
  { dot: "var(--blue)", dotBg: "var(--blue-tint)" },
  { dot: "var(--teal)", dotBg: "var(--teal-tint)" },
  { dot: "var(--amber)", dotBg: "var(--amber-tint)" },
  { dot: "var(--plum)", dotBg: "var(--plum-tint)" },
  { dot: "var(--rust)", dotBg: "var(--rust-tint)" },
];

function StepSection({
  index,
  title,
  hint,
  badge,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const accent = STEP_ACCENTS[(index - 1) % STEP_ACCENTS.length];
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="medallion h-6 w-6 flex-none font-mono-figures text-xs"
          style={{ ["--dot" as string]: accent.dot, ["--dot-bg" as string]: accent.dotBg }}
        >
          {index}
        </span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {hint && <span className="text-xs text-[var(--slate)]">· {hint}</span>}
        {badge && <span className="badge badge-green ml-auto">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  compact = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  compact?: boolean;
}) {
  return (
    <div className="stepper" style={compact ? { transform: "scale(0.9)", transformOrigin: "left" } : undefined}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(value - 1)} disabled={value <= min}>
        −
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        className="font-mono-figures"
      />
      <button type="button" aria-label="Increase" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

function Check() {
  return (
    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[var(--ledger-green)] text-white">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
