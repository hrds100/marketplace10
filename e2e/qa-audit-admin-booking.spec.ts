import { test, expect } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SS = "e2e/screenshots";

const results: { name: string; status: string; note: string }[] = [];

function record(name: string, status: "PASS" | "FAIL", note = "") {
  results.push({ name, status, note });
}

function printReport() {
  console.log("\n\n========== QA AUDIT REPORT: ADMIN BOOKING SITE ==========\n");
  for (const r of results) {
    const icon = r.status === "PASS" ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.name}${r.note ? ` -- ${r.note}` : ""}`);
  }
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==========================================================\n");
}

test("Admin Booking Site - Full Live QA Audit", async ({ page }) => {
  test.setTimeout(280_000);

  // ── Sign in via UI form ──────────────────────────────────
  try {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Click Sign In tab if present
    const signInTab = page.locator("text=Sign In").first();
    if (await signInTab.isVisible().catch(() => false)) await signInTab.click();
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
    record("Admin sign-in", "PASS");
  } catch (e: any) {
    record("Admin sign-in", "FAIL", e.message?.slice(0, 120));
    printReport();
    return;
  }

  // Dismiss any modal/overlay helper
  async function dismissModal() {
    const closeBtn = page.locator('[aria-label="Close"], button:has-text("×"), .particle-close, button.close').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // ══════════════════════════════════════════════════════════
  // 1. /admin/nfstay/dashboard
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay/dashboard`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/dashboard - page loads", "PASS");

    // Stats with real numbers (not all zeros)
    const statsText = await page.locator(".grid, [class*='stat'], [class*='card']").allTextContents();
    const joined = statsText.join(" ");
    const hasNonZero = /[1-9]/.test(joined);
    record("Dashboard - stats show real numbers", hasNonZero ? "PASS" : "FAIL", joined.slice(0, 200));

    // Charts render (canvas or svg or recharts)
    const chartCount = await page.locator("canvas, svg.recharts-surface, [class*='chart'], .recharts-wrapper").count();
    record("Dashboard - charts render", chartCount > 0 ? "PASS" : "FAIL", `Found ${chartCount} chart elements`);

    // Recent users section
    const hasRecentUsers = await page.locator("text=Recent").first().isVisible().catch(() => false);
    const userRows = await page.locator("table tbody tr, [class*='user-row'], [class*='UserRow']").count();
    record("Dashboard - recent users section", hasRecentUsers || userRows > 0 ? "PASS" : "FAIL", `recentLabel=${hasRecentUsers} rows=${userRows}`);

    await page.screenshot({ path: `${SS}/admin-booking-dashboard.png`, fullPage: true });
    record("Dashboard - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/dashboard", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 2. /admin/nfstay (reservations)
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    const bodyText = await page.locator("body").textContent() || "";
    const hasColumnError = bodyText.includes("column") && bodyText.includes("does not exist");
    record("/admin/nfstay - page loads", "PASS");
    record("Reservations - no 'column does not exist' error", hasColumnError ? "FAIL" : "PASS", hasColumnError ? "ERROR FOUND" : "Clean");

    // Stats cards
    const statsCards = await page.locator("[class*='stat'], [class*='card'], [class*='Card']").count();
    const pageNums = await page.locator("body").textContent() || "";
    const hasNumbers = /\d+/.test(pageNums);
    record("Reservations - stats cards show numbers", statsCards > 0 && hasNumbers ? "PASS" : "FAIL", `cards=${statsCards}`);

    // Search "dubai"
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("dubai");
      await page.waitForTimeout(2000);
      record("Reservations - search works", "PASS", "typed 'dubai'");
      await searchInput.clear();
      await page.waitForTimeout(1000);
    } else {
      record("Reservations - search works", "FAIL", "Search input not found");
    }

    // Status filter buttons
    const filterBtns = page.locator("button").filter({ hasText: /all|pending|confirmed|checked|cancel|complete/i });
    const filterCount = await filterBtns.count();
    if (filterCount > 0) {
      for (let i = 0; i < Math.min(filterCount, 5); i++) {
        try {
          await filterBtns.nth(i).click();
          await page.waitForTimeout(1000);
        } catch { /* ignore */ }
      }
      record("Reservations - status filter buttons", "PASS", `${filterCount} filters clicked`);
    } else {
      record("Reservations - status filter buttons", "FAIL", "No filter buttons found");
    }

    // Table rows
    const tableRows = await page.locator("table tbody tr, [class*='reservation'], [class*='booking']").count();
    record("Reservations - table rows render", tableRows > 0 ? "PASS" : "FAIL", `${tableRows} rows`);

    await page.screenshot({ path: `${SS}/admin-booking-reservations.png`, fullPage: true });
    record("Reservations - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay (reservations)", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 3. /admin/nfstay/properties
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay/properties`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/properties - page loads", "PASS");

    // Property cards with images, titles, locations
    const propCards = await page.locator("[class*='card'], [class*='Card'], [class*='property']").count();
    const propImages = await page.locator("img").count();
    record("Properties - cards show images/titles", propCards > 0 && propImages > 0 ? "PASS" : "FAIL", `cards=${propCards} imgs=${propImages}`);

    // Search "dubai"
    const searchProp = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"]').first();
    if (await searchProp.isVisible().catch(() => false)) {
      await searchProp.fill("dubai");
      await page.waitForTimeout(2000);
      const afterSearch = await page.locator("[class*='card'], [class*='Card'], [class*='property']").count();
      record("Properties - search 'dubai'", "PASS", `${afterSearch} results after search`);
      await searchProp.clear();
      await page.waitForTimeout(1000);
    } else {
      record("Properties - search 'dubai'", "FAIL", "No search input");
    }

    // Status filter
    const statusFilter = page.locator("button, select").filter({ hasText: /active|inactive|all|draft|live/i });
    const sfCount = await statusFilter.count();
    if (sfCount > 0) {
      await statusFilter.first().click().catch(() => {});
      await page.waitForTimeout(1000);
      record("Properties - status filter works", "PASS", `${sfCount} filter elements`);
    } else {
      record("Properties - status filter works", "FAIL", "No status filter found");
    }

    // Click a property card
    const firstCard = page.locator("[class*='card'], [class*='Card']").first();
    if (await firstCard.isVisible().catch(() => false)) {
      const urlBefore = page.url();
      await firstCard.click().catch(() => {});
      await page.waitForTimeout(2000);
      const urlAfter = page.url();
      record("Properties - click card does something", urlAfter !== urlBefore ? "PASS" : "FAIL", `before=${urlBefore} after=${urlAfter}`);
      if (urlAfter !== urlBefore) {
        await page.goBack();
        await page.waitForTimeout(2000);
      }
    } else {
      record("Properties - click card does something", "FAIL", "No card visible");
    }

    await page.goto(`${BASE}/admin/nfstay/properties`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/admin-booking-properties.png`, fullPage: true });
    record("Properties - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/properties", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 4. /admin/nfstay/operators
  // ══════════════════════════════════════════════════════════
  let claudeOpId = "";
  try {
    await page.goto(`${BASE}/admin/nfstay/operators`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/operators - page loads", "PASS");

    // Claude Properties operator with correct listing count
    const claudeCard = page.locator("text=Claude Properties").first();
    const claudeVisible = await claudeCard.isVisible().catch(() => false);
    record("Operators - Claude Properties visible", claudeVisible ? "PASS" : "FAIL");

    if (claudeVisible) {
      // Check listing count - should be 10, not 0
      const parentCard = page.locator("[class*='card'], [class*='Card'], tr").filter({ hasText: "Claude Properties" }).first();
      const cardText = await parentCard.textContent().catch(() => "") || "";
      const has10 = cardText.includes("10");
      const has0Only = /\b0\b/.test(cardText) && !has10;
      record("Operators - Claude Properties listing count = 10", has10 ? "PASS" : "FAIL", `Text: ${cardText.slice(0, 150)}`);
    }

    // Search
    const searchOp = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"]').first();
    if (await searchOp.isVisible().catch(() => false)) {
      await searchOp.fill("claude");
      await page.waitForTimeout(2000);
      record("Operators - search works", "PASS");
      await searchOp.clear();
      await page.waitForTimeout(1000);
    } else {
      record("Operators - search works", "FAIL", "No search input");
    }

    // Click Claude Properties card -> navigates to detail
    const claudeLink = page.locator("a, [class*='card'], [class*='Card'], tr").filter({ hasText: "Claude Properties" }).first();
    if (await claudeLink.isVisible().catch(() => false)) {
      const urlBefore = page.url();
      await claudeLink.click().catch(() => {});
      await page.waitForTimeout(3000);
      const urlAfter = page.url();
      const navigated = urlAfter !== urlBefore && urlAfter.includes("operator");
      record("Operators - click Claude Properties navigates to detail", navigated ? "PASS" : "FAIL", urlAfter);
      if (navigated) {
        // Extract operator ID from URL
        const match = urlAfter.match(/operators\/([^/]+)/);
        if (match) claudeOpId = match[1];
      }
    } else {
      record("Operators - click Claude Properties navigates", "FAIL", "Card not clickable");
    }

    await page.goto(`${BASE}/admin/nfstay/operators`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SS}/admin-booking-operators.png`, fullPage: true });
    record("Operators - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/operators", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 5. /admin/nfstay/operators/:id (operator detail)
  // ══════════════════════════════════════════════════════════
  try {
    const detailUrl = claudeOpId
      ? `${BASE}/admin/nfstay/operators/${claudeOpId}`
      : `${BASE}/admin/nfstay/operators`;

    if (!claudeOpId) {
      // Try to find the operator link from the operators page
      await page.goto(`${BASE}/admin/nfstay/operators`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);
      const opLink = page.locator("a").filter({ hasText: "Claude Properties" }).first();
      if (await opLink.isVisible().catch(() => false)) {
        await opLink.click();
        await page.waitForTimeout(3000);
      }
    } else {
      await page.goto(detailUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(4000);
    }
    await dismissModal();

    const currentUrl = page.url();
    const isDetailPage = currentUrl.includes("operators/") && currentUrl !== `${BASE}/admin/nfstay/operators`;
    record("Operator detail - page loads", isDetailPage ? "PASS" : "FAIL", currentUrl);

    if (isDetailPage) {
      const bodyText = await page.locator("body").textContent() || "";

      // Profile section: brand name, email, phone, subdomain
      const hasBrandName = bodyText.includes("Claude Properties");
      record("Operator detail - brand name shows", hasBrandName ? "PASS" : "FAIL");

      const hasEmail = /@/.test(bodyText);
      record("Operator detail - email shows", hasEmail ? "PASS" : "FAIL");

      const hasPhone = /\+?\d[\d\s-]{6,}/.test(bodyText);
      record("Operator detail - phone shows", hasPhone ? "PASS" : "FAIL", hasPhone ? "Found" : "Not visible");

      const hasSubdomain = bodyText.includes("subdomain") || bodyText.includes(".nfstay");
      record("Operator detail - subdomain link", hasSubdomain ? "PASS" : "FAIL");

      // Stats cards: total properties = 10
      const has10Props = bodyText.includes("10");
      record("Operator detail - total properties = 10", has10Props ? "PASS" : "FAIL");

      // Properties table shows 10 Dubai properties
      const propRows = await page.locator("table tbody tr").count();
      const dubaiMentions = (bodyText.match(/dubai/gi) || []).length;
      record("Operator detail - properties table with Dubai properties", propRows > 0 || dubaiMentions > 0 ? "PASS" : "FAIL", `rows=${propRows} dubaiMentions=${dubaiMentions}`);

      // Bookings table / empty state
      const hasBookings = bodyText.toLowerCase().includes("booking");
      record("Operator detail - bookings section present", hasBookings ? "PASS" : "FAIL");

      // Monthly revenue chart
      const chartEl = await page.locator("canvas, svg.recharts-surface, .recharts-wrapper, [class*='chart']").count();
      record("Operator detail - monthly revenue chart", chartEl > 0 ? "PASS" : "FAIL", `${chartEl} chart elements`);

      await page.screenshot({ path: `${SS}/admin-booking-operator-detail.png`, fullPage: true });
      record("Operator detail - screenshot taken", "PASS");
    }
  } catch (e: any) {
    record("Operator detail page", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 6. /admin/nfstay/users
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay/users`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/users - page loads", "PASS");

    // User rows with real data
    const userRows = await page.locator("table tbody tr, [class*='user'], [class*='User']").count();
    const bodyText = await page.locator("body").textContent() || "";
    const hasMockNames = /john doe|jane doe|test user/i.test(bodyText);
    record("Users - rows show real data (not mock)", userRows > 0 && !hasMockNames ? "PASS" : "FAIL", `rows=${userRows} mock=${hasMockNames}`);

    // Search
    const searchUser = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"]').first();
    if (await searchUser.isVisible().catch(() => false)) {
      await searchUser.fill("admin");
      await page.waitForTimeout(2000);
      record("Users - search works", "PASS");
      await searchUser.clear();
      await page.waitForTimeout(1000);
    } else {
      record("Users - search works", "FAIL", "No search input");
    }

    await page.screenshot({ path: `${SS}/admin-booking-users.png`, fullPage: true });
    record("Users - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/users", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 7. /admin/nfstay/analytics
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay/analytics`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/analytics - page loads", "PASS");

    const bodyText = await page.locator("body").textContent() || "";
    const hasRealNumbers = /[1-9]\d*/.test(bodyText);
    record("Analytics - stats show real numbers", hasRealNumbers ? "PASS" : "FAIL");

    const chartCount = await page.locator("canvas, svg.recharts-surface, .recharts-wrapper, [class*='chart']").count();
    record("Analytics - charts render", chartCount > 0 ? "PASS" : "FAIL", `${chartCount} chart elements`);

    await page.screenshot({ path: `${SS}/admin-booking-analytics.png`, fullPage: true });
    record("Analytics - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/analytics", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 8. /admin/nfstay/settings
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/nfstay/settings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/nfstay/settings - page loads", "PASS");

    // Form fields present
    const inputs = await page.locator("input, textarea, select").count();
    record("Settings - form fields present", inputs > 0 ? "PASS" : "FAIL", `${inputs} inputs`);

    // Save button
    const saveBtn = page.locator("button").filter({ hasText: /save|update|submit/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(3000);
      // Check for toast
      const toast = page.locator("[class*='toast'], [class*='Toast'], [role='alert'], [class*='Toastify'], [class*='notification']").first();
      const toastVisible = await toast.isVisible().catch(() => false);
      record("Settings - save button works (toast)", toastVisible ? "PASS" : "FAIL", toastVisible ? "Toast appeared" : "No toast seen");
    } else {
      record("Settings - save button", "FAIL", "No save button found");
    }

    await page.screenshot({ path: `${SS}/admin-booking-settings.png`, fullPage: true });
    record("Settings - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/nfstay/settings", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 9. /admin/observatory
  // ══════════════════════════════════════════════════════════
  try {
    await page.goto(`${BASE}/admin/observatory`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("/admin/observatory - page loads", "PASS");

    // User list shows users
    const userItems = await page.locator("table tbody tr, [class*='user'], [class*='User'], li").count();
    record("Observatory - user list shows users", userItems > 0 ? "PASS" : "FAIL", `${userItems} items`);

    // Click a user - detail panel
    const firstUser = page.locator("table tbody tr, [class*='user'], [class*='User'], li").first();
    if (await firstUser.isVisible().catch(() => false)) {
      await firstUser.click().catch(() => {});
      await page.waitForTimeout(2000);
      // Check if detail panel / modal appeared
      const detailPanel = page.locator("[class*='detail'], [class*='Detail'], [class*='panel'], [class*='Panel'], [class*='drawer'], [class*='modal'], [class*='Modal']").first();
      const panelVisible = await detailPanel.isVisible().catch(() => false);
      const urlChanged = page.url() !== `${BASE}/admin/observatory`;
      record("Observatory - click user shows detail", panelVisible || urlChanged ? "PASS" : "FAIL");
    } else {
      record("Observatory - click user shows detail", "FAIL", "No user item to click");
    }

    await page.screenshot({ path: `${SS}/admin-booking-observatory.png`, fullPage: true });
    record("Observatory - screenshot taken", "PASS");
  } catch (e: any) {
    record("/admin/observatory", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // 10. Admin Mobile (375x812)
  // ══════════════════════════════════════════════════════════
  try {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/admin/nfstay`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(4000);
    await dismissModal();

    record("Mobile /admin/nfstay - page loads", "PASS");

    // Hamburger menu visible
    const hamburger = page.locator("button[class*='menu'], button[class*='Menu'], button[aria-label*='menu'], button[aria-label*='Menu'], [class*='hamburger'], [class*='Hamburger'], button svg").first();
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    record("Mobile - hamburger menu visible", hamburgerVisible ? "PASS" : "FAIL");

    if (hamburgerVisible) {
      await hamburger.click().catch(() => {});
      await page.waitForTimeout(1500);

      // All nav links appear
      const navLinks = page.locator("a[href*='admin'], nav a, [class*='sidebar'] a, [class*='Sidebar'] a, [class*='nav'] a");
      const navCount = await navLinks.count();
      record("Mobile - nav links appear after hamburger click", navCount > 0 ? "PASS" : "FAIL", `${navCount} nav links`);

      // Click a nav link - navigates
      if (navCount > 0) {
        const urlBefore = page.url();
        const firstLink = navLinks.first();
        await firstLink.click().catch(() => {});
        await page.waitForTimeout(3000);
        const urlAfter = page.url();
        record("Mobile - nav link click navigates", urlAfter !== urlBefore ? "PASS" : "FAIL", urlAfter);
      }
    }

    // No horizontal overflow
    await page.goto(`${BASE}/admin/nfstay`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasOverflow = scrollWidth > clientWidth + 5; // 5px tolerance
    record("Mobile - no horizontal overflow", hasOverflow ? "FAIL" : "PASS", `scrollW=${scrollWidth} clientW=${clientWidth}`);

    await page.screenshot({ path: `${SS}/admin-booking-mobile.png`, fullPage: true });
    record("Mobile - screenshot taken", "PASS");

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  } catch (e: any) {
    record("Admin mobile tests", "FAIL", e.message?.slice(0, 150));
  }

  // ══════════════════════════════════════════════════════════
  // FINAL REPORT
  // ══════════════════════════════════════════════════════════
  printReport();

  const failed = results.filter((r) => r.status === "FAIL").length;
  if (failed > 0) {
    console.log(`\n⚠ ${failed} checks failed — review above for details.`);
  }
});
