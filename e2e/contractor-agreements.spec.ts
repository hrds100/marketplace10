import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://hub.nfstay.com";
const ADMIN_CONTRACTS_URL = `${BASE}/admin/marketplace/contracts`;

test.describe("Contractor Agreements — admin + public signing", () => {
  test("1 — admin contracts page loads with tabs", async ({ page }) => {
    // Sign in as admin first
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "admin@hub.nfstay.com");
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto(ADMIN_CONTRACTS_URL, { waitUntil: "networkidle" });

    // Page heading
    await expect(page.getByRole("heading", { name: "Contracts" })).toBeVisible({ timeout: 15000 });

    // Tabs visible
    await expect(page.getByRole("tab", { name: /Contracts/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Templates/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /My Signature/ })).toBeVisible();

    // Send Contract button
    await expect(page.getByRole("button", { name: /Send Contract/ })).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/admin-contracts-01-loaded.png" });
  });

  test("2 — templates tab shows empty state and new button", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "admin@hub.nfstay.com");
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto(ADMIN_CONTRACTS_URL, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Templates/ }).click();

    await expect(page.getByRole("button", { name: /New Template/ })).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "e2e/screenshots/admin-contracts-02-templates.png" });
  });

  test("3 — signature tab shows draw area", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "admin@hub.nfstay.com");
    await page.fill('input[type="password"]', "Test1234!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto(ADMIN_CONTRACTS_URL, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /My Signature/ }).click();

    await expect(page.getByText("Your Signature")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Draw your signature above")).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/admin-contracts-03-signature.png" });
  });

  test("4 — contract sign page shows error for invalid token", async ({ page }) => {
    await page.goto(`${BASE}/contract/nonexistent-token-xyz`, { waitUntil: "networkidle" });

    await expect(page.getByText("Contract not found")).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "e2e/screenshots/contract-sign-04-notfound.png" });
  });
});
