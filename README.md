# Monetizely Quoting Tool

A small internal tool for modeling a client's pricing catalog (products, tiers,
features, add-on pricing) and building shareable, line-item quotes from it.

Built with Next.js 16 (App Router), TypeScript, Server Actions, Drizzle ORM,
and Postgres. The pricing math lives in `lib/pricing.ts` as pure, unit-tested
functions.

## Running it locally

You need Node and a Postgres database. The repo already ships pointed at a
hosted Neon database via `DATABASE_URL` in `.env.local` (runtime) and `.env`
(the drizzle-kit CLI), so there's nothing to stand up:

```bash
npm install
npm run db:seed     # optional: loads a demo catalog (also applies pending migrations)
npm run dev
```
Open http://localhost:3000. There is no login. Pending migrations are applied
automatically on the first request via `ensureMigrated()`, so no manual
migration step is needed to get a working app.


To use your own database instead, set `DATABASE_URL` in both `.env.local` and
`.env` (see `.env.example`) to any Postgres connection string. A
`docker-compose.yml` is included if you'd rather run Postgres locally
(`docker compose up -d`), but it's optional and not required for the hosted
setup above.

**Tests:**

```bash
npm test        # unit tests for the pricing math (vitest, no DB needed)
npm run e2e     # end-to-end happy path (Playwright; starts its own server on :3312)
```

## Assumptions I made
- **A quote covers exactly one product and one tier.** Add-ons layer on top of that single base line; the tool does not mix multiple products into one quote.
- **All amounts are US dollars with no tax.**
- **Term-length discounts apply to the base product only, not to add-ons.** The brief's sample quote applies its annual discount to the base line but leaves the add-on lines at full price, so the code matches that (`TERM_LENGTH_DISCOUNT` is applied inside `calculateBaseProductLineItem` only).
- **A percent-of-product add-on is a percent of the base line's dollar amount** after seats, term, and discount, i.e. "10% of what the customer pays for the product." This is the most natural reading, since the sample has no such example.
- **The overall quote discount applies once, to the subtotal** of all line items.
- **Quotes are valid for one calendar month from creation**, matching the sample's roughly 30-day window (May 21 2026 to June 21 2026). This is not configurable.
- **Feature/tier cells default to "unavailable"** until set, so adding a tier never silently makes a feature included or free.
- **Standard term discounts are fixed** at 0% / 15% / 25% for monthly / annual / two-year, across all clients.

## Decisions between reasonable options

- **Postgres over SQLite.** SQLite is the simplest option to run on one machine, since it is just a file and needs no separate server. The catch is the deploy target: a serverless host has an ephemeral filesystem (temporary storage that is wiped between requests), so a SQLite file would keep disappearing and quotes would not persist. The brief requires the deployed app to work end to end, so I accepted the heavier setup of a real Postgres service in exchange for data that reliably survives. Postgres is also the more realistic choice for a tool that would grow.
- **Drizzle over Prisma.** Both are tools for talking to the database from TypeScript. Prisma downloads a platform-specific query-engine binary at install time, which was not reachable in my build sandbox and would have blocked the whole install. Drizzle is a thin, pure-TypeScript layer with no binary download step, so it installs anywhere. This started as a constraint but stands on its own merits: Drizzle is lightweight and a reasonable production choice.
- **Server Actions over a REST API layer.** The catalog and quote forms call server-side mutations directly, which is the built-in Next.js approach. A separate REST API is the plumbing you add when outside programs also need to reach your data. Nothing outside this app does, so building hand-written routes and matching fetch wrappers would be extra code to maintain for no benefit. If an external integration were ever needed, that is the point to add an API, not before.
- **Formula-visible, receipt-style quote view.** The core ask was that the math be right and visible, so each quote reads like an itemized receipt with the exact formula shown on every line, rather than a summary card with one big total that the reader has to trust. To support this, every pricing function returns not just a number but a plain-English formula string describing how that number was derived, so the explanation can never drift out of sync with the amount.
- **Per-cell save in the catalog matrix.** In the grid of features against tiers, each cell saves on its own rather than the whole grid saving at once. This costs a few more save operations, but it means a mistake or a failed save in one cell cannot wipe out unsaved edits everywhere else in the grid. For a data-entry screen, protecting the user's work was worth the extra chatter.

## Questions I would have asked

- Do the 15% / 25% term discounts ever need to vary by client or product, or is "standard everywhere" a permanent rule?
- For percent-of-product add-ons: percent of the discounted price the customer actually pays, or of the tier's undiscounted list price? (I chose the former.)
- Should a quote snapshot catalog pricing at creation time, or always reflect the latest catalog? Today it reads live values by ID, so editing a tier's price would retroactively change already-sent quotes.
- Is there ever a need for multiple or stacking discounts (for example volume plus promotional) shown as separate lines?
- Should currency and tax be supported, or is USD with no tax acceptable for this tool's scope?

## What I would build next

- **Snapshot pricing on quotes.** Store the price and formula inputs at save time so a quote becomes a permanent record of what was proposed, independent of later catalog edits.
- **Duplicate-quote flow**, so an analyst iterating on a proposal does not have to re-enter everything.
- **Search and filter on the quotes list** once it grows beyond a handful.
- **Currency and tax fields.** Hardcoded USD and no tax for now, but the schema is structured to extend. This is the most likely next real-world ask.