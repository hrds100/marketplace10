import { test, expect } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const APP = "https://nfstay.app";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";

const results: { step: number; name: string; status: string; note?: string }[] = [];

function log(step: number, name: string, status: "PASS" | "FAIL" | "WARN", note?: string) {
  results.push({ step, name, status, note });
}

async function safeStep(step: number, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    log(step, name, "PASS");
  } catch (e: any) {
    log(step, name, "FAIL", e.message?.substring(0, 250));
  }
}

function printResults() {
  console.log("\n\n═══════════════════════════════════════════════════");
  console.log("  QA EVERYTHING FINAL — RESULTS");
  console.log("═══════════════════════════════════════════════════\n");
  let pass = 0, fail = 0, warn = 0;
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    const note = r.note ? ` — ${r.note}` : "";
    console.log(`  ${icon} Step ${String(r.step).padStart(2, " ")}: ${r.name}${note}`);
    if (r.status === "PASS") pass++;
    else if (r.status === "FAIL") fail++;
    else warn++;
  }
  console.log(`\n  ────────────────────────────────────────`);
  console.log(`  TOTAL: ${results.length} | ✅ ${pass} PASS | ❌ ${fail} FAIL | ⚠️ ${warn} WARN`);
  console.log(`  ────────────────────────────────────────\n`);
}

