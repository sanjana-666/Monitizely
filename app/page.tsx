import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl animate-rise">
        <span className="badge badge-green">Internal tool</span>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Model a client&apos;s pricing.
          <br />
          <span className="text-gradient">Produce a quote.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--slate)]">
          Set up a product&apos;s tiers, features, and add-on pricing, then build a
          line-item quote for a customer in a few steps. Every quote gets a
          shareable, read-only URL.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <StepCard
          href="/catalog"
          step="1"
          title="Set up a catalog"
          body="Define products, tiers, base prices, features, and add-on pricing."
          cta="Open catalog"
          dot="var(--ledger-green-dark)"
          dotBg="var(--ledger-green-tint)"
        />
        <StepCard
          href="/quotes/new"
          step="2"
          title="Build a quote"
          body="Pick a product, tier, seats, and term, then add any add-ons."
          cta="Start a quote"
          dot="var(--blue)"
          dotBg="var(--blue-tint)"
        />
      </div>

      <div className="mt-10">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ledger-green)] hover:gap-2 hover:underline"
        >
          View saved quotes <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

function StepCard({
  href,
  step,
  title,
  body,
  cta,
  dot,
  dotBg,
}: {
  href: string;
  step: string;
  title: string;
  body: string;
  cta: string;
  dot: string;
  dotBg: string;
}) {
  return (
    <Link href={href} className="card link-card group block p-6">
      <div className="flex items-start gap-4">
        <span
          className="medallion h-9 w-9 flex-none font-mono-figures text-sm"
          style={{ ["--dot" as string]: dot, ["--dot-bg" as string]: dotBg }}
        >
          {step}
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--slate)]">{body}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--ledger-green)]">
        {cta}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
