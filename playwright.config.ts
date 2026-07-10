import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The dev server compiles each route on first visit (e.g. /quotes/new can
  // take ~14s cold), so a run of the full happy path — which touches four
  // routes — needs generous headroom over the default 30s.
  timeout: 90_000,
  // Individual assertions must also tolerate a route compiling on first hit,
  // otherwise the default 5s expires while the page is still building.
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3312",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3312",
    url: "http://localhost:3312",
    reuseExistingServer: !process.env.CI,
    env: {
      SQLITE_PATH: "./data/e2e-test.db",
    },
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