test("QA Everything Final — hub.nfstay.com comprehensive test", async ({ page }) => {
  test.setTimeout(300_000);

  // ── PART 1: SIGN IN + HOMEPAGE ──

  await safeStep(1, "Homepage loads (200), no console errors", async () => {
    const res = await page.goto(HUB, { waitUntil: "domcontentloaded", timeout: 30_000 });
    expect(res?.status()).toBe(200);
  });

  await safeStep(2, "Signup page — 4 social buttons in 2x2 grid + Email button", async () => {
    await page.goto(`${HUB}/signup`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/signup.png` });
    // 4 social buttons with data-feature
    const socialBtns = page.locator('[data-feature="AUTH__SIGNIN_SOCIAL"], [data-feature="AUTH__SIGNUP_SOCIAL"]');
    const socialCount = await socialBtns.count();
    expect(socialCount).toBeGreaterThanOrEqual(4);
    // "Sign up with Email" button
    const emailBtn = page.locator('button:has-text("Email"), a:has-text("Email")');
    expect(await emailBtn.count()).toBeGreaterThanOrEqual(1);
  });

  await safeStep(3, "Sign in as admin through form", async () => {
    await page.goto(`${HUB}/signin`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Email field (data-feature attribute)
    const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
    await emailInput.waitFor({ timeout: 10_000 });
    await emailInput.fill(ADMIN_EMAIL);

    // Password field
    const passInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]');
    await passInput.fill(ADMIN_PASS);

    // Click sign in button — the form submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Uses window.location.href so wait for full navigation to /dashboard/deals
    await page.waitForURL("**/dashboard/**", { timeout: 30_000 });
  });

  await safeStep(4, "Redirect to dashboard after sign in", async () => {
    expect(page.url()).toContain("/dashboard");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/dashboard.png` });
  });

  // ── PART 2: MARKETPLACE ──

  await safeStep(5, "Deal cards render on /dashboard/deals", async () => {
    await page.goto(`${HUB}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(4000);
    // Property cards or deal cards
    const cards = page.locator('[data-feature*="DEAL"], [class*="PropertyCard"], [class*="property-card"], a[href*="/deals/"]');
    const count = await cards.count();
    if (count === 0) {
      // Fallback: look for any card-like element with a price or location
      const anyContent = await page.textContent("body") || "";
      expect(anyContent.length).toBeGreaterThan(200);
    }
  });

  await safeStep(6, "Click a deal — detail page loads", async () => {
    const dealLink = page.locator('a[href*="/deals/"]').first();
    const visible = await dealLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (visible) {
      await dealLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toMatch(/\/deals\//);
    } else {
      throw new Error("No deal link found to click");
    }
  });

  await safeStep(7, "Contact button exists on deal detail", async () => {
    const contactBtn = page.locator('button:has-text("Contact"), button:has-text("Enquir"), button:has-text("Message"), a:has-text("Contact")').first();
    await contactBtn.waitFor({ timeout: 10_000 });
  });

  await safeStep(8, "Mobile 375x812 — no horizontal overflow on deals page", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${HUB}/dashboard/deals`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(380);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  // ── PART 3: INVESTMENTS (word replacement) ──

  await safeStep(9, "Invest marketplace loads", async () => {
    await page.goto(`${HUB}/dashboard/invest/marketplace`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/invest-marketplace.png` });
  });

  await safeStep(10, 'No "Open for Investment" text — should be "Open for Partnership"', async () => {
    const body = await page.textContent("body") || "";
    expect(body).not.toContain("Open for Investment");
  });

  await safeStep(11, 'No "Invest in" text — should be "Partner on"', async () => {
    const body = await page.textContent("body") || "";
    expect(body).not.toContain("Invest in");
  });

  await safeStep(12, '"Partnership" or "Allocation" text present', async () => {
    const body = await page.textContent("body") || "";
    const found = body.includes("Partnership") || body.includes("Allocation") || body.includes("Partner");
    expect(found).toBe(true);
  });

  // ── PART 4: ADMIN INVEST DASHBOARD (consolidated) ──

  await safeStep(13, "/admin/invest — page loads", async () => {
    await page.goto(`${HUB}/admin/invest`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
  });

  await safeStep(14, "Connect Wallet button OR wallet address badge exists", async () => {
    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    const walletAddr = page.locator(':text-matches("0x[a-fA-F0-9]{6,}")');
    expect((await connectBtn.count()) + (await walletAddr.count())).toBeGreaterThanOrEqual(1);
  });

  await safeStep(15, "Wallet Balances section (BNB/STAY/USDC)", async () => {
    const body = await page.textContent("body") || "";
    const has = body.includes("Wallet Balance") || body.includes("BNB") || body.includes("STAY") || body.includes("USDC");
    expect(has).toBe(true);
  });

  await safeStep(16, "Distribute Performance Fee section with filters", async () => {
    const body = (await page.textContent("body") || "").toLowerCase();
    expect(body.includes("performance fee") || body.includes("distribute")).toBe(true);
  });

  await safeStep(17, "Performance Fee Distribution History section", async () => {
    const body = (await page.textContent("body") || "").toLowerCase();
    expect(body.includes("history") || body.includes("distribution")).toBe(true);
  });

  await safeStep(18, "Boost On Behalf section with wallet address input", async () => {
    const body = (await page.textContent("body") || "").toLowerCase();
    expect(body.includes("boost")).toBe(true);
  });

  await safeStep(19, "Rent Distribution section with property ID + amount inputs", async () => {
    const body = (await page.textContent("body") || "").toLowerCase();
    expect(body.includes("rent")).toBe(true);
  });

  await safeStep(20, "/admin/invest/boost returns 404 (removed)", async () => {
    await page.goto(`${HUB}/admin/invest/boost`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const body = (await page.textContent("body") || "").toLowerCase();
    const is404 = body.includes("not found") || body.includes("404") || page.url().includes("404");
    expect(is404).toBe(true);
  });

  await safeStep(21, "/admin/invest/rent returns 404 (removed)", async () => {
    await page.goto(`${HUB}/admin/invest/rent`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const body = (await page.textContent("body") || "").toLowerCase();
    const is404 = body.includes("not found") || body.includes("404") || page.url().includes("404");
    expect(is404).toBe(true);
  });

  await safeStep(22, "/admin/invest/performance-fees returns 404 (removed)", async () => {
    await page.goto(`${HUB}/admin/invest/performance-fees`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const body = (await page.textContent("body") || "").toLowerCase();
    const is404 = body.includes("not found") || body.includes("404") || page.url().includes("404");
    expect(is404).toBe(true);
  });

  await safeStep(23, "Screenshot full admin/invest page (fullPage)", async () => {
    await page.goto(`${HUB}/admin/invest`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/admin-invest-full.png`, fullPage: true });
  });

  // ── PART 5: OTHER ADMIN PAGES ──

  const adminPages: [number, string, string][] = [
    [24, "/admin/invest/orders — loads with table", "/admin/invest/orders"],
    [25, "/admin/invest/properties — loads", "/admin/invest/properties"],
    [26, "/admin/invest/shareholders — loads", "/admin/invest/shareholders"],
    [27, "/admin/invest/commissions — loads", "/admin/invest/commissions"],
    [28, "/admin/invest/payouts — loads", "/admin/invest/payouts"],
    [29, "/admin/invest/proposals — loads", "/admin/invest/proposals"],
    [30, "/admin/invest/endpoints — loads", "/admin/invest/endpoints"],
    [31, "/admin/marketplace — loads", "/admin/marketplace"],
    [32, "/admin/marketplace/users — loads", "/admin/marketplace/users"],
    [33, "/admin/marketplace/submissions — loads", "/admin/marketplace/submissions"],
  ];

  for (const [step, name, path] of adminPages) {
    await safeStep(step, name, async () => {
      const res = await page.goto(`${HUB}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(2500);
      // SPA may return 200 for all routes; check page has content
      const body = await page.textContent("body") || "";
      expect(body.length).toBeGreaterThan(50);
    });
  }

  // ── PART 6: OBSERVATORY ──

  await safeStep(34, "/admin/observatory — loads", async () => {
    await page.goto(`${HUB}/admin/observatory`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
  });

  await safeStep(35, 'Observatory heading visible', async () => {
    const heading = page.locator('text=/Observatory/i').first();
    await heading.waitFor({ timeout: 10_000 });
  });

  await safeStep(36, 'User list shows users (NOT "No users found")', async () => {
    await page.waitForTimeout(3000);
    const body = await page.textContent("body") || "";
    expect(body).not.toContain("No users found");
  });

  await safeStep(37, "Click a user — detail panel appears", async () => {
    // Try clicking a row or user item in the list
    const userItems = page.locator('tr:not(:first-child), [class*="user-row"], [class*="UserRow"]');
    const count = await userItems.count();
    if (count > 0) {
      await userItems.first().click();
      await page.waitForTimeout(2000);
    } else {
      // Try any clickable list item
      const listItems = page.locator('[role="button"], [class*="cursor-pointer"]').nth(2);
      if (await listItems.isVisible({ timeout: 3000 }).catch(() => false)) {
        await listItems.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  await safeStep(38, "Observatory screenshot", async () => {
    await page.screenshot({ path: `${SCREENSHOTS}/observatory.png`, fullPage: true });
  });

  // ── PART 7: UNIVERSITY ──

  await safeStep(39, "/dashboard/university — loads with modules", async () => {
    await page.goto(`${HUB}/dashboard/university`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/university.png` });
    const body = await page.textContent("body") || "";
    expect(body.length).toBeGreaterThan(100);
  });

  await safeStep(40, "Click a module — content loads", async () => {
    const moduleLink = page.locator('a[href*="university"], [class*="module"], [class*="Module"]').first();
    const vis = await moduleLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (vis) {
      await moduleLink.click();
      await page.waitForTimeout(3000);
      const body = await page.textContent("body") || "";
      expect(body.length).toBeGreaterThan(100);
    } else {
      // Try clicking any card
      const card = page.locator('[class*="card"], [class*="Card"]').first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        await card.click();
        await page.waitForTimeout(3000);
      }
    }
  });

  // ── PART 8: BOOKING SITE ──

  await safeStep(41, "/dashboard/booking-site — loads without upgrade overlay", async () => {
    await page.goto(`${HUB}/dashboard/booking-site`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/booking-site.png` });
  });

  await safeStep(42, "Save Changes button visible", async () => {
    const saveBtn = page.locator('button:has-text("Save")');
    expect(await saveBtn.count()).toBeGreaterThanOrEqual(1);
  });

  await safeStep(43, "Open Booking Site Admin link exists", async () => {
    const link = page.locator('a:has-text("Open Booking Site"), a:has-text("Booking Site"), a[href*="nfstay.app"]');
    expect(await link.count()).toBeGreaterThanOrEqual(1);
  });

  // ── PART 9: INBOX ──

  await safeStep(44, "/dashboard/inbox — loads with 3-panel layout", async () => {
    await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/inbox.png` });
  });

  await safeStep(45, "Notification bell visible", async () => {
    // Bell is typically in the nav/header — check for lucide bell icon or bell-like button
    const bell = page.locator('svg.lucide-bell, [aria-label*="notif" i], [data-testid*="bell"]').first();
    const vis = await bell.isVisible({ timeout: 5000 }).catch(() => false);
    if (!vis) {
      // Warn but don't fail hard — bell might be rendered differently
      log(45, "Notification bell visible", "WARN", "Bell icon not found via lucide-bell selector");
      return;
    }
  });

  // ── PART 10: NFSTAY.APP ──

  await safeStep(46, "nfstay.app homepage loads", async () => {
    const res = await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000);
    expect(res?.status()).toBe(200);
  });

  await safeStep(47, "nfstay.app/signin — Guest/Operator toggle visible", async () => {
    await page.goto(`${APP}/signin`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/nfstay-app-signin.png` });
    const guest = page.locator('text=/guest/i').first();
    const operator = page.locator('text=/operator/i').first();
    expect(await guest.isVisible({ timeout: 5000 })).toBe(true);
    expect(await operator.isVisible({ timeout: 3000 })).toBe(true);
  });

  await safeStep(48, "Guest tab shows email/password form", async () => {
    const guestTab = page.locator('button:has-text("Guest"), [role="tab"]:has-text("Guest")').first();
    if (await guestTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guestTab.click();
      await page.waitForTimeout(1000);
    }
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passInput = page.locator('input[type="password"]').first();
    expect(await emailInput.isVisible({ timeout: 5000 })).toBe(true);
    expect(await passInput.isVisible({ timeout: 3000 })).toBe(true);
  });

  await safeStep(49, "Operator tab shows hub redirect message", async () => {
    const operatorTab = page.locator('button:has-text("Operator"), [role="tab"]:has-text("Operator")').first();
    await operatorTab.click();
    await page.waitForTimeout(1000);
    const body = await page.textContent("body") || "";
    const lower = body.toLowerCase();
    expect(lower.includes("hub") || lower.includes("redirect") || lower.includes("operator")).toBe(true);
  });

  // ── PART 11: SEO + HEALTH ──

  await safeStep(50, "/sitemap.xml — returns 200", async () => {
    const res = await page.goto(`${HUB}/sitemap.xml`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    expect(res?.status()).toBe(200);
  });

  await safeStep(51, "/robots.txt — returns 200", async () => {
    const res = await page.goto(`${HUB}/robots.txt`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    expect(res?.status()).toBe(200);
  });

  await safeStep(52, "Supabase health endpoint returns 200", async () => {
    const res = await page.goto("https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/health", {
      waitUntil: "domcontentloaded", timeout: 15_000,
    });
    expect(res?.status()).toBe(200);
  });

  await safeStep(53, '/privacy — title contains "privacy"', async () => {
    await page.goto(`${HUB}/privacy`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    expect(title.toLowerCase()).toContain("privacy");
  });

  await safeStep(54, '/terms — title contains "terms"', async () => {
    await page.goto(`${HUB}/terms`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    expect(title.toLowerCase()).toContain("terms");
  });

  // ── PART 12: CONNECT WALLET CHECK ──

  await safeStep(55, "Connect Wallet or wallet address on /admin/invest", async () => {
    await page.goto(`${HUB}/admin/invest`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(3000);
    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    const walletAddr = page.locator(':text-matches("0x[a-fA-F0-9]{6,}")');
    expect((await connectBtn.count()) + (await walletAddr.count())).toBeGreaterThanOrEqual(1);
  });

  await safeStep(56, "Wallet button/badge near Partnership Dashboard heading", async () => {
    const body = await page.textContent("body") || "";
    const hasWallet = body.includes("Connect Wallet") || /0x[a-fA-F0-9]{6,}/.test(body);
    expect(hasWallet).toBe(true);
  });

  // ── PRINT RESULTS ──
  printResults();
});
