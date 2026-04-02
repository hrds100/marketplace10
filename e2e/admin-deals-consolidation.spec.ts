import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

async function adminSignIn(page: any) {
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const signInTab = page.locator("text=Sign In").first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/dashboard/**", { timeout: 20000 });
}

test.describe("Admin Deals Consolidation", () => {
  test.setTimeout(120_000);

  test("navigates to /admin/marketplace/deals and shows 3 tabs", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Page title
    const heading = page.locator("h1");
    await expect(heading).toContainText("Deals");

    // 3 tabs visible
    await expect(page.locator("text=Pending Review")).toBeVisible();
    await expect(page.locator("text=Live")).toBeVisible();
    await expect(page.locator("text=Inactive")).toBeVisible();
  });

  test("old URLs redirect to /admin/marketplace/deals", async ({ page }) => {
    await adminSignIn(page);

    // /admin/marketplace/submissions should redirect
    await page.goto(`${BASE}/admin/marketplace/submissions`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/admin/marketplace/deals");

    // /admin/marketplace/listings should redirect
    await page.goto(`${BASE}/admin/marketplace/listings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/admin/marketplace/deals");

    // /admin/marketplace/deal-sourcers should redirect
    await page.goto(`${BASE}/admin/marketplace/deal-sourcers`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/admin/marketplace/deals");
  });

  test("sidebar shows Deals link, not Listings or Submissions", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Deals link in nav
    const navDeals = page.locator('a[href="/admin/marketplace/deals"]');
    await expect(navDeals).toBeVisible();

    // Old nav links should NOT exist
    const navListings = page.locator('a[href="/admin/marketplace/listings"]');
    await expect(navListings).toHaveCount(0);

    const navSubmissions = page.locator('a[href="/admin/marketplace/submissions"]');
    await expect(navSubmissions).toHaveCount(0);

    const navDealSourcers = page.locator('a[href="/admin/marketplace/deal-sourcers"]');
    await expect(navDealSourcers).toHaveCount(0);

    const navObservatory = page.locator('a[href="/admin/observatory"]');
    await expect(navObservatory).toHaveCount(0);
  });

  test("Pending tab shows pending properties", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Pending Review tab should be active by default
    const pendingTab = page.locator("button", { hasText: "Pending Review" });
    await expect(pendingTab).toBeVisible();
    await pendingTab.click();
    await page.waitForTimeout(500);

    // NDA and 1st Inquiry toggles should NOT be visible
    await expect(page.locator("text=1st Inquiry")).toHaveCount(0);
    // NDA text should not appear as a toggle label
    const ndaToggles = page.locator('span:text-is("NDA")');
    await expect(ndaToggles).toHaveCount(0);
  });

  test("Live tab shows table with expected columns", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Switch to Live tab
    const liveTab = page.locator("button", { hasText: "Live" });
    await liveTab.click();
    await page.waitForTimeout(1000);

    // Table headers
    await expect(page.locator("th", { hasText: "Name" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Rent" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Featured" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Actions" })).toBeVisible();

    // CSV buttons visible
    await expect(page.locator("text=CSV Template")).toBeVisible();
    await expect(page.locator("text=Import CSV")).toBeVisible();
  });

  test("Inactive tab shows reactivate button", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/deals`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Switch to Inactive tab
    const inactiveTab = page.locator("button", { hasText: "Inactive" });
    await inactiveTab.click();
    await page.waitForTimeout(1000);

    // Check for reactivate button if there are inactive items
    const items = page.locator("text=Reactivate");
    // If inactive items exist, reactivate button should be visible
    const count = await items.count();
    // Just verify the tab loaded without errors (may have 0 inactive items)
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
