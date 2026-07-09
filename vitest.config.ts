import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", "e2e/**"],
  },
});
