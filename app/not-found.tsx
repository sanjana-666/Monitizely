import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="card animate-rise inline-block w-full p-10">
        <p className="font-mono-figures text-4xl font-semibold text-[var(--ledger-green)]">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">We couldn&apos;t find that.</h1>
        <p className="mt-2 text-sm text-[var(--slate)]">
          The product or quote you&apos;re looking for doesn&apos;t exist, or the link is wrong.
        </p>
        <Link href="/" className="btn btn-ghost mt-6">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
