import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://monetizely:monetizely@localhost:5432/monetizely",
  },
} satisfies Config;
