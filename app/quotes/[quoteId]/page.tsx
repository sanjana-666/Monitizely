import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteView } from "@/lib/data/quotes";
import { formatCurrency, TERM_LENGTH_LABEL } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function QuoteViewPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const quote = await getQuoteView(quoteId);
  if (!quote) notFound();

  const created = new Date(quote.createdAt);
  const validUntil = new Date(quote.validUntil);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/quotes"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--slate)] hover:text-[var(--ledger-green)]"
      >
        ← All quotes
      </Link>
      <div className="card overflow-hidden">
        <div className="accent-bar" />
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[var(--navy)] px-8 py-6 text-white">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">Quote</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{quote.name}</h1>
          </div>
          <span className="badge shrink-0 bg-white/10 text-white/80">
            Valid until {validUntil.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="grid gap-6 border-b hairline px-8 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">
              Quote details
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Customer">{quote.customerName}</Row>
              <Row label="Quote name">{quote.name}</Row>
              <Row label="Quote date">{created.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Row>
              <Row label="Valid until">{validUntil.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Row>
            </dl>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">
              What is being purchased
            </h2>
            <dl className="mt-2 space-y-1 text-sm">
              <Row label="Product">{quote.productName}</Row>
              <Row label="Tier">{quote.tierName}</Row>
              <Row label="Seats">{quote.seats}</Row>
              <Row label="Term length">{TERM_LENGTH_LABEL[quote.termLength]}</Row>
            </dl>
          </div>
        </div>

        <div className="px-8 py-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--slate)]">
            Cost breakdown
          </h2>
          <div className="mt-3 overflow-hidden rounded-sm border hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b hairline bg-[var(--paper)] text-left text-xs uppercase tracking-wide text-[var(--slate)]">
                  <th className="px-4 py-2">Line item</th>
                  <th className="px-4 py-2">How it was calculated</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, i) => (
                  <tr key={i} className="border-b hairline last:border-0">
                    <td className="px-4 py-3 align-top font-medium">{item.label}</td>
                    <td className="px-4 py-3 align-top font-mono-figures text-xs text-[var(--slate)]">
                      {item.formula}
                      {item.note && <p className="mt-1 font-sans text-[11px] italic text-[var(--slate)]/80">{item.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono-figures whitespace-nowrap">
                      {item.amount < 0 ? "-" : ""}
                      {formatCurrency(Math.abs(item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--navy)] text-white">
                  <td colSpan={2} className="px-4 py-3 font-semibold">TOTAL</td>
                  <td className="px-4 py-3 text-right font-mono-figures text-base font-semibold">
                    {formatCurrency(quote.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--slate)]">
        This link is shareable and read-only. Prices are in USD and do not include tax.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--slate)]">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
