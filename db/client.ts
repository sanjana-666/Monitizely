import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";
import path from "path";
import dns from "dns";
import net from "net";

// Neon's hostname resolves to both IPv4 (A) and IPv6 (AAAA) records, but many
// environments (local dev boxes, some CI/hosts) have no working IPv6 route.
// Node's "Happy Eyeballs" (autoSelectFamily) races the IPv6 address on every
// new connection and intermittently loses, surfacing as a flaky ETIMEDOUT that
// Drizzle reports as "Failed query ...". Force IPv4-first resolution and skip
// the IPv6 race so we always connect over the reachable route. Neon always
// publishes IPv4 records, so this is safe in production too.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

// Postgres is used for both local development and production. See
// README.md ("Database setup") for how to run a local Postgres with Docker,
// or point DATABASE_URL at a hosted instance (Neon, Vercel Postgres, etc).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres instance. See README.md for local Docker setup."
  );
}

declare global {
  var __pgClient: ReturnType<typeof postgres> | undefined;
  var __migrated: boolean | undefined;
  var __migrating: Promise<void> | undefined;
}

// Serverless Postgres providers (Neon, Vercel Postgres, etc.) suspend the
// compute when idle and cold-start it on the next connection. That first
// connection can take several seconds, so give it a generous connect timeout
// instead of letting the OS socket time out with ETIMEDOUT.
const client =
  global.__pgClient ||
  postgres(connectionString, {
    max: 5,
    connect_timeout: 30, // seconds — allow time for a suspended compute to wake
  });
if (process.env.NODE_ENV !== "production") {
  global.__pgClient = client;
}

export const db = drizzle(client, { schema });

// Transient connection failures we expect while a serverless compute wakes up.
const TRANSIENT_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "CONNECT_TIMEOUT",
]);

function isTransient(err: unknown): boolean {
  const codes: string[] = [];
  const collect = (e: unknown) => {
    if (e && typeof e === "object") {
      const code = (e as { code?: unknown }).code;
      if (typeof code === "string") codes.push(code);
      const nested = (e as { errors?: unknown }).errors;
      if (Array.isArray(nested)) nested.forEach(collect);
      // Drizzle wraps the driver error; look at its cause too.
      const cause = (e as { cause?: unknown }).cause;
      if (cause) collect(cause);
    }
  };
  collect(err);
  return codes.some((c) => TRANSIENT_CODES.has(c));
}

// Retry an operation that only fails because a suspended serverless compute is
// still waking up (ETIMEDOUT/ECONNRESET/etc. at connect time). Such failures
// happen before any statement executes, so retrying is safe even for writes.
// Non-transient errors (bad SQL, constraint violations) are rethrown at once.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === 4) throw err;
      // Back off (1s, 2s, 4s) to give the compute time to finish waking.
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastErr;
}

async function runMigrations() {
  const migrationsFolder = path.join(process.cwd(), "db", "migrations");
  await withRetry(() => migrate(db, { migrationsFolder }));
}

// Run any pending migrations automatically on startup. This keeps both the
// local dev experience and the deployed demo working with zero manual
// migration steps. Concurrent callers share a single in-flight run so we never
// launch migrate() more than once per process.
export async function ensureMigrated() {
  if (global.__migrated) return;
  if (!global.__migrating) {
    global.__migrating = runMigrations()
      .then(() => {
        global.__migrated = true;
      })
      .finally(() => {
        global.__migrating = undefined;
      });
  }
  await global.__migrating;
}
