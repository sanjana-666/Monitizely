import Link from "next/link";
import { listQuotes } from "@/lib/data/quotes";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const quotes = await listQuotes();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="mt-1 text-sm text-[var(--slate)]">Every quote ever saved, newest first.</p>
        </div>
        <Link href="/quotes/new" className="btn btn-primary">
          <span className="text-base leading-none">+</span> New quote
        </Link>
      </div>

      <div className="mt-8 space-y-2.5">
        {quotes.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-sm text-[var(--slate)]">No quotes yet.</p>
            <Link
              href="/quotes/new"
              className="mt-3 inline-flex text-sm font-medium text-[var(--ledger-green)] hover:underline"
            >
              Build your first quote →
            </Link>
          </div>
        )}
        {quotes.map((q) => (
          <Link
            key={q.id}
            href={`/quotes/${q.id}`}
            className="card-flat link-card flex items-center gap-3.5 px-5 py-4"
          >
            <span
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
              style={{ background: "var(--accent-gradient)" }}
              aria-hidden
            >
              {q.customerName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{q.name}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--slate)]">
                {q.customerName} · {q.productName} ({q.tierName})
              </p>
            </div>
            <span className="whitespace-nowrap font-mono-figures text-xs text-[var(--slate)]">
              {new Date(q.createdAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
