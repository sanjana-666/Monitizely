import { test, expect } from "@playwright/test";

// This walks the full happy path required by the brief:
// create a catalog entry -> build a quote -> view the saved, shareable quote.
// Each run uses a timestamp-suffixed name so the test is repeatable against
// a database that already has data in it from a previous run.

test("create catalog entry, build a quote, and view the saved quote", async ({ page }) => {
  const stamp = Date.now();
  const productName = `E2E Test Product ${stamp}`;
  const quoteName = `E2E Test Quote ${stamp}`;
  const customerName = "E2E Test Customer";

  // 1. Create a product.
  await page.goto("/catalog");
  await page.getByPlaceholder("e.g. Analytics Suite").fill(productName);
  await page.getByRole("button", { name: "Create product" }).click();

  // We land on the new product's detail page.
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  // 2. Add a tier.
  await page.getByPlaceholder("e.g. Starter").fill("Growth");
  await page.getByPlaceholder("e.g. 25").fill("50");
  await page.getByRole("button", { name: "Add tier" }).click();
  await expect(page.getByText("$50.00")).toBeVisible();

  // 3. Add a feature.
  await page.getByPlaceholder("e.g. Single Sign-On (SSO)").fill("Single Sign-On (SSO)");
  await page.getByRole("button", { name: "Add feature" }).click();
  await expect(page.getByText("Single Sign-On (SSO)")).toBeVisible();

  // 4. Configure the feature as a fixed-price add-on on the Growth tier.
  const statusSelect = page.locator("select").first();
  await statusSelect.selectOption("addon");
  const priceInput = page.locator('input[type="number"]').first();
  await priceInput.fill("200");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  // 5. Build a quote against that product.
  await page.goto("/quotes/new");
  await page.getByPlaceholder("e.g. Acme Corp - Q3 2026 proposal").fill(quoteName);
  await page.getByPlaceholder("e.g. Acme Corporation").fill(customerName);

  await page.locator("select").first().selectOption({ label: productName });
  // Seats
  const seatsInput = page.locator('input[type="number"]').first();
  await seatsInput.fill("10");

  // Select the SSO add-on checkbox.
  await page.getByText("Single Sign-On (SSO)").locator("..").locator('input[type="checkbox"]').check();

  await page.getByRole("button", { name: "Save quote" }).click();

  // 6. We should land on the read-only quote view with the correct total.
  await expect(page).toHaveURL(/\/quotes\/[a-zA-Z0-9_-]+$/);
  await expect(page.getByRole("heading", { name: quoteName })).toBeVisible();
  await expect(page.getByText(customerName)).toBeVisible();
  // 10 seats * $50/seat/mo * 1 month (monthly term, no discount) = $500
  // + $200 fixed SSO add-on for 1 month = $200
  // total = $700
  await expect(page.getByText("$700.00")).toBeVisible();
});
