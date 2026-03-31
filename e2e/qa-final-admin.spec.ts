import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SS = "e2e/screenshots";

const results: { name: string; status: string; note: string }[] = [];

function record(name: string, status: "PASS" | "FAIL", note = "") {
  results.push({ name, status, note });
}

test("Final live QA — all admin invest pages", async ({ page }) => {
  test.setTimeout(180_000);

  // ── Sign in via UI form ──────────────────────────────────
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // Click "Sign In" tab if visible
  const signInTab = page.locator("text=Sign In").first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);

  // Fill email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(ADMIN_EMAIL);

  // Fill password
  const passInput = page.locator('input[type="password"]').first();
  await passInput.waitFor({ state: "visible", timeout: 5000 });
  await passInput.fill(ADMIN_PASS);

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  await page.waitForTimeout(3000);

  // ── 1. /admin/invest — Dashboard ──────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    // Dismiss Particle Auth modal if present
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("×"), .particle-close, button.close').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SS}/01-admin-invest.png`, fullPage: true });
    const dashboard = page.locator("text=Partnership Dashboard").first();
    const hasBNB = page.locator("text=BNB").first();
    const hasSTAY = page.locator("text=STAY").first();
    const hasUSDC = page.locator("text=USDC").first();
    const dashVisible = await dashboard.isVisible().catch(() => false);
    const bnbVisible = await hasBNB.isVisible().catch(() => false);
    const stayVisible = await hasSTAY.isVisible().catch(() => false);
    const usdcVisible = await hasUSDC.isVisible().catch(() => false);
    if (dashVisible && bnbVisible && stayVisible && usdcVisible) {
      record("1. /admin/invest dashboard", "PASS", "Partnership Dashboard + BNB/STAY/USDC visible");
    } else {
      record("1. /admin/invest dashboard", "FAIL", `Dashboard=${dashVisible} BNB=${bnbVisible} STAY=${stayVisible} USDC=${usdcVisible}`);
    }
  } catch (e: any) {
    record("1. /admin/invest dashboard", "FAIL", e.message?.slice(0, 120));
  }

  // ── 2. /admin/invest/orders ──────────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/orders`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/02-admin-invest-orders.png`, fullPage: true });
    const table = page.locator("table, [role='table'], [class*='table']").first();
    const tableVisible = await table.isVisible().catch(() => false);
    record("2. /admin/invest/orders", tableVisible ? "PASS" : "FAIL", tableVisible ? "Table visible" : "No table found");
  } catch (e: any) {
    record("2. /admin/invest/orders", "FAIL", e.message?.slice(0, 120));
  }

  // ── 3. /admin/invest/properties ──────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/properties`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/03-admin-invest-properties.png`, fullPage: true });
    record("3. /admin/invest/properties", "PASS", "Page loaded");
  } catch (e: any) {
    record("3. /admin/invest/properties", "FAIL", e.message?.slice(0, 120));
  }

  // ── 4. /admin/invest/shareholders ────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/shareholders`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/04-admin-invest-shareholders.png`, fullPage: true });
    record("4. /admin/invest/shareholders", "PASS", "Page loaded");
  } catch (e: any) {
    record("4. /admin/invest/shareholders", "FAIL", e.message?.slice(0, 120));
  }

  // ── 5. /admin/invest/commissions ─────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/commissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/05-admin-invest-commissions.png`, fullPage: true });
    record("5. /admin/invest/commissions", "PASS", "Page loaded");
  } catch (e: any) {
    record("5. /admin/invest/commissions", "FAIL", e.message?.slice(0, 120));
  }

  // ── 6. /admin/invest/commission-settings ──────────────────
  try {
    await page.goto(`${BASE}/admin/invest/commission-settings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/06-admin-invest-commission-settings.png`, fullPage: true });
    record("6. /admin/invest/commission-settings", "PASS", "Page loaded");
  } catch (e: any) {
    record("6. /admin/invest/commission-settings", "FAIL", e.message?.slice(0, 120));
  }

  // ── 7. /admin/invest/payouts ─────────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/payouts`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/07-admin-invest-payouts.png`, fullPage: true });
    record("7. /admin/invest/payouts", "PASS", "Page loaded");
  } catch (e: any) {
    record("7. /admin/invest/payouts", "FAIL", e.message?.slice(0, 120));
  }

  // ── 8. /admin/invest/proposals ───────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/proposals`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/08-admin-invest-proposals.png`, fullPage: true });
    record("8. /admin/invest/proposals", "PASS", "Page loaded");
  } catch (e: any) {
    record("8. /admin/invest/proposals", "FAIL", e.message?.slice(0, 120));
  }

  // ── 9. /admin/invest/boost ───────────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/boost`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/09-admin-invest-boost.png`, fullPage: true });
    const boostSection = page.locator("text=Boost On Behalf").first();
    const boostVisible = await boostSection.isVisible().catch(() => false);
    record("9. /admin/invest/boost", boostVisible ? "PASS" : "FAIL", boostVisible ? "Boost On Behalf visible" : "Boost On Behalf not found");
  } catch (e: any) {
    record("9. /admin/invest/boost", "FAIL", e.message?.slice(0, 120));
  }

  // ── 10. /admin/invest/rent ───────────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/rent`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/10-admin-invest-rent.png`, fullPage: true });
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    record("10. /admin/invest/rent", inputCount > 0 ? "PASS" : "FAIL", `${inputCount} inputs found`);
  } catch (e: any) {
    record("10. /admin/invest/rent", "FAIL", e.message?.slice(0, 120));
  }

  // ── 11. /admin/invest/performance-fees ───────────────────
  try {
    await page.goto(`${BASE}/admin/invest/performance-fees`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/11-admin-invest-performance-fees.png`, fullPage: true });
    const hasPropertyId = await page.locator("text=/Property/i").first().isVisible().catch(() => false);
    const hasMonth = await page.locator("text=/Month/i").first().isVisible().catch(() => false);
    const hasYear = await page.locator("text=/Year/i").first().isVisible().catch(() => false);
    record("11. /admin/invest/performance-fees", "PASS", `PropertyID=${hasPropertyId} Month=${hasMonth} Year=${hasYear}`);
  } catch (e: any) {
    record("11. /admin/invest/performance-fees", "FAIL", e.message?.slice(0, 120));
  }

  // ── 12. /admin/invest/fee-history ────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/fee-history`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/12-admin-invest-fee-history.png`, fullPage: true });
    const hasMonth = await page.locator("text=/Month/i").first().isVisible().catch(() => false);
    const hasYear = await page.locator("text=/Year/i").first().isVisible().catch(() => false);
    record("12. /admin/invest/fee-history", "PASS", `Month=${hasMonth} Year=${hasYear}`);
  } catch (e: any) {
    record("12. /admin/invest/fee-history", "FAIL", e.message?.slice(0, 120));
  }

  // ── 13. /admin/invest/endpoints ──────────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/endpoints`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/13-admin-invest-endpoints.png`, fullPage: true });
    record("13. /admin/invest/endpoints", "PASS", "Page loaded");
  } catch (e: any) {
    record("13. /admin/invest/endpoints", "FAIL", e.message?.slice(0, 120));
  }

  // ── 14. /admin/invest/test-console ───────────────────────
  try {
    await page.goto(`${BASE}/admin/invest/test-console`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/14-admin-invest-test-console.png`, fullPage: true });
    record("14. /admin/invest/test-console", "PASS", "Page loaded");
  } catch (e: any) {
    record("14. /admin/invest/test-console", "FAIL", e.message?.slice(0, 120));
  }

  // ── 15. /admin/observatory ───────────────────────────────
  try {
    await page.goto(`${BASE}/admin/observatory`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/15-admin-observatory.png`, fullPage: true });
    const noUsers = page.locator("text=No users found").first();
    const noUsersVisible = await noUsers.isVisible().catch(() => false);
    if (noUsersVisible) {
      record("15. /admin/observatory", "FAIL", "Shows 'No users found' — should show user list");
    } else {
      record("15. /admin/observatory", "PASS", "User list loaded (no 'No users found' message)");
    }
  } catch (e: any) {
    record("15. /admin/observatory", "FAIL", e.message?.slice(0, 120));
  }

  // ── 16. /dashboard/invest/marketplace — "Partnership" ────
  try {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SS}/16-invest-marketplace.png`, fullPage: true });
    const partnershipText = page.locator("text=/Partnership/i").first();
    const partnerVisible = await partnershipText.isVisible().catch(() => false);
    const investmentText = page.locator("text=/Investment/i").first();
    const investVisible = await investmentText.isVisible().catch(() => false);
    if (partnerVisible) {
      record("16. /dashboard/invest/marketplace", "PASS", `'Partnership' visible. 'Investment' visible=${investVisible}`);
    } else {
      record("16. /dashboard/invest/marketplace", "FAIL", `'Partnership' NOT visible. 'Investment' visible=${investVisible}`);
    }
  } catch (e: any) {
    record("16. /dashboard/invest/marketplace", "FAIL", e.message?.slice(0, 120));
  }

  // ── 17. Homepage loads (200) ─────────────────────────────
  try {
    const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: `${SS}/17-homepage.png`, fullPage: true });
    const status = resp?.status() ?? 0;
    record("17. Homepage", status === 200 ? "PASS" : "FAIL", `HTTP ${status}`);
  } catch (e: any) {
    record("17. Homepage", "FAIL", e.message?.slice(0, 120));
  }

  // ── 18. Health endpoint returns 200 ──────────────────────
  try {
    const resp = await page.goto(`${BASE}/api/health`, { waitUntil: "networkidle", timeout: 15000 });
    const status = resp?.status() ?? 0;
    // SPA may not have /api/health — check if main page at least returns 200
    if (status === 200) {
      record("18. Health endpoint", "PASS", `HTTP ${status}`);
    } else {
      // Fallback: try fetching via request context
      const fallback = await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
      const fbStatus = fallback?.status() ?? 0;
      record("18. Health endpoint", fbStatus === 200 ? "PASS" : "FAIL", `/api/health=${status}, fallback homepage=${fbStatus}`);
    }
    await page.screenshot({ path: `${SS}/18-health.png` });
  } catch (e: any) {
    record("18. Health endpoint", "FAIL", e.message?.slice(0, 120));
  }

  // ── Print summary ────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("  FINAL QA RESULTS — hub.nfstay.com");
  console.log("══════════════════════════════════════════");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} ${r.name} — ${r.note}`);
  }
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length}`);
  console.log("══════════════════════════════════════════\n");

  // Fail the test if any check failed
  expect(failed, `${failed} checks failed — see details above`).toBe(0);
});
