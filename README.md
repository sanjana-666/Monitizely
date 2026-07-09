# Monetizely Quoting Tool

A small internal tool for setting up a client's pricing catalog (products,
tiers, features, add-on pricing) and building shareable, line-item quotes
from it.

Built with Next.js (App Router) + TypeScript, Drizzle ORM, and Postgres.

## Live demo

- App: _add your Vercel URL here after deploying_
- Repo: _add your GitHub URL here_

## Running it locally

### 1. Get a Postgres database

Easiest path, using the included Docker Compose file:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with user/password/db all set to
`monetizely` (see `docker-compose.yml`).

If you don't have Docker, any Postgres works, a free
[Neon](https://neon.tech) project is a 60-second alternative, or a local
`postgresql` install.

### 2. Configure the connection string

```bash
cp .env.example .env.local   # used by Next.js at runtime
cp .env.example .env         # used by the drizzle-kit CLI
```

Both should point `DATABASE_URL` at your database. The default in
`.env.example` matches the Docker Compose setup, so if you used that, you
don't need to change anything.

### 3. Install dependencies and set up the schema

```bash
npm install
npm run db:migrate   # generates SQL migrations from db/schema.ts (already committed, but safe to re-run)
```

The app also runs any pending migrations automatically on first request, so
you generally don't need a separate "apply migrations" step, but
`npm run db:migrate` regenerates the migration SQL if you change
`db/schema.ts`.

### 4. (Optional) seed some demo data

```bash
npm run db:seed
```

This creates one product ("Analytics Suite") with the exact three tiers and
add-on pricing shown in the brief's `catalog-example.xlsx`, so you can go
straight to `/quotes/new` and reproduce the sample quote. It's a no-op if
the catalog already has data.

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`. No login is required.

## Running the tests

```bash
npm test           # unit tests (pricing math), vitest, no DB needed
npm run e2e         # end-to-end test, Playwright, needs the app + a DB running
```

The first time, Playwright needs its browser binary:

```bash
npx playwright install chromium
```

`npm run e2e` starts its own dev server automatically (see
`playwright.config.ts`) against a Postgres database, set `DATABASE_URL`
in your shell first if you want it to use a database other than the one in
`.env.local`.

## Deploying

**Database:** use a hosted Postgres that Vercel's serverless functions can
reach, [Neon](https://neon.tech) and
[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) both work
with zero code changes. Vercel's serverless functions don't have a
persistent filesystem, so this app intentionally uses Postgres rather than
a local SQLite file (see "Decisions" below).

**Steps:**
1. Push this repo to GitHub.
2. Import it into Vercel.
3. Set the `DATABASE_URL` environment variable in the Vercel project
   settings to your hosted Postgres connection string.
4. Deploy. The app runs its own migrations on first request, so there's no
   separate migration step.
5. Optionally run `npm run db:seed` against the production `DATABASE_URL`
   locally (or via `vercel env pull` + `npm run db:seed`) to load the demo
   catalog.

## What's in here

- **Catalog setup** (`/catalog`): create products, add tiers with a base
  price per seat per month, add features, and set whether each feature is
  included, a paid add-on, or unavailable in each tier. Add-ons get a
  pricing model (fixed $/month, $/seat/month, or % of the product price)
  and a price.
- **Quote builder** (`/quotes/new`): name a quote, pick a customer, product,
  tier, seat count, and term length (monthly / annual / two-year, with the
  standard 0% / 15% / 25% discounts on the base price). Pick any add-ons
  available on that tier, optionally apply an overall discount, and save.
  There's a live price preview as you fill the form in.
- **Quote view** (`/quotes/[id]`): a read-only, shareable page showing who
  the quote is for, what's being purchased, and a full line-item breakdown
  with the exact formula behind each number.
- **Pricing math** (`lib/pricing.ts`): pure, unit-tested functions with no
  I/O. This is deliberately the most heavily tested part of the app, since
  "the math has to be right" was the brief's clearest requirement.

## Assumptions

- **Term-length discount applies to the base product only, not to
  add-ons.** The brief's sample quote shows a 15% annual discount applied
  to the base "Analytics Suite - Growth tier" line, but the SSO and API
  access add-on lines are full price with no discount applied. I matched
  that exactly rather than guess at a different rule.
- **Percentage-of-product add-ons are a percentage of the base product
  line's dollar amount** (after seats, months, and the term discount are
  applied), not a percentage of the per-seat list price. The brief's sample
  quote doesn't include a percent-of-product example, so this was a
  judgment call, I picked the interpretation that reads most naturally as
  "10% of what the customer is paying for the product."
- **The overall quote discount applies to the subtotal of all line items**
  (base product + all add-ons), applied once at the end, after add-ons are
  totaled.
- **Quotes are valid for 30 days from creation.** The brief's sample quote
  shows a one-month validity window (May 21 to June 21), so I hardcoded 30
  days rather than adding a field for it, since the brief didn't ask for
  that to be configurable.
- **Feature-tier settings default to "unavailable"** if never explicitly
  set for a given tier, so adding a new tier to a product with existing
  features doesn't silently make everything included or free.
- **No seats specified on a per-seat add-on means that add-on isn't
  priced.** The quote builder requires a seat count before a per-seat
  add-on contributes to the total, since "5 seats of API access on a
  25-seat product" (from the sample) only makes sense with an explicit
  number.

## Decisions I made and why

- **Postgres instead of SQLite**, despite SQLite being simpler to set up
  locally. Vercel's serverless functions run on an ephemeral, effectively
  read-only filesystem outside `/tmp`, and `/tmp` itself isn't guaranteed
  to persist between invocations or be shared across concurrent function
  instances. A SQLite file written during one request has no guarantee of
  being there for the next request. Since the brief explicitly requires the
  *deployed* app to be usable end to end (create a catalog, build a quote,
  open a shareable URL), a demo that only works locally didn't seem good
  enough. The tradeoff is a slightly heavier local setup (you need a
  Postgres instance, via the included Docker Compose file or a free Neon
  project) in exchange for the deployed app actually working reliably.
- **Drizzle ORM instead of Prisma.** I initially reached for Prisma, but
  its CLI needs to download platform-specific query-engine binaries from
  `binaries.prisma.sh` at install time, and that domain wasn't reachable in
  my sandboxed dev environment. Drizzle is a thinner, pure-JS/TS layer over
  the `postgres` driver with no binary download step, and it worked
  cleanly, so I kept it rather than fighting the network restriction. It's
  also a perfectly normal, production-grade choice on its own merits.
- **Server Actions instead of a separate REST API layer.** Next.js Server
  Actions let the catalog forms and the quote builder call server-side
  mutation functions directly, without hand-writing API routes and fetch
  wrappers for a tool that has no external API consumers. This kept the
  codebase smaller for a tool this size.
- **A ledger/invoice-style visual design** (hairline borders, monospaced
  figures, a formula column on every line item) rather than a generic
  dashboard look. The brief's core ask, "the math has to be right and
  visible," pointed directly at an invoice/ledger aesthetic, so the quote
  view is built to read like a well-formatted itemized receipt rather than
  a summary card with a big total.
- **Inline "Save" per feature-tier cell** in the catalog matrix, rather
  than one big form submit for the whole grid. A client with a handful of
  tiers and a dozen features has a fairly large grid; saving cell by cell
  means a mistake in one cell doesn't risk losing edits to the others, and
  it matches how someone would actually work through the sheet.

## Questions I would have asked

- Does the 15%/25% term discount ever need to vary by client or by
  product, or is "standard across all clients" a permanent rule? I built it
  as a fixed constant per the brief, but a pricing consultancy might
  eventually want to override it per engagement.
- For percent-of-product add-ons: percentage of the *discounted* base price
  the customer is actually paying, or of the tier's undiscounted list
  price? I went with the discounted amount (see Assumptions above) but this
  is exactly the kind of ambiguity I'd rather confirm with a client-facing
  team than guess at.
- Should a quote lock in a snapshot of the catalog's pricing at creation
  time, or always reflect the latest catalog values? Right now, a quote
  looks up the live tier price and add-on settings by ID whenever it's
  viewed. If a client's Growth tier price changes after a quote was sent,
  today's implementation would show the new price on old quotes, which
  could be wrong for a document meant to represent what was actually
  proposed at the time.
- Is there ever a need for more than one discount, or discounts that stack
  (e.g. a volume discount and a promotional discount shown as separate line
  items)?

## What I'd build next

- **Snapshot pricing on quotes.** Per the question above, I'd store a copy
  of the price and formula inputs on the quote at save time instead of
  recomputing from the live catalog, so a quote is a permanent record of
  what was actually proposed.
- **Validation and inline warnings on the catalog matrix**, right now an
  add-on with no price set just won't be selectable in the quote builder,
  but there's no warning in the catalog UI itself that a cell is
  incomplete.
- **A proper "duplicate quote" flow** instead of only "create new," so an
  analyst iterating on a proposal for the same customer doesn't have to
  re-enter everything.
- **Search/filter on the quotes list** once there are more than a handful
  of saved quotes.
- **Currency and tax fields**, even if hardcoded to USD/no-tax for now,
  structured so they're easy to extend later. The brief explicitly scoped
  these out, but it's the most likely next ask from a real client.
