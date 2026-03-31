/**
 * AUDIT AGENT 2 -- Operator Booking Site Experience
 * Tests hub.nfstay.com operator dashboard + nfstay.app live booking site
 */
import { test, expect } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const BOOKING_SITE = "https://nfstay.app";
const OPERATOR_SITE = "https://claude.nfstay.app";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASS = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";

/* --- helper: sign in via hub --- */
async function hubSignIn(page: import("@playwright/test").Page): Promise<boolean> {
  try {
    const resp = await page.goto(`${HUB}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    const status = resp?.status() ?? 0;
    if (status >= 400) {
      console.log(`  [auth] Hub sign-in page returned HTTP ${status}`);
      return false;
    }
    await page.waitForTimeout(3000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], [data-feature="AUTH__SIGNIN_EMAIL"]').first();
    const formVisible = await emailInput.isVisible({ timeout: 10000 }).catch(() => false);
    if (!formVisible) {
      console.log(`  [auth] Sign-in form not found`);
      await page.screenshot({ path: `${SCREENSHOTS}/op-signin-debug.png`, fullPage: true }).catch(() => {});
      return false;
    }

    await emailInput.fill(ADMIN_EMAIL);
    const passInput = page.locator('input[type="password"], [data-feature="AUTH__SIGNIN_PASSWORD"]').first();
    await passInput.fill(ADMIN_PASS);
    const submitBtn = page.locator('button[type="submit"], [data-feature="AUTH__SIGNIN_SUBMIT"]').first();
    await submitBtn.click();
    await page.waitForURL(/dashboard|deals|admin/, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(3000);
    return true;
  } catch (e) {
    console.log(`  [auth] Sign-in failed: ${(e as Error).message.slice(0, 120)}`);
    return false;
  }
}

/* --- helper: safe screenshot --- */
async function snap(page: import("@playwright/test").Page, name: string) {
  try {
    await page.screenshot({ path: `${SCREENSHOTS}/${name}`, fullPage: true });
    console.log(`  [screenshot] ${name}`);
  } catch (e) {
    console.log(`  [screenshot-fail] ${name}: ${(e as Error).message.slice(0, 60)}`);
  }
}

test.describe("Operator Booking Site Audit", () => {
  let authed = false;

  test.beforeAll(async ({ browser }) => {
    // Warm-up check
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    authed = await hubSignIn(page);
    console.log(`  [auth] Admin signed in: ${authed}`);
    await ctx.close();
  });

  // ============================
  // SECTION 1: Hub Dashboard - Booking Site Tab: Dashboard
  // ============================
  test("1. Booking Site Dashboard - stats cards", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const signedIn = await hubSignIn(page);
      expect(signedIn).toBe(true);

      // Navigate to booking-site dashboard
      const resp = await page.goto(`${HUB}/dashboard/booking-site`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = resp?.status() ?? 0;
      console.log(`  [dashboard] /dashboard/booking-site HTTP ${status}`);
      expect(status).toBeLessThan(400);

      await page.waitForTimeout(4000);
      await snap(page, "op-booking-dashboard.png");

      // Check page loaded
      const pageText = await page.textContent("body").catch(() => "");
      console.log(`  [dashboard] Page text length: ${pageText?.length}`);

      // Look for stat cards - they could be cards, divs, or specific components
      // Check for key stat labels
      const statLabels = ["properties", "reservations", "revenue", "bookings", "occupancy", "guests"];
      let foundStats = 0;
      for (const label of statLabels) {
        const found = pageText?.toLowerCase().includes(label);
        if (found) {
          foundStats++;
          console.log(`  [dashboard] STAT FOUND: "${label}"`);
        }
      }
      console.log(`  [dashboard] Total stat keywords found: ${foundStats}`);

      // Look for stat cards visually (divs/cards with numbers)
      const cards = await page.locator('[class*="card"], [class*="stat"], [class*="metric"], [class*="Card"]').count().catch(() => 0);
      console.log(`  [dashboard] Card-like elements: ${cards}`);

      // Check for real numbers - look for "10" (expected properties count)
      const hasPropertyCount = pageText?.includes("10") || false;
      console.log(`  [dashboard] Contains "10" (expected property count): ${hasPropertyCount}`);

      // Check for "Claude Properties" branding
      const hasClaudeBranding = pageText?.includes("Claude Properties") || pageText?.includes("claude") || false;
      console.log(`  [dashboard] Contains "Claude Properties" or "claude": ${hasClaudeBranding}`);

      // Check for zeros that might be wrong
      const bodyLower = pageText?.toLowerCase() || "";
      if (bodyLower.includes("0 properties") || bodyLower.includes("properties: 0")) {
        console.log(`  [dashboard] WARNING: Properties showing 0 - likely a bug`);
      }

      // Look for specific dashboard tabs
      const tabs = await page.locator('[role="tab"], button:has-text("Dashboard"), button:has-text("Properties"), button:has-text("Reservations"), button:has-text("Branding")').allTextContents().catch(() => []);
      console.log(`  [dashboard] Tabs found: ${JSON.stringify(tabs)}`);

      // Collect all visible text blocks that look like stats
      const allNumbers = await page.evaluate(() => {
        const els = document.querySelectorAll("h1, h2, h3, h4, p, span, div");
        const nums: string[] = [];
        els.forEach(el => {
          const t = (el as HTMLElement).innerText?.trim();
          if (t && /^\d+/.test(t) && t.length < 20) {
            nums.push(t);
          }
        });
        return nums.slice(0, 30);
      }).catch(() => []);
      console.log(`  [dashboard] Number elements: ${JSON.stringify(allNumbers)}`);

    } catch (e) {
      console.log(`  [dashboard] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-booking-dashboard-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 2: Hub Dashboard - Booking Site Tab: Properties
  // ============================
  test("2. Booking Site Properties tab", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const signedIn = await hubSignIn(page);
      expect(signedIn).toBe(true);

      await page.goto(`${HUB}/dashboard/booking-site`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Click Properties tab
      const propsTab = page.locator('button:has-text("Properties"), [role="tab"]:has-text("Properties"), a:has-text("Properties")').first();
      const propsTabVisible = await propsTab.isVisible({ timeout: 5000 }).catch(() => false);
      if (propsTabVisible) {
        await propsTab.click();
        console.log(`  [properties] Clicked Properties tab`);
      } else {
        // Try navigating directly if tabs aren't found
        console.log(`  [properties] Properties tab button not found, looking for alternative navigation`);
      }

      await page.waitForTimeout(3000);
      await snap(page, "op-booking-properties.png");

      const pageText = await page.textContent("body").catch(() => "");

      // Check for property table/list
      const tableExists = await page.locator("table, [role='table'], [class*='table'], [class*='grid']").count().catch(() => 0);
      console.log(`  [properties] Table/grid elements: ${tableExists}`);

      // Check for property rows - look for Dubai properties
      const dubaiMentions = (pageText?.match(/dubai/gi) || []).length;
      console.log(`  [properties] Dubai mentions: ${dubaiMentions}`);

      // Check for expected columns
      const columnHeaders = ["title", "city", "status", "rate", "price", "name", "location", "image"];
      for (const col of columnHeaders) {
        const found = pageText?.toLowerCase().includes(col);
        if (found) console.log(`  [properties] Column/field found: "${col}"`);
      }

      // Check for Add Property button
      const addBtn = page.locator('button:has-text("Add Property"), a:has-text("Add Property"), button:has-text("Add"), button:has-text("New Property")').first();
      const addBtnVisible = await addBtn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`  [properties] "Add Property" button visible: ${addBtnVisible}`);

      // Count property rows
      const rows = await page.locator("table tbody tr, [class*='property-row'], [class*='PropertyRow'], [class*='list-item']").count().catch(() => 0);
      console.log(`  [properties] Table rows: ${rows}`);

      // Check for images/thumbnails
      const images = await page.locator("table img, [class*='thumbnail'], [class*='avatar']").count().catch(() => 0);
      console.log(`  [properties] Images in table: ${images}`);

    } catch (e) {
      console.log(`  [properties] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-booking-properties-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 3: Hub Dashboard - Booking Site Tab: Reservations
  // ============================
  test("3. Booking Site Reservations tab", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const signedIn = await hubSignIn(page);
      expect(signedIn).toBe(true);

      await page.goto(`${HUB}/dashboard/booking-site`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Click Reservations tab
      const resTab = page.locator('button:has-text("Reservations"), [role="tab"]:has-text("Reservations"), a:has-text("Reservations")').first();
      const resTabVisible = await resTab.isVisible({ timeout: 5000 }).catch(() => false);
      if (resTabVisible) {
        await resTab.click();
        console.log(`  [reservations] Clicked Reservations tab`);
      } else {
        console.log(`  [reservations] Reservations tab not found`);
      }

      await page.waitForTimeout(3000);
      await snap(page, "op-booking-reservations.png");

      const pageText = await page.textContent("body").catch(() => "");

      // Check column headers
      const expectedColumns = ["guest", "property", "check-in", "check-out", "status", "amount", "date"];
      let colsFound = 0;
      for (const col of expectedColumns) {
        const found = pageText?.toLowerCase().includes(col);
        if (found) {
          colsFound++;
          console.log(`  [reservations] Column found: "${col}"`);
        }
      }
      console.log(`  [reservations] Expected columns found: ${colsFound}/${expectedColumns.length}`);

      // Check for empty state
      const emptyState = pageText?.toLowerCase().includes("no reservations") ||
        pageText?.toLowerCase().includes("no bookings") ||
        pageText?.toLowerCase().includes("empty") || false;
      console.log(`  [reservations] Empty state detected: ${emptyState}`);

      // Check for table
      const tableExists = await page.locator("table, [role='table']").count().catch(() => 0);
      console.log(`  [reservations] Table elements: ${tableExists}`);

    } catch (e) {
      console.log(`  [reservations] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-booking-reservations-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 4: Hub Dashboard - Booking Site Tab: Branding
  // ============================
  test("4. Booking Site Branding tab", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const signedIn = await hubSignIn(page);
      expect(signedIn).toBe(true);

      await page.goto(`${HUB}/dashboard/booking-site`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Click Branding tab
      const brandTab = page.locator('button:has-text("Branding"), [role="tab"]:has-text("Branding"), a:has-text("Branding"), button:has-text("Settings")').first();
      const brandTabVisible = await brandTab.isVisible({ timeout: 5000 }).catch(() => false);
      if (brandTabVisible) {
        await brandTab.click();
        console.log(`  [branding] Clicked Branding tab`);
      } else {
        console.log(`  [branding] Branding tab not found - checking all visible tabs`);
        const allTabs = await page.locator('[role="tab"], [class*="tab"]').allTextContents().catch(() => []);
        console.log(`  [branding] Available tabs: ${JSON.stringify(allTabs)}`);
      }

      await page.waitForTimeout(3000);
      await snap(page, "op-booking-branding.png");

      const pageText = await page.textContent("body").catch(() => "");

      // Check for brand name field with "Claude Properties"
      const brandNameInput = page.locator('input[value*="Claude"], input[placeholder*="brand" i], input[name*="brand" i]').first();
      const brandNameVisible = await brandNameInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (brandNameVisible) {
        const val = await brandNameInput.inputValue().catch(() => "");
        console.log(`  [branding] Brand name field value: "${val}"`);
      } else {
        // Check for any input that might contain Claude Properties
        const allInputs = await page.locator("input").evaluateAll(els =>
          els.map(el => ({ name: el.getAttribute("name"), value: (el as HTMLInputElement).value, placeholder: el.getAttribute("placeholder") }))
        ).catch(() => []);
        console.log(`  [branding] All inputs: ${JSON.stringify(allInputs.slice(0, 10))}`);
      }

      // Check for subdomain field
      const subdomainField = pageText?.toLowerCase().includes("subdomain") || pageText?.toLowerCase().includes("claude") || false;
      console.log(`  [branding] Subdomain reference found: ${subdomainField}`);

      // Check for color picker
      const colorPicker = await page.locator('input[type="color"], [class*="color"], [class*="Color"], [class*="picker"]').count().catch(() => 0);
      console.log(`  [branding] Color picker elements: ${colorPicker}`);

      // Check for hero headline
      const heroField = pageText?.toLowerCase().includes("hero") || pageText?.toLowerCase().includes("headline") || false;
      console.log(`  [branding] Hero/headline reference: ${heroField}`);

      // Check for Save button
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("Apply")').first();
      const saveBtnVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`  [branding] Save button visible: ${saveBtnVisible}`);

      // Click Save and check for toast
      if (saveBtnVisible) {
        await saveBtn.click();
        console.log(`  [branding] Clicked Save button`);
        await page.waitForTimeout(2000);

        // Check for toast/notification
        const toast = await page.locator('[class*="toast"], [class*="Toast"], [role="alert"], [class*="notification"], [class*="Toaster"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        console.log(`  [branding] Toast/notification after save: ${toast}`);

        const toastText = await page.locator('[class*="toast"], [class*="Toast"], [role="alert"], [class*="notification"]').first().textContent().catch(() => "");
        if (toastText) console.log(`  [branding] Toast text: "${toastText}"`);

        await snap(page, "op-booking-branding-after-save.png");
      }

    } catch (e) {
      console.log(`  [branding] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-booking-branding-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 5: Live booking site - nfstay.app
  // ============================
  test("5. nfstay.app main site - Dubai properties", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(BOOKING_SITE, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = resp?.status() ?? 0;
      console.log(`  [nfstay.app] HTTP ${status}`);
      expect(status).toBeLessThan(400);

      await page.waitForTimeout(5000);
      await snap(page, "op-nfstay-app-home.png");

      const pageText = await page.textContent("body").catch(() => "");

      // Check for Dubai properties
      const dubaiMentions = (pageText?.match(/dubai/gi) || []).length;
      console.log(`  [nfstay.app] Dubai mentions: ${dubaiMentions}`);

      // Check for property cards
      const propertyCards = await page.locator('[class*="property"], [class*="listing"], [class*="card"], a[href*="property"]').count().catch(() => 0);
      console.log(`  [nfstay.app] Property-like elements: ${propertyCards}`);

      // Check for property links
      const propertyLinks = await page.locator('a[href*="property"], a[href*="listing"]').count().catch(() => 0);
      console.log(`  [nfstay.app] Property links: ${propertyLinks}`);

      // Look for property names
      const headings = await page.locator("h1, h2, h3, h4").allTextContents().catch(() => []);
      console.log(`  [nfstay.app] Headings: ${JSON.stringify(headings.slice(0, 15))}`);

    } catch (e) {
      console.log(`  [nfstay.app] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-nfstay-app-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 6: Operator subdomain - claude.nfstay.app
  // ============================
  test("6. claude.nfstay.app - operator branded site", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const resp = await page.goto(OPERATOR_SITE, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = resp?.status() ?? 0;
      console.log(`  [claude.nfstay.app] HTTP ${status}`);

      await page.waitForTimeout(5000);
      await snap(page, "op-claude-nfstay-home.png");

      if (status >= 400) {
        console.log(`  [claude.nfstay.app] Site returned ${status} - may not be configured`);
        // Still continue checking what's there
      }

      const pageText = await page.textContent("body").catch(() => "");
      const pageLen = pageText?.length ?? 0;
      console.log(`  [claude.nfstay.app] Page text length: ${pageLen}`);

      // Check for Claude Properties branding
      const hasClaude = pageText?.includes("Claude Properties") || pageText?.includes("Claude") || false;
      console.log(`  [claude.nfstay.app] "Claude Properties" branding: ${hasClaude}`);

      // Check for Dubai properties
      const dubaiMentions = (pageText?.match(/dubai/gi) || []).length;
      console.log(`  [claude.nfstay.app] Dubai mentions: ${dubaiMentions}`);

      // Count property cards
      const cards = await page.locator('[class*="property"], [class*="listing"], [class*="card"]').count().catch(() => 0);
      console.log(`  [claude.nfstay.app] Property cards: ${cards}`);

      // Check for property links
      const propertyLinks = await page.locator('a[href*="property"], a[href*="listing"]').count().catch(() => 0);
      console.log(`  [claude.nfstay.app] Property links: ${propertyLinks}`);

      // List all headings
      const headings = await page.locator("h1, h2, h3").allTextContents().catch(() => []);
      console.log(`  [claude.nfstay.app] Headings: ${JSON.stringify(headings.slice(0, 10))}`);

    } catch (e) {
      console.log(`  [claude.nfstay.app] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-claude-nfstay-error.png");
      // Don't throw - this might legitimately not exist
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 7: Property detail page on booking site
  // ============================
  test("7. Property detail page - photos, amenities, booking widget", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // First go to main site to find a property link
      await page.goto(BOOKING_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(4000);

      // Try to find and click a property
      const propertyLink = page.locator('a[href*="property"], a[href*="listing"]').first();
      const hasPropertyLink = await propertyLink.isVisible({ timeout: 5000 }).catch(() => false);

      let detailUrl = "";
      if (hasPropertyLink) {
        detailUrl = await propertyLink.getAttribute("href").catch(() => "") || "";
        console.log(`  [detail] Found property link: ${detailUrl}`);
        await propertyLink.click();
        await page.waitForTimeout(4000);
      } else {
        // Try operator site
        console.log(`  [detail] No property links on main site, trying operator site`);
        await page.goto(OPERATOR_SITE, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(4000);
        const opLink = page.locator('a[href*="property"], a[href*="listing"]').first();
        const hasOpLink = await opLink.isVisible({ timeout: 5000 }).catch(() => false);
        if (hasOpLink) {
          detailUrl = await opLink.getAttribute("href").catch(() => "") || "";
          console.log(`  [detail] Found property link on operator site: ${detailUrl}`);
          await opLink.click();
          await page.waitForTimeout(4000);
        } else {
          console.log(`  [detail] No property links found on either site`);
        }
      }

      await snap(page, "op-property-detail.png");

      const pageText = await page.textContent("body").catch(() => "");

      // Check for photos/gallery
      const images = await page.locator("img").count().catch(() => 0);
      console.log(`  [detail] Images on page: ${images}`);

      // Check for amenities section
      const hasAmenities = pageText?.toLowerCase().includes("amenities") ||
        pageText?.toLowerCase().includes("wifi") ||
        pageText?.toLowerCase().includes("pool") ||
        pageText?.toLowerCase().includes("parking") || false;
      console.log(`  [detail] Amenities section: ${hasAmenities}`);

      // Check for booking widget
      const hasBooking = pageText?.toLowerCase().includes("book") ||
        pageText?.toLowerCase().includes("reserve") ||
        pageText?.toLowerCase().includes("check-in") ||
        pageText?.toLowerCase().includes("check in") || false;
      console.log(`  [detail] Booking widget references: ${hasBooking}`);

      // Check for add-ons
      const hasAddons = pageText?.toLowerCase().includes("add-on") ||
        pageText?.toLowerCase().includes("addon") ||
        pageText?.toLowerCase().includes("early check") ||
        pageText?.toLowerCase().includes("airport transfer") ||
        pageText?.toLowerCase().includes("extra") || false;
      console.log(`  [detail] Add-ons section: ${hasAddons}`);

      // Check for promo code
      const hasPromo = pageText?.toLowerCase().includes("promo") ||
        pageText?.toLowerCase().includes("coupon") ||
        pageText?.toLowerCase().includes("discount code") || false;
      console.log(`  [detail] Promo code input: ${hasPromo}`);

      // Check for date picker
      const datePickers = await page.locator('input[type="date"], [class*="date"], [class*="calendar"], [class*="DatePicker"]').count().catch(() => 0);
      console.log(`  [detail] Date picker elements: ${datePickers}`);

      // Check for price
      const hasPrice = pageText?.includes("AED") || pageText?.includes("$") || pageText?.includes("night") || false;
      console.log(`  [detail] Price displayed: ${hasPrice}`);

    } catch (e) {
      console.log(`  [detail] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-property-detail-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });

  // ============================
  // SECTION 8: Cross-domain bridge - Open Booking Site Admin
  // ============================
  test("8. Cross-domain bridge - Open Booking Site Admin link", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const signedIn = await hubSignIn(page);
      expect(signedIn).toBe(true);

      await page.goto(`${HUB}/dashboard/booking-site`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Look for "Open Booking Site" or similar link
      const openLink = page.locator('a:has-text("Open Booking"), a:has-text("View Site"), a:has-text("Open Site"), a:has-text("Booking Site Admin"), button:has-text("Open Booking"), a:has-text("Visit")').first();
      const openLinkVisible = await openLink.isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  [bridge] "Open Booking Site" link visible: ${openLinkVisible}`);

      if (openLinkVisible) {
        const href = await openLink.getAttribute("href").catch(() => "");
        console.log(`  [bridge] Link href: ${href}`);

        // Check if it points to nfstay.app with auth params
        const hasAuthParam = href?.includes("token") || href?.includes("auth") || href?.includes("session") || false;
        console.log(`  [bridge] Link includes auth params: ${hasAuthParam}`);
      }

      // Also check for any external links to nfstay.app
      const nfstayLinks = await page.locator('a[href*="nfstay.app"]').evaluateAll(els =>
        els.map(el => ({ text: (el as HTMLElement).innerText?.trim(), href: el.getAttribute("href") }))
      ).catch(() => []);
      console.log(`  [bridge] All nfstay.app links: ${JSON.stringify(nfstayLinks)}`);

      await snap(page, "op-cross-domain-bridge.png");

      // Also look for the link in sidebar or navigation
      const sidebarLinks = await page.locator('nav a, aside a, [class*="sidebar"] a, [class*="Sidebar"] a').evaluateAll(els =>
        els.filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }).map(el => ({ text: (el as HTMLElement).innerText?.trim().slice(0, 50), href: el.getAttribute("href") }))
      ).catch(() => []);
      console.log(`  [bridge] Sidebar links: ${JSON.stringify(sidebarLinks.slice(0, 15))}`);

    } catch (e) {
      console.log(`  [bridge] ERROR: ${(e as Error).message.slice(0, 200)}`);
      await snap(page, "op-cross-domain-bridge-error.png");
      throw e;
    } finally {
      await ctx.close();
    }
  });
});
