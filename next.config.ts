import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, a stray lockfile in a
  // parent directory can make Next infer the wrong root, which also throws off
  // the output-file-tracing globs below.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  // The DB layer runs Drizzle migrations at runtime from ./db/migrations via a
  // path built with process.cwd() (see db/client.ts). That dynamic read is
  // invisible to Next's file tracer, so on Vercel those SQL/JSON files would be
  // omitted from the serverless bundle and ensureMigrated() would crash. Force
  // them into every route's trace.
  outputFileTracingIncludes: {
    "/**": ["./db/migrations/**/*"],
  },
};

export default nextConfig;
