import Link from "next/link";
import { listProducts } from "@/lib/data/catalog";
import { createProductAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const products = await listProducts();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
      <p className="mt-1 text-sm text-[var(--slate)]">
        Products, tiers, and feature pricing that quotes are built from.
      </p>

      <div className="mt-8 space-y-2.5">
        {products.length === 0 && (
          <div className="card p-8 text-center text-sm text-[var(--slate)]">
            No products yet. Create one below to get started.
          </div>
        )}
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/catalog/${p.id}`}
            className="card-flat link-card group flex items-center gap-3 px-5 py-4"
          >
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-sm font-semibold text-white shadow-sm"
              style={{ background: "var(--accent-gradient)" }}
              aria-hidden
            >
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">{p.name}</span>
            <span
              aria-hidden
              className="ml-auto text-[var(--slate)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ledger-green)]"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <form action={createProductAction} className="card mt-10 flex items-end gap-3 p-5">
        <div className="flex-1">
          <label className="field-label">New product name</label>
          <input name="name" required placeholder="e.g. Analytics Suite" className="field-input" />
        </div>
        <button type="submit" className="btn btn-primary">
          Create product
        </button>
      </form>
    </div>
  );
}
