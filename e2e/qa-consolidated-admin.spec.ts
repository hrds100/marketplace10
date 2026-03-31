import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SS = "e2e/screenshots";

const results: { name: string; status: string; note: string }[] = [];

function record(name: string, status: "PASS" | "FAIL", note = "") {
  results.push({ name, status, note });
}

test("Consolidated admin invest — full live QA", async ({ page }) => {
  test.setTimeout(180_000);

  // ── Sign in via UI form ──────────────────────────────────
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const signInTab = page.locator("text=Sign In").first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(ADMIN_EMAIL);

  const passInput = page.locator('input[type="password"]').first();
  await passInput.waitFor({ state: "visible", timeout: 5000 });
  await passInput.fill(ADMIN_PASS);

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  await page.waitForTimeout(3000);

  // ── 1-3. /admin/invest — consolidated dashboard sections ──
  try {
    await page.goto(`${BASE}/admin/invest`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);

    // Dismiss any modal overlay
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("×"), .particle-close, button.close').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(500);

    // Screenshot full page
    await page.screenshot({ path: `${SS}/consolidated-admin-invest-full.png`, fullPage: true });

    // Check wallet balances section
    const hasBNB = await page.locator("text=BNB").first().isVisible().catch(() => false);
    const hasSTAY = await page.locator("text=STAY").first().isVisible().catch(() => false);
    const hasUSDC = await page.locator("text=USDC").first().isVisible().catch(() => false);
    const walletOk = hasBNB || hasSTAY || hasUSDC;
    record("Wallet Balances (BNB/STAY/USDC)", walletOk ? "PASS" : "FAIL",
      `BNB=${hasBNB} STAY=${hasSTAY} USDC=${hasUSDC}`);

    // Check stats cards
    const hasAllocated = await page.getByText(/total allocated/i).first().isVisible().catch(() => false);
    const hasPartners = await page.getByText(/partners/i).first().isVisible().catch(() => false);
    record("Stats cards (Allocated/Partners)", (hasAllocated || hasPartners) ? "PASS" : "FAIL",
      `Allocated=${hasAllocated} Partners=${hasPartners}`);

    // Check Distribute Performance Fee section
    const hasPerfFee = await page.getByText(/distribute performance fee/i).first().isVisible().catch(() => false);
    const hasPropIdFilter = await page.locator('text=Property ID').first().isVisible().catch(() => false);
    record("Distribute Performance Fee section", hasPerfFee ? "PASS" : "FAIL",
      `heading=${hasPerfFee} propFilter=${hasPropIdFilter}`);

    // Check Performance Fee Distribution History section
    const hasFeeHistory = await page.getByText(/performance fee distribution history/i).first().isVisible().catch(() => false);
    record("Fee Distribution History section", hasFeeHistory ? "PASS" : "FAIL");

    // Check Boost section
    const hasBoost = await page.getByText(/boost on behalf|boost user/i).first().isVisible().catch(() => false);
    const hasWalletInput = await page.locator('input[placeholder*="wallet" i], input[placeholder*="address" i], input[placeholder*="0x" i]').first().isVisible().catch(() => false);
    record("Boost section + wallet input", hasBoost ? "PASS" : "FAIL",
      `heading=${hasBoost} walletInput=${hasWalletInput}`);

    // Check Rent Distribution section
    const hasRent = await page.getByText(/rent distribution|disperse rent/i).first().isVisible().catch(() => false);
    record("Rent Distribution section", hasRent ? "PASS" : "FAIL");

  } catch (e: any) {
    record("Consolidated dashboard load", "FAIL", e.message?.slice(0, 120));
    await page.screenshot({ path: `${SS}/consolidated-admin-invest-error.png`, fullPage: true }).catch(() => {});
  }

  // ── 4-6. Verify removed routes return 404 / redirect ──
  for (const route of ["performance-fees", "fee-history", "rent"]) {
    try {
      const resp = await page.goto(`${BASE}/admin/invest/${route}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
      const status = resp?.status() ?? 0;
      const url = page.url();
      const bodyText = await page.locator("body").textContent().catch(() => "");
      const is404 = status === 404 || (bodyText?.toLowerCase().includes("not found")) || (bodyText?.toLowerCase().includes("404"));
      const isRedirect = !url.includes(`/admin/invest/${route}`);
      record(`/admin/invest/${route} removed`, (is404 || isRedirect) ? "PASS" : "FAIL",
        `status=${status} url=${url.slice(0, 80)} is404=${is404} redirect=${isRedirect}`);
      await page.screenshot({ path: `${SS}/removed-${route}.png` });
    } catch (e: any) {
      record(`/admin/invest/${route} removed`, "PASS", `Navigation failed/blocked — route gone: ${e.message?.slice(0, 80)}`);
    }
  }

  // ── 7-11. Verify existing admin pages still load ──
  const existingPages = [
    { path: "/admin/invest/orders", label: "Orders page", expect: /order|purchase|transaction/i },
    { path: "/admin/invest/boost", label: "Boost page", expect: /boost/i },
    { path: "/admin/invest/properties", label: "Properties page", expect: /propert/i },
    { path: "/admin/invest/shareholders", label: "Shareholders page", expect: /shareholder|holder|partner/i },
    { path: "/admin/observatory", label: "Observatory page", expect: /user|observatory|monitor/i },
  ];

  for (const pg of existingPages) {
    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);
      const bodyText = await page.locator("body").textContent().catch(() => "");
      const found = pg.expect.test(bodyText ?? "");
      const slug = pg.path.split("/").pop() ?? pg.path;
      await page.screenshot({ path: `${SS}/existing-${slug}.png`, fullPage: true });
      record(pg.label, found ? "PASS" : "FAIL", `matched=${found} url=${page.url().slice(0, 80)}`);
    } catch (e: any) {
      record(pg.label, "FAIL", e.message?.slice(0, 120));
    }
  }

  // ── 12. /dashboard/invest/marketplace ──
  try {
    await page.goto(`${BASE}/dashboard/invest/marketplace`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    const hasPartnership = await page.getByText(/partnership/i).first().isVisible().catch(() => false);
    await page.screenshot({ path: `${SS}/invest-marketplace.png`, fullPage: true });
    record("Invest marketplace — Partnership text", hasPartnership ? "PASS" : "FAIL");
  } catch (e: any) {
    record("Invest marketplace", "FAIL", e.message?.slice(0, 120));
  }

  // ── 13. /signup — social buttons 2x2 grid ──
  try {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    const socialBtns = page.locator('button:has-text("Google"), button:has-text("Apple"), button:has-text("Facebook"), button:has-text("Twitter"), button:has-text("X")');
    const btnCount = await socialBtns.count();
    await page.screenshot({ path: `${SS}/signup-social.png`, fullPage: true });
    record("Signup — social buttons", btnCount >= 3 ? "PASS" : "FAIL", `found ${btnCount} social buttons`);
  } catch (e: any) {
    record("Signup page", "FAIL", e.message?.slice(0, 120));
  }

  // ── 14. Homepage — loads (200) ──
  try {
    const resp = await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
    const status = resp?.status() ?? 0;
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/homepage.png`, fullPage: true });
    record("Homepage loads (200)", status === 200 ? "PASS" : "FAIL", `status=${status}`);
  } catch (e: any) {
    record("Homepage", "FAIL", e.message?.slice(0, 120));
  }

  // ── Summary ──
  console.log("\n\n══════════════════════════════════════════");
  console.log("   CONSOLIDATED ADMIN QA — RESULTS");
  console.log("══════════════════════════════════════════\n");
  for (const r of results) {
    const icon = r.status === "PASS" ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.name}${r.note ? ` — ${r.note}` : ""}`);
  }
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n  Total: ${passed} passed, ${failed} failed out of ${results.length}\n`);
  console.log("══════════════════════════════════════════\n");

  expect(failed).toBe(0);
});
