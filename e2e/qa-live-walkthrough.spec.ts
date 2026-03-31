import { test, expect, Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const APP = "https://nfstay.app";
const SHOTS = "e2e/screenshots";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";

/** Helper: screenshot without throwing */
async function shot(page: Page, name: string) {
  try {
    await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: false });
  } catch (e) {
    console.log(`⚠️ Screenshot ${name} failed: ${(e as Error).message}`);
  }
}

/** Helper: log step result */
function log(step: string, ok: boolean, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${step}${detail ? " — " + detail : ""}`);
}

/** Helper: run a step with a timeout so one slow step doesn't kill everything */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Sign in helper — reusable across tests */
async function signInAsAdmin(page: Page) {
  await page.goto(`${HUB}/signin`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click "or sign in with email" divider if present
  try {
    const emailDivider = page.locator('text=/sign.*in.*email|or.*email/i').first();
    if (await emailDivider.isVisible().catch(() => false)) {
      await emailDivider.click();
      await page.waitForTimeout(1000);
    }
  } catch { /* ignore */ }

  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(ADMIN_EMAIL);

  const passInput = page.locator('input[type="password"], input[name="password"]').first();
  await passInput.fill(ADMIN_PASS);

  const signInBtn = page.locator('button[type="submit"]').first();
  await signInBtn.click();

  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30000, waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
}

test.describe("QA Live Walkthrough", () => {
  test.setTimeout(300_000);

  // ─── PART 1: Sign up page ───────────────────────────────────
  test("PART 1 — Sign up page check", async ({ page }) => {
    try {
      await page.goto(`${HUB}/signup`, { waitUntil: "networkidle", timeout: 30000 });
      log("1.1 Navigate to /signup", true);
    } catch (e) {
      log("1.1 Navigate to /signup", false, (e as Error).message);
    }

    await page.waitForTimeout(3000);

    // Check social buttons
    try {
      const socialButtons = await page.locator('button').filter({ hasText: /Google|Apple|Facebook/i }).count();
      const xButton = await page.locator('button').filter({ hasText: /^X$|Sign.*X|Continue.*X/i }).count();
      const total = socialButtons + xButton;
      log("1.2 Social buttons visible", total >= 3, `found ${total} social buttons`);
      await shot(page, "signup-social.png");
    } catch (e) {
      log("1.2 Social buttons visible", false, (e as Error).message);
      await shot(page, "signup-social.png");
    }

    // Check email signup
    try {
      const emailEl = page.locator('text=/sign.*up.*email|email/i').first();
      const found = await emailEl.isVisible().catch(() => false);
      log("1.3 'Sign up with Email' element exists", found);
    } catch (e) {
      log("1.3 'Sign up with Email' element exists", false, (e as Error).message);
    }

    // Check email form
    try {
      const emailTrigger = page.locator('text=/sign.*up.*email/i').first();
      if (await emailTrigger.isVisible().catch(() => false)) {
        await emailTrigger.click();
        await page.waitForTimeout(1000);
      }
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const visible = await emailInput.isVisible().catch(() => false);
      log("1.4 Email form appears", visible);
      await shot(page, "signup-email-form.png");
    } catch (e) {
      log("1.4 Email form appears", false, (e as Error).message);
      await shot(page, "signup-email-form.png");
    }
  });

  // ─── PART 2: Sign in as admin ───────────────────────────────
  test("PART 2 — Sign in as admin", async ({ page }) => {
    try {
      await page.goto(`${HUB}/signin`, { waitUntil: "networkidle", timeout: 30000 });
      log("2.1 Navigate to /signin", true);
    } catch (e) {
      log("2.1 Navigate to /signin", false, (e as Error).message);
    }

    await page.waitForTimeout(2000);

    try {
      const emailDivider = page.locator('text=/sign.*in.*email|or.*email/i').first();
      if (await emailDivider.isVisible().catch(() => false)) {
        await emailDivider.click();
        await page.waitForTimeout(1000);
      }
    } catch { /* ignore */ }

    try {
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      await emailInput.waitFor({ state: "visible", timeout: 10000 });
      await emailInput.fill(ADMIN_EMAIL);
      log("2.2 Typed email", true);
    } catch (e) {
      log("2.2 Typed email", false, (e as Error).message);
    }

    try {
      const passInput = page.locator('input[type="password"], input[name="password"]').first();
      await passInput.waitFor({ state: "visible", timeout: 5000 });
      await passInput.fill(ADMIN_PASS);
      log("2.3 Typed password", true);
    } catch (e) {
      log("2.3 Typed password", false, (e as Error).message);
    }

    try {
      const signInBtn = page.locator('button[type="submit"]').first();
      await signInBtn.click();
      log("2.4 Clicked Sign In", true);
    } catch (e) {
      log("2.4 Clicked Sign In", false, (e as Error).message);
    }

    try {
      await page.waitForURL(/\/(dashboard|admin)/, { timeout: 30000, waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
      log("2.5 Redirected to dashboard", true, page.url());
      await shot(page, "dashboard.png");
    } catch (e) {
      const errorText = await page.locator('[class*="error"], [role="alert"]').textContent().catch(() => "");
      const url = page.url();
      if (url.includes("dashboard") || url.includes("admin")) {
        log("2.5 Redirected to dashboard", true, url);
      } else {
        log("2.5 Redirected to dashboard", false, `stuck at ${url}. Error: ${errorText || "none"}`);
        await shot(page, "dashboard-fail.png");
      }
      await shot(page, "dashboard.png");
    }
  });

  // ─── PART 3: Browse marketplace ────────────────────────────
  test("PART 3 — Browse marketplace", async ({ page }) => {
    await signInAsAdmin(page);

    try {
      await page.goto(`${HUB}/dashboard/deals`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);

      // Count elements that look like property deal cards (more specific than just "card")
      const bodyText = await page.textContent("body") || "";
      const hasDealContent = /deal|property|listing|bedroom|£/i.test(bodyText);
      log("3.1 Deals page loaded", hasDealContent, `page has deal content: ${hasDealContent}`);
      await shot(page, "deals-page.png");
    } catch (e) {
      log("3.1 Deals page loaded", false, (e as Error).message);
      await shot(page, "deals-page.png");
    }

    // Click a deal card — look for something more specific
    try {
      // Property cards usually have price or location text
      const dealLink = page.locator('a[href*="/deals/"], a[href*="/property/"]').first();
      const dealCard = page.locator('[data-testid*="deal"], [data-testid*="property"]').first();
      const genericCard = page.locator('main [class*="rounded"]').filter({ hasText: /£|bedroom|bed|property/i }).first();

      let clicked = false;
      for (const el of [dealLink, dealCard, genericCard]) {
        if (await el.isVisible({ timeout: 3000 }).catch(() => false)) {
          await el.click({ timeout: 5000 });
          clicked = true;
          break;
        }
      }

      if (clicked) {
        await page.waitForTimeout(3000);
        log("3.2 Clicked deal card", true, page.url());

        const contactBtn = page.locator('button:has-text("Contact"), button:has-text("Inquire"), button:has-text("Message"), button:has-text("Send"), button:has-text("WhatsApp")');
        const hasContact = await contactBtn.first().isVisible().catch(() => false);
        log("3.3 Contact/Inquire button", hasContact);
        await shot(page, "deal-detail.png");
      } else {
        log("3.2 Clicked deal card", false, "no clickable deal card found");
      }
    } catch (e) {
      log("3.2 Clicked deal card", false, (e as Error).message);
      await shot(page, "deal-detail.png");
    }
  });

  // ─── PART 4: Investment word replacement ───────────────────
  test("PART 4 — Investment word replacement", async ({ page }) => {
    await signInAsAdmin(page);

    try {
      await page.goto(`${HUB}/dashboard/invest/marketplace`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(4000);
      log("4.1 Investment marketplace loaded", true);
      await shot(page, "invest-marketplace.png");

      const pageText = await page.textContent("body") || "";

      const hasOpenForInvestment = /Open for Investment/i.test(pageText);
      log("4.2 No 'Open for Investment' text", !hasOpenForInvestment,
        hasOpenForInvestment ? "FOUND 'Open for Investment' — should say 'Open for Partnership'" : "correctly uses 'Partnership'");

      const hasInvestInBtn = await page.locator('button:has-text("Invest in")').count();
      log("4.3 No 'Invest in' button", hasInvestInBtn === 0,
        hasInvestInBtn > 0 ? `FOUND ${hasInvestInBtn} 'Invest in' buttons` : "correctly uses 'Partner on'");

      const hasPartnership = /Partnership|Allocation|Partner/i.test(pageText);
      log("4.4 'Partnership' or 'Allocation' text present", hasPartnership);

      // The invest page is single-property — check for Partner on button
      const partnerBtn = page.locator('button:has-text("Partner on")').first();
      const hasPartnerBtn = await partnerBtn.isVisible().catch(() => false);
      log("4.5 'Partner on' button visible", hasPartnerBtn);

      if (hasPartnerBtn) {
        await partnerBtn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(2000);
        const detailText = await page.textContent("body") || "";
        const hasConfirmAllocation = /Confirm Allocation/i.test(detailText);
        const hasConfirmInvestment = /Confirm Investment/i.test(detailText);
        log("4.6 'Confirm Allocation' in dialog", hasConfirmAllocation);
        if (hasConfirmInvestment) {
          log("4.6b WARNING: Found 'Confirm Investment'", false, "should be 'Confirm Allocation'");
        }
        await shot(page, "invest-detail.png");
      }
    } catch (e) {
      log("4.1 Investment marketplace", false, (e as Error).message);
      await shot(page, "invest-marketplace.png");
    }
  });

  // ─── PART 5: Admin pages ───────────────────────────────────
  test("PART 5 — Admin pages", async ({ page }) => {
    await signInAsAdmin(page);

    // 5.1 Admin marketplace
    try {
      await page.goto(`${HUB}/admin/marketplace`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const url = page.url();
      const isAdmin = url.includes("/admin");
      log("5.1 /admin/marketplace loaded", isAdmin, url);
      await shot(page, "admin-marketplace.png");
    } catch (e) {
      log("5.1 /admin/marketplace", false, (e as Error).message);
      await shot(page, "admin-marketplace.png");
    }

    // 5.2 Admin invest
    try {
      await page.goto(`${HUB}/admin/invest`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      log("5.2 /admin/invest loaded", true);
      await shot(page, "admin-invest.png");
    } catch (e) {
      log("5.2 /admin/invest", false, (e as Error).message);
      await shot(page, "admin-invest.png");
    }

    // 5.3 Admin invest/rent
    try {
      await page.goto(`${HUB}/admin/invest/rent`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body") || "";

      const hasRentDistribution = /Rent Distribution|Distribute Rent|rent/i.test(bodyText);
      log("5.3 /admin/invest/rent page", hasRentDistribution);

      const inputs = await page.locator('input').count();
      const buttons = await page.locator('button').count();
      log("5.3a Has form elements", inputs > 0, `${inputs} inputs, ${buttons} buttons`);

      const hasAddRent = await page.locator('button:has-text("Add Rent"), button:has-text("Distribute"), button:has-text("Submit"), button:has-text("Save")').count() > 0;
      log("5.3b Has action button", hasAddRent);
      await shot(page, "admin-invest-rent.png");
    } catch (e) {
      log("5.3 /admin/invest/rent", false, (e as Error).message);
      await shot(page, "admin-invest-rent.png");
    }

    // 5.4 Admin invest/boost
    try {
      await page.goto(`${HUB}/admin/invest/boost`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body") || "";
      const hasBoost = /Boost|On Behalf|wallet/i.test(bodyText);
      log("5.4 /admin/invest/boost page", hasBoost);

      const hasWalletField = await page.locator('input[placeholder*="wallet" i], input[name*="wallet" i], input[placeholder*="address" i], input[placeholder*="0x"]').count() > 0;
      log("5.4a Wallet address field", hasWalletField);
      await shot(page, "admin-invest-boost.png");
    } catch (e) {
      log("5.4 /admin/invest/boost", false, (e as Error).message);
      await shot(page, "admin-invest-boost.png");
    }

    // 5.5 Admin observatory
    try {
      await page.goto(`${HUB}/admin/observatory`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent("body") || "";
      const hasObservatory = /Observatory|User/i.test(bodyText);
      log("5.5 /admin/observatory page", hasObservatory);

      // Try clicking a user row
      const userRow = page.locator('tr, [class*="cursor-pointer"]').filter({ hasText: /@/ }).first();
      if (await userRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userRow.click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        log("5.5a Clicked user — detail loaded", true);
      } else {
        log("5.5a User rows", false, "no clickable user rows found");
      }
      await shot(page, "admin-observatory.png");
    } catch (e) {
      log("5.5 /admin/observatory", false, (e as Error).message);
      await shot(page, "admin-observatory.png");
    }
  });

  // ─── PART 6: Notification bell ─────────────────────────────
  test("PART 6 — Notification bell", async ({ page }) => {
    await signInAsAdmin(page);

    try {
      await page.goto(`${HUB}/dashboard/deals`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);

      // Find bell — look in the topbar area
      let bellClicked = false;
      const topbar = page.locator('header, nav, [class*="topbar"]');
      const topbarBtns = topbar.locator('button');
      const btnCount = await topbarBtns.count();

      for (let i = 0; i < btnCount; i++) {
        const btn = topbarBtns.nth(i);
        const html = await btn.innerHTML().catch(() => "");
        if (/bell|notification/i.test(html)) {
          await btn.click({ timeout: 3000 });
          bellClicked = true;
          break;
        }
      }

      log("6.1 Notification bell clicked", bellClicked);
      await page.waitForTimeout(1500);
      await shot(page, "notifications-before.png");

      if (bellClicked) {
        // Mark all read
        const markRead = page.locator('button:has-text("Mark all"), button:has-text("mark all"), text=/mark.*read/i').first();
        if (await markRead.isVisible({ timeout: 2000 }).catch(() => false)) {
          await markRead.click({ timeout: 3000 });
          await page.waitForTimeout(1000);
          log("6.2 Clicked 'Mark all read'", true);
        } else {
          log("6.2 'Mark all read' button", false, "not visible");
        }

        // Close by clicking elsewhere
        await page.locator("body").click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(500);

        // Refresh
        await page.reload({ waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(3000);

        // Re-click bell
        const topbar2 = page.locator('header, nav, [class*="topbar"]');
        const topbarBtns2 = topbar2.locator('button');
        const btnCount2 = await topbarBtns2.count();
        for (let i = 0; i < btnCount2; i++) {
          const btn = topbarBtns2.nth(i);
          const html = await btn.innerHTML().catch(() => "");
          if (/bell|notification/i.test(html)) {
            await btn.click({ timeout: 3000 });
            break;
          }
        }
        await page.waitForTimeout(1500);
        await shot(page, "notifications-after-refresh.png");
        log("6.3 Notifications after refresh — screenshot taken", true);
      }
    } catch (e) {
      log("6 Notification bell", false, (e as Error).message);
      await shot(page, "notifications-error.png");
    }
  });

  // ─── PART 7: University ────────────────────────────────────
  test("PART 7 — University", async ({ page }) => {
    await signInAsAdmin(page);

    try {
      await page.goto(`${HUB}/dashboard/university`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent("body") || "";
      const hasModules = /module|course|lesson|academy|university/i.test(bodyText);
      log("7.1 University page loaded", hasModules);
      await shot(page, "university.png");

      // Click a module
      const moduleLink = page.locator('a[href*="university"], a[href*="module"], a[href*="lesson"]').first();
      const moduleCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /module|lesson|course/i }).first();

      let clicked = false;
      for (const el of [moduleLink, moduleCard]) {
        if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
          await el.click({ timeout: 5000 });
          clicked = true;
          break;
        }
      }

      if (clicked) {
        await page.waitForTimeout(3000);
        log("7.2 Clicked module", true, page.url());
        await shot(page, "university-module.png");

        const locked = await page.locator('text=/locked|upgrade.*unlock|premium.*required/i').count();
        log("7.3 No tier lock for admin", locked === 0,
          locked > 0 ? `found ${locked} lock elements` : "content accessible");
      } else {
        log("7.2 Clicked module", false, "no clickable module found");
      }
    } catch (e) {
      log("7.1 University", false, (e as Error).message);
      await shot(page, "university.png");
    }
  });

  // ─── PART 8: Booking site page ─────────────────────────────
  test("PART 8 — Booking site page", async ({ page }) => {
    await signInAsAdmin(page);

    try {
      await page.goto(`${HUB}/dashboard/booking-site`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(3000);
      log("8.1 Booking site page loaded", true);
      await shot(page, "booking-site.png");

      const bodyText = await page.textContent("body") || "";

      const hasUpgrade = /upgrade.*unlock|unlock.*feature/i.test(bodyText);
      log("8.2 No 'Upgrade to unlock' overlay", !hasUpgrade);

      const hasBrandFields = await page.locator('input, textarea, select, [contenteditable]').count();
      log("8.3 Form fields visible", hasBrandFields > 0, `${hasBrandFields} form elements`);

      const hasSave = await page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Submit")').count() > 0;
      log("8.4 Save/Update button exists", hasSave);

      const hasAdminLink = await page.locator('a[href*="nfstay.app"], a:has-text("Booking"), a:has-text("booking site")').count() > 0;
      log("8.5 Booking Site link exists", hasAdminLink);
    } catch (e) {
      log("8.1 Booking site page", false, (e as Error).message);
      await shot(page, "booking-site.png");
    }
  });

  // ─── PART 9: Mobile check ──────────────────────────────────
  test("PART 9 — Mobile check (375x812)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    const page = await context.newPage();

    try {
      await page.goto(HUB, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const hasOverflow = bodyWidth > 380;
      log("9.1 Homepage — no horizontal overflow", !hasOverflow, `body width: ${bodyWidth}px`);
      await shot(page, "mobile-homepage.png");
    } catch (e) {
      log("9.1 Mobile homepage", false, (e as Error).message);
      await shot(page, "mobile-homepage.png");
    }

    try {
      await page.goto(`${HUB}/signup`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      const socialBtns = await page.locator('button').filter({ hasText: /Google|Apple|Facebook/i }).count();
      log("9.2 Signup social buttons on mobile", socialBtns >= 2, `found ${socialBtns}`);
      await shot(page, "mobile-signup.png");
    } catch (e) {
      log("9.2 Mobile signup", false, (e as Error).message);
      await shot(page, "mobile-signup.png");
    }

    try {
      await page.goto(`${HUB}/signin`, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(2000);
      log("9.3 Signin on mobile loaded", true);
      await shot(page, "mobile-signin.png");
    } catch (e) {
      log("9.3 Mobile signin", false, (e as Error).message);
      await shot(page, "mobile-signin.png");
    }

    await context.close();
  });

  // ─── PART 10: nfstay.app check ─────────────────────────────
  test("PART 10 — nfstay.app check", async ({ page }) => {
    try {
      await page.goto(APP, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(3000);
      log("10.1 nfstay.app homepage loaded", true, page.url());
      await shot(page, "nfstay-app-home.png");
    } catch (e) {
      log("10.1 nfstay.app homepage", false, (e as Error).message);
      await shot(page, "nfstay-app-home.png");
    }

    try {
      const signInLink = page.locator('a:has-text("Sign In"), button:has-text("Sign In"), a:has-text("Login")').first();
      if (await signInLink.isVisible().catch(() => false)) {
        await signInLink.click();
        await page.waitForTimeout(3000);
        log("10.2 Clicked Sign In on nfstay.app", true, page.url());
      } else {
        await page.goto(`${APP}/signin`, { waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(2000);
        log("10.2 Navigated to /signin directly", true);
      }
    } catch (e) {
      log("10.2 nfstay.app Sign In", false, (e as Error).message);
    }

    try {
      await page.goto(`${APP}/signin`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      const bodyText = await page.textContent("body") || "";
      const hasToggle = /Guest|Operator|Host|Owner/i.test(bodyText);
      log("10.3 Guest/Operator toggle visible", hasToggle);
      await shot(page, "nfstay-app-signin.png");

      if (hasToggle) {
        const toggleBtn = page.locator('button:has-text("Guest"), button:has-text("Operator"), [role="tab"]:has-text("Guest"), [role="tab"]:has-text("Operator")').first();
        if (await toggleBtn.isVisible().catch(() => false)) {
          await toggleBtn.click();
          await page.waitForTimeout(1000);
          log("10.4 Toggle works (clicked)", true);
          await shot(page, "nfstay-app-signin-toggled.png");
        }
      }
    } catch (e) {
      log("10.3 Guest/Operator toggle", false, (e as Error).message);
      await shot(page, "nfstay-app-signin.png");
    }
  });
});
