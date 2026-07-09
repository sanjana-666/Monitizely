import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
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
