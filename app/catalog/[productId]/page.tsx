import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/lib/data/catalog";
import { addTierAction, addFeatureAction } from "@/lib/actions";
import FeatureTierCell from "@/components/FeatureTierCell";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProductDetail(productId);
  if (!product) notFound();

  const boundAddTier = addTierAction.bind(null, productId);
  const boundAddFeature = addFeatureAction.bind(null, productId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--slate)] hover:text-[var(--ledger-green)]"
      >
        ← Catalog
      </Link>
      <p className="mt-3 text-xs uppercase tracking-widest text-[var(--slate)]">Product</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.name}</h1>

      {/* Tiers */}
      <section className="mt-8">
        <h2 className="section-label">Tiers</h2>
        <div className="mt-3 overflow-hidden rounded-[var(--radius-lg)] border hairline bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--ledger-green-ring)] bg-[var(--ledger-green-tint)] text-left text-xs uppercase tracking-wide text-[var(--ledger-green-dark)]">
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2">Base price / seat / month</th>
              </tr>
            </thead>
            <tbody>
              {product.tiers.map((t) => (
                <tr key={t.id} className="border-b hairline last:border-0">
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 font-mono-figures">${t.basePricePerSeat.toFixed(2)}</td>
                </tr>
              ))}
              {product.tiers.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm text-[var(--slate)]">
                    No tiers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <form action={boundAddTier} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Tier name</label>
            <input name="name" required placeholder="e.g. Starter" className="field-input" />
          </div>
          <div>
            <label className="field-label">Base price ($/seat/month)</label>
            <input
              name="basePricePerSeat"
              type="number"
              min={0}
              step="0.01"
              required
              placeholder="e.g. 25"
              className="field-input w-40 font-mono-figures"
            />
          </div>
          <input type="hidden" name="sortOrder" value={product.tiers.length} />
          <button type="submit" className="btn btn-primary">
            Add tier
          </button>
        </form>
      </section>

      {/* Features matrix */}
      <section className="mt-12">
        <h2 className="section-label">Features by tier</h2>
        <p className="mt-1 text-sm text-[var(--slate)]">
          For each feature, set whether it&apos;s included, a paid add-on, or unavailable in each
          tier. Add-ons need a pricing model and price.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[var(--slate)]">
          <LegendDot color="var(--ledger-green)" label="Included" />
          <LegendDot color="var(--gold)" label="Paid add-on" />
          <LegendDot color="var(--hairline-strong)" label="Not available" />
        </div>

        {product.tiers.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--slate)]">Add at least one tier first.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border hairline bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[var(--ledger-green-ring)] bg-[var(--ledger-green-tint)]">
                    <th className="sticky left-0 z-10 min-w-[190px] border-r hairline bg-[var(--ledger-green-tint)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ledger-green-dark)]">
                      Feature
                    </th>
                    {product.tiers.map((t) => (
                      <th
                        key={t.id}
                        className="min-w-[210px] px-3 py-3 text-left align-bottom"
                      >
                        <span className="block text-sm font-semibold tracking-tight text-[var(--ink)]">
                          {t.name}
                        </span>
                        <span className="mt-0.5 block font-mono-figures text-[11px] font-normal text-[var(--slate)]">
                          ${t.basePricePerSeat.toFixed(2)}/seat/mo
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {product.features.map((f) => (
                    <tr key={f.id} className="group align-top">
                      <td className="sticky left-0 z-10 border-r hairline bg-white px-4 py-3 font-medium transition-colors group-hover:bg-[var(--paper)]">
                        {f.name}
                      </td>
                      {product.tiers.map((t) => {
                        const setting = f.settingsByTierId[t.id];
                        return (
                          <td
                            key={t.id}
                            className="px-3 py-3 transition-colors group-hover:bg-[var(--paper)]"
                          >
                            <FeatureTierCell
                              productId={productId}
                              featureId={f.id}
                              tierId={t.id}
                              initialStatus={setting.status}
                              initialPricingModel={setting.pricingModel}
                              initialPriceValue={setting.priceValue}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {product.features.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-[var(--slate)]" colSpan={product.tiers.length + 1}>
                        No features yet. Add one below.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <form action={boundAddFeature} className="mt-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">New feature name</label>
            <input
              name="name"
              required
              placeholder="e.g. Single Sign-On (SSO)"
              className="field-input w-64"
            />
          </div>
          <input type="hidden" name="sortOrder" value={product.features.length} />
          <button type="submit" disabled={product.tiers.length === 0} className="btn btn-primary disabled:opacity-40">
            Add feature
          </button>
        </form>
      </section>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
