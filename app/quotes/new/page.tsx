import { getAllProductDetails } from "@/lib/data/catalog";
import QuoteBuilder from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const products = await getAllProductDetails();

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <span className="badge badge-green">New quote</span>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Build a quote</h1>
      <p className="mt-1 text-sm text-[var(--slate)]">
        Pick a product and tier, choose seats and term, then add any add-ons. The preview updates live.
      </p>
      <div className="mt-8">
        <QuoteBuilder products={products} />
      </div>
    </div>
  );
}
