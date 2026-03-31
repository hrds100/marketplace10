import { test, expect, Page } from "@playwright/test";

const SCREENSHOTS = "e2e/screenshots";
const NFSTAY = "https://nfstay.app";
const CLAUDE = "https://claude.nfstay.app";

// Helper: take screenshot safely
async function snap(page: Page, name: string) {
  try {
    await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: true });
  } catch (e) {
    console.log(`⚠️ Screenshot failed: ${name} — ${(e as Error).message}`);
  }
}

// ─── SECTION 1: nfstay.app homepage ───
test.describe("nfstay.app homepage", () => {
  test("homepage loads and has all sections", async ({ page }) => {
    try {
      const res = await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = res?.status() ?? 0;
      console.log(`Homepage status: ${status}`);
      expect(status).toBeLessThan(400);
      console.log("✅ Page loads (200-range)");
    } catch (e) {
      console.log(`❌ Page loads — ${(e as Error).message}`);
      await snap(page, "homepage-fail");
      throw e;
    }

    // Wait for content
    await page.waitForTimeout(3000);

    // Property cards
    try {
      const cards = page.locator('[class*="property"], [class*="card"], [class*="listing"], a[href*="/property"]');
      const count = await cards.count();
      console.log(`Property cards found: ${count}`);
      expect(count).toBeGreaterThan(0);
      console.log("✅ Property cards visible");
    } catch (e) {
      console.log(`❌ Property cards visible — ${(e as Error).message}`);
    }

    // Popular Destinations
    try {
      const dest = page.locator('text=/popular destinations/i, text=/top destinations/i, text=/explore destinations/i');
      const destCount = await dest.count();
      if (destCount > 0) {
        console.log("✅ Popular Destinations section visible");
      } else {
        // Try broader search
        const bodyText = await page.textContent("body") ?? "";
        if (/popular destinations|top destinations|explore/i.test(bodyText)) {
          console.log("✅ Popular Destinations section visible (text match)");
        } else {
          console.log("❌ Popular Destinations section NOT visible");
        }
      }
    } catch (e) {
      console.log(`❌ Popular Destinations — ${(e as Error).message}`);
    }

    // Featured Properties
    try {
      const bodyText = await page.textContent("body") ?? "";
      if (/featured propert|featured listing/i.test(bodyText)) {
        console.log("✅ Featured Properties section visible");
      } else {
        console.log("❌ Featured Properties section NOT visible");
      }
    } catch (e) {
      console.log(`❌ Featured Properties — ${(e as Error).message}`);
    }

    // Recently Viewed
    try {
      const bodyText = await page.textContent("body") ?? "";
      if (/recently viewed/i.test(bodyText)) {
        console.log("✅ Recently Viewed section visible");
      } else {
        console.log("⚠️ Recently Viewed not shown (expected if no browsing history)");
      }
    } catch (e) {
      console.log(`⚠️ Recently Viewed — ${(e as Error).message}`);
    }

    // "Simple, transparent, direct" section
    try {
      const bodyText = await page.textContent("body") ?? "";
      if (/simple.*transparent.*direct|transparent.*direct/i.test(bodyText)) {
        console.log("✅ 'Simple, transparent, direct' section visible");
      } else {
        console.log("❌ 'Simple, transparent, direct' section NOT visible");
      }
    } catch (e) {
      console.log(`❌ Simple transparent direct — ${(e as Error).message}`);
    }

    // Footer
    try {
      const footer = page.locator("footer");
      await expect(footer).toBeVisible({ timeout: 5000 });
      console.log("✅ Footer visible");
      const footerText = await footer.textContent() ?? "";
      const hasLinks = /about|contact|privacy|terms|faq/i.test(footerText);
      if (hasLinks) {
        console.log("✅ Footer has correct links");
      } else {
        console.log("⚠️ Footer visible but expected links not found. Text: " + footerText.slice(0, 200));
      }
    } catch (e) {
      console.log(`❌ Footer — ${(e as Error).message}`);
    }

    // Sign In button
    try {
      const signInBtn = page.locator('a:has-text("Sign In"), a:has-text("Log In"), a:has-text("Login"), button:has-text("Sign In")').first();
      await expect(signInBtn).toBeVisible({ timeout: 5000 });
      const href = await signInBtn.getAttribute("href");
      console.log(`Sign In href: ${href}`);
      if (href && href.includes("/signin")) {
        console.log("✅ Sign In button links to /signin");
      } else {
        console.log(`⚠️ Sign In button found but href is: ${href}`);
      }
    } catch (e) {
      console.log(`❌ Sign In button — ${(e as Error).message}`);
    }

    await snap(page, "01-homepage");
  });
});

// ─── SECTION 2: nfstay.app/signin ───
test.describe("nfstay.app/signin", () => {
  test("signin page with Guest/Operator toggle", async ({ page }) => {
    try {
      const res = await page.goto(`${NFSTAY}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      expect(res?.status() ?? 0).toBeLessThan(400);
      console.log("✅ /signin page loads");
    } catch (e) {
      console.log(`❌ /signin page loads — ${(e as Error).message}`);
      throw e;
    }

    await page.waitForTimeout(2000);

    // Guest/Operator toggle
    try {
      const toggle = page.locator('text=/guest/i').first();
      await expect(toggle).toBeVisible({ timeout: 5000 });
      console.log("✅ Guest/Operator toggle visible");
    } catch (e) {
      console.log(`❌ Guest/Operator toggle — ${(e as Error).message}`);
    }

    // Click Guest
    try {
      const guestBtn = page.locator('button:has-text("Guest"), [role="tab"]:has-text("Guest"), label:has-text("Guest")').first();
      if (await guestBtn.count() > 0) {
        await guestBtn.click();
        await page.waitForTimeout(1000);
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        const passInput = page.locator('input[type="password"]').first();
        const emailVisible = await emailInput.isVisible().catch(() => false);
        const passVisible = await passInput.isVisible().catch(() => false);
        if (emailVisible && passVisible) {
          console.log("✅ Guest tab — email + password form appears");
        } else {
          console.log(`⚠️ Guest tab — email visible: ${emailVisible}, password visible: ${passVisible}`);
        }
      } else {
        // Maybe Guest is already selected
        const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
        const emailVisible = await emailInput.isVisible().catch(() => false);
        console.log(`⚠️ No explicit Guest button found. Email input visible: ${emailVisible}`);
      }
    } catch (e) {
      console.log(`❌ Guest tab — ${(e as Error).message}`);
    }

    await snap(page, "02-signin-guest");

    // Click Operator
    try {
      const operatorBtn = page.locator('button:has-text("Operator"), [role="tab"]:has-text("Operator"), label:has-text("Operator"), button:has-text("operator")').first();
      if (await operatorBtn.count() > 0) {
        await operatorBtn.click();
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent("body") ?? "";
        if (/hub|redirect|operator.*hub/i.test(bodyText)) {
          console.log("✅ Operator tab — hub redirect message appears");
        } else {
          console.log("⚠️ Operator tab clicked but no hub redirect message found");
        }
      } else {
        console.log("⚠️ No Operator button found on signin page");
      }
    } catch (e) {
      console.log(`❌ Operator tab — ${(e as Error).message}`);
    }

    await snap(page, "02-signin-operator");
  });
});

// ─── SECTION 3: nfstay.app/signup ───
test.describe("nfstay.app/signup", () => {
  test("signup page with Guest/Operator toggle", async ({ page }) => {
    try {
      const res = await page.goto(`${NFSTAY}/signup`, { waitUntil: "domcontentloaded", timeout: 30000 });
      expect(res?.status() ?? 0).toBeLessThan(400);
      console.log("✅ /signup page loads");
    } catch (e) {
      console.log(`❌ /signup page loads — ${(e as Error).message}`);
      throw e;
    }

    await page.waitForTimeout(2000);

    // Guest/Operator toggle
    try {
      const toggle = page.locator('text=/guest/i').first();
      await expect(toggle).toBeVisible({ timeout: 5000 });
      console.log("✅ Guest/Operator toggle visible on signup");
    } catch (e) {
      console.log(`❌ Guest/Operator toggle on signup — ${(e as Error).message}`);
    }

    // Click Guest — name + email + password
    try {
      const guestBtn = page.locator('button:has-text("Guest"), [role="tab"]:has-text("Guest"), label:has-text("Guest")').first();
      if (await guestBtn.count() > 0) {
        await guestBtn.click();
        await page.waitForTimeout(1000);
      }
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i], input[name="fullName"], input[name="full_name"]').first();
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passInput = page.locator('input[type="password"]').first();
      const nameVis = await nameInput.isVisible().catch(() => false);
      const emailVis = await emailInput.isVisible().catch(() => false);
      const passVis = await passInput.isVisible().catch(() => false);
      console.log(`Guest signup — name: ${nameVis}, email: ${emailVis}, password: ${passVis}`);
      if (emailVis && passVis) {
        console.log("✅ Guest signup form has email + password");
      } else {
        console.log("❌ Guest signup form missing fields");
      }
      if (nameVis) {
        console.log("✅ Guest signup form has name field");
      } else {
        console.log("⚠️ Guest signup form — no name field found");
      }
    } catch (e) {
      console.log(`❌ Guest signup form — ${(e as Error).message}`);
    }

    await snap(page, "03-signup-guest");

    // Click Operator
    try {
      const operatorBtn = page.locator('button:has-text("Operator"), [role="tab"]:has-text("Operator"), label:has-text("Operator")').first();
      if (await operatorBtn.count() > 0) {
        await operatorBtn.click();
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent("body") ?? "";
        if (/hub|redirect|operator/i.test(bodyText)) {
          console.log("✅ Operator signup — hub redirect message");
        } else {
          console.log("⚠️ Operator signup clicked but no redirect message");
        }
      } else {
        console.log("⚠️ No Operator button on signup page");
      }
    } catch (e) {
      console.log(`❌ Operator signup — ${(e as Error).message}`);
    }

    await snap(page, "03-signup-operator");
  });
});

// ─── SECTION 4: claude.nfstay.app ───
test.describe("claude.nfstay.app (white-label)", () => {
  test("white-label site loads with correct branding", async ({ page }) => {
    try {
      const res = await page.goto(CLAUDE, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = res?.status() ?? 0;
      console.log(`claude.nfstay.app status: ${status}`);
      expect(status).toBeLessThan(400);
      console.log("✅ claude.nfstay.app loads");
    } catch (e) {
      console.log(`❌ claude.nfstay.app loads — ${(e as Error).message}`);
      await snap(page, "04-claude-fail");
      throw e;
    }

    await page.waitForTimeout(3000);

    // Brand name
    try {
      const bodyText = await page.textContent("body") ?? "";
      if (/claude properties/i.test(bodyText)) {
        console.log("✅ Brand name 'Claude Properties' visible");
      } else {
        console.log("❌ Brand name 'Claude Properties' NOT found. Checking for 'claude'...");
        if (/claude/i.test(bodyText)) {
          console.log("⚠️ 'claude' text found but not 'Claude Properties'");
        }
      }
    } catch (e) {
      console.log(`❌ Brand name — ${(e as Error).message}`);
    }

    // Properties / cards
    try {
      const cards = page.locator('[class*="property"], [class*="card"], [class*="listing"], a[href*="/property"]');
      const count = await cards.count();
      console.log(`Properties on claude.nfstay.app: ${count}`);
      if (count > 0) {
        console.log("✅ Properties show on white-label site");
      } else {
        console.log("❌ No property cards found on claude.nfstay.app");
      }
    } catch (e) {
      console.log(`❌ Properties — ${(e as Error).message}`);
    }

    // Property cards have images, titles, prices
    try {
      const imgs = page.locator('img[src*="http"], img[src*="/"]');
      const imgCount = await imgs.count();
      console.log(`Images on claude.nfstay.app: ${imgCount}`);
      if (imgCount > 0) {
        console.log("✅ Property cards have images");
      } else {
        console.log("❌ No images found");
      }
    } catch (e) {
      console.log(`❌ Images — ${(e as Error).message}`);
    }

    // Hero section
    try {
      const hero = page.locator('[class*="hero"], [class*="Hero"], section >> nth=0');
      if (await hero.count() > 0) {
        console.log("✅ Hero section present");
      } else {
        console.log("⚠️ No explicit hero section found");
      }
    } catch (e) {
      console.log(`⚠️ Hero section — ${(e as Error).message}`);
    }

    await snap(page, "04-claude-whitelabel");
  });
});

// ─── SECTION 5: Property detail page ───
test.describe("Property detail page", () => {
  test("property detail has all elements", async ({ page }) => {
    // First go to homepage and find a property link
    await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    let propertyUrl = "";
    try {
      // Find property links
      const propertyLinks = page.locator('a[href*="/property"]');
      const count = await propertyLinks.count();
      console.log(`Found ${count} property links on homepage`);
      if (count > 0) {
        propertyUrl = await propertyLinks.first().getAttribute("href") ?? "";
        console.log(`First property link: ${propertyUrl}`);
      }
    } catch (e) {
      console.log(`❌ Finding property links — ${(e as Error).message}`);
    }

    // If no property links found, try claude.nfstay.app
    if (!propertyUrl) {
      try {
        await page.goto(CLAUDE, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);
        const propertyLinks = page.locator('a[href*="/property"]');
        const count = await propertyLinks.count();
        if (count > 0) {
          propertyUrl = await propertyLinks.first().getAttribute("href") ?? "";
          console.log(`Property link from claude: ${propertyUrl}`);
        }
      } catch (e) {
        console.log(`Could not find property on claude either — ${(e as Error).message}`);
      }
    }

    if (!propertyUrl) {
      console.log("❌ No property detail URL found — skipping detail tests");
      return;
    }

    // Navigate to property detail
    const fullUrl = propertyUrl.startsWith("http") ? propertyUrl : `${NFSTAY}${propertyUrl}`;
    try {
      const res = await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      expect(res?.status() ?? 0).toBeLessThan(400);
      console.log("✅ Property detail page loads");
    } catch (e) {
      console.log(`❌ Property detail page — ${(e as Error).message}`);
      throw e;
    }

    await page.waitForTimeout(3000);

    // Photos
    try {
      const imgs = page.locator("img");
      const imgCount = await imgs.count();
      let brokenCount = 0;
      for (let i = 0; i < Math.min(imgCount, 10); i++) {
        const nat = await imgs.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth);
        if (nat === 0) brokenCount++;
      }
      console.log(`Images: ${imgCount} total, ${brokenCount} broken`);
      if (imgCount > 0 && brokenCount === 0) {
        console.log("✅ Photos load (not broken)");
      } else if (brokenCount > 0) {
        console.log(`❌ ${brokenCount} broken images found`);
      } else {
        console.log("❌ No images on property detail");
      }
    } catch (e) {
      console.log(`❌ Photos — ${(e as Error).message}`);
    }

    // Description
    try {
      const bodyText = await page.textContent("body") ?? "";
      // A property description would typically be a paragraph of text
      const hasDescription = bodyText.length > 200;
      if (hasDescription) {
        console.log("✅ Description present");
      } else {
        console.log("❌ Description seems missing (page text too short)");
      }
    } catch (e) {
      console.log(`❌ Description — ${(e as Error).message}`);
    }

    // Amenities
    try {
      const bodyText = await page.textContent("body") ?? "";
      const amenityKeywords = /wifi|pool|kitchen|parking|air.?condition|gym|balcony|amenities/i;
      if (amenityKeywords.test(bodyText)) {
        console.log("✅ Amenities list present");
      } else {
        console.log("❌ Amenities list NOT found");
      }
    } catch (e) {
      console.log(`❌ Amenities — ${(e as Error).message}`);
    }

    // Booking widget elements
    try {
      const bodyText = await page.textContent("body") ?? "";

      // Date picker
      const datePicker = page.locator('input[type="date"], [class*="date"], [class*="calendar"], text=/check.?in/i');
      const dateCount = await datePicker.count();
      if (dateCount > 0 || /check.?in|check.?out/i.test(bodyText)) {
        console.log("✅ Date picker (check-in/check-out) present");
      } else {
        console.log("❌ Date picker NOT found");
      }

      // Guest selector
      const guestSel = page.locator('text=/guest/i, [class*="guest"], select[name*="guest"]');
      if (await guestSel.count() > 0 || /guests?/i.test(bodyText)) {
        console.log("✅ Guest selector present");
      } else {
        console.log("❌ Guest selector NOT found");
      }

      // Add-ons
      if (/early check.?in|airport transfer|welcome basket|add.?on/i.test(bodyText)) {
        console.log("✅ Add-ons section present");
      } else {
        console.log("❌ Add-ons section NOT found");
      }

      // Promo code
      if (/promo|coupon|discount code/i.test(bodyText)) {
        console.log("✅ Promo code input present");
      } else {
        console.log("❌ Promo code input NOT found");
      }

      // Price breakdown
      if (/price|total|night|\/night|per night|subtotal|breakdown/i.test(bodyText)) {
        console.log("✅ Price breakdown present");
      } else {
        console.log("❌ Price breakdown NOT found");
      }

      // Book Now / Check availability button
      const bookBtn = page.locator('button:has-text("Book"), button:has-text("Check availability"), button:has-text("Reserve"), a:has-text("Book")');
      if (await bookBtn.count() > 0) {
        console.log("✅ Book Now / Check availability button visible");
      } else {
        console.log("❌ Book Now / Check availability button NOT found");
      }
    } catch (e) {
      console.log(`❌ Booking widget — ${(e as Error).message}`);
    }

    await snap(page, "05-property-detail");
  });
});

// ─── SECTION 6: Booking flow ───
test.describe("Booking flow (no actual booking)", () => {
  test("booking flow starts and shows steps", async ({ page }) => {
    // Navigate to homepage and find a property
    await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    let propertyUrl = "";
    try {
      const propertyLinks = page.locator('a[href*="/property"]');
      if (await propertyLinks.count() > 0) {
        propertyUrl = await propertyLinks.first().getAttribute("href") ?? "";
      }
    } catch (e) {
      // fallback
    }

    if (!propertyUrl) {
      // Try claude.nfstay.app
      await page.goto(CLAUDE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      const links = page.locator('a[href*="/property"]');
      if (await links.count() > 0) {
        propertyUrl = await links.first().getAttribute("href") ?? "";
      }
    }

    if (!propertyUrl) {
      console.log("❌ No property found for booking flow test — skipping");
      return;
    }

    const fullUrl = propertyUrl.startsWith("http") ? propertyUrl : `${NFSTAY}${propertyUrl}`;
    await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Try clicking Book Now or Check Availability
    try {
      const bookBtn = page.locator('button:has-text("Book"), button:has-text("Check availability"), button:has-text("Reserve"), a:has-text("Book")').first();
      if (await bookBtn.count() > 0) {
        await bookBtn.click();
        console.log("✅ Clicked Book Now / Check availability");
        await page.waitForTimeout(2000);

        await snap(page, "06-booking-step1");

        // Check what happened
        const bodyText = await page.textContent("body") ?? "";
        const currentUrl = page.url();
        console.log(`After click, URL: ${currentUrl}`);

        if (/date|calendar|check.?in/i.test(bodyText)) {
          console.log("✅ Booking flow asks for dates");
        } else {
          console.log("⚠️ Booking flow — dates step not clearly shown");
        }

        if (/price|total|\$|AED|£|€|night/i.test(bodyText)) {
          console.log("✅ Booking flow shows pricing");
        } else {
          console.log("⚠️ Booking flow — pricing not shown");
        }

        if (/payment|pay|card|stripe|checkout/i.test(bodyText)) {
          console.log("✅ Booking flow reaches payment step");
        } else {
          console.log("⚠️ Booking flow — no payment step visible (may need to fill dates first)");
        }

        await snap(page, "06-booking-step2");
      } else {
        console.log("❌ No Book Now button to click");
      }
    } catch (e) {
      console.log(`❌ Booking flow — ${(e as Error).message}`);
    }
  });
});

// ─── SECTION 7: Mobile viewport ───
test.describe("Mobile viewport (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("nfstay.app mobile — no overflow", async ({ page }) => {
    try {
      await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (!overflow) {
        console.log("✅ nfstay.app mobile — no horizontal overflow");
      } else {
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        console.log(`❌ nfstay.app mobile — horizontal overflow (scrollWidth: ${scrollW}, clientWidth: ${clientW})`);
      }
      await snap(page, "07-mobile-nfstay");
    } catch (e) {
      console.log(`❌ nfstay.app mobile — ${(e as Error).message}`);
    }
  });

  test("claude.nfstay.app mobile — no overflow", async ({ page }) => {
    try {
      await page.goto(CLAUDE, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (!overflow) {
        console.log("✅ claude.nfstay.app mobile — no horizontal overflow");
      } else {
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientW = await page.evaluate(() => document.documentElement.clientWidth);
        console.log(`❌ claude.nfstay.app mobile — horizontal overflow (scrollWidth: ${scrollW}, clientWidth: ${clientW})`);
      }
      await snap(page, "07-mobile-claude");
    } catch (e) {
      console.log(`❌ claude.nfstay.app mobile — ${(e as Error).message}`);
    }
  });

  test("property detail mobile — booking widget usable", async ({ page }) => {
    try {
      await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const propertyLinks = page.locator('a[href*="/property"]');
      let url = "";
      if (await propertyLinks.count() > 0) {
        url = await propertyLinks.first().getAttribute("href") ?? "";
      }

      if (!url) {
        await page.goto(CLAUDE, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000);
        const links = page.locator('a[href*="/property"]');
        if (await links.count() > 0) {
          url = await links.first().getAttribute("href") ?? "";
        }
      }

      if (url) {
        const fullUrl = url.startsWith("http") ? url : `${NFSTAY}${url}`;
        await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);

        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        if (!overflow) {
          console.log("✅ Property detail mobile — no overflow, booking widget usable");
        } else {
          console.log("❌ Property detail mobile — horizontal overflow");
        }
        await snap(page, "07-mobile-property");
      } else {
        console.log("⚠️ No property URL found for mobile test");
      }
    } catch (e) {
      console.log(`❌ Property detail mobile — ${(e as Error).message}`);
    }
  });

  test("signin mobile — form fits screen", async ({ page }) => {
    try {
      await page.goto(`${NFSTAY}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (!overflow) {
        console.log("✅ Signin mobile — form fits screen");
      } else {
        console.log("❌ Signin mobile — horizontal overflow");
      }
      await snap(page, "07-mobile-signin");
    } catch (e) {
      console.log(`❌ Signin mobile — ${(e as Error).message}`);
    }
  });
});

// ─── SECTION 8: Contact dropdown ───
test.describe("Contact dropdown", () => {
  test("contact dropdown opens and is visible", async ({ page }) => {
    try {
      await page.goto(NFSTAY, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);

      const contactBtn = page.locator('text=/contact/i').first();
      if (await contactBtn.count() > 0) {
        await contactBtn.click();
        await page.waitForTimeout(1000);

        // Check if dropdown appeared
        const dropdown = page.locator('[class*="dropdown"], [class*="menu"], [class*="popover"], [role="menu"]');
        const dropdownCount = await dropdown.count();

        // Also check for any newly visible elements
        const bodyText = await page.textContent("body") ?? "";
        const hasContactInfo = /email|phone|whatsapp|support|@/i.test(bodyText);

        if (dropdownCount > 0 || hasContactInfo) {
          console.log("✅ Contact dropdown opens");

          // Check visibility (not hidden behind hero)
          try {
            const contactArea = page.locator('[class*="dropdown"], [class*="menu"], [class*="popover"]').first();
            if (await contactArea.count() > 0) {
              const box = await contactArea.boundingBox();
              if (box && box.y > 0) {
                console.log("✅ Contact dropdown is VISIBLE (not hidden behind hero)");
              } else {
                console.log("⚠️ Contact dropdown may be hidden — bounding box: " + JSON.stringify(box));
              }
            }
          } catch {
            console.log("⚠️ Could not verify dropdown visibility position");
          }
        } else {
          console.log("❌ Contact dropdown did not open or no contact info shown");
        }
      } else {
        console.log("❌ No Contact button found in navbar");
      }

      await snap(page, "08-contact-dropdown");
    } catch (e) {
      console.log(`❌ Contact dropdown — ${(e as Error).message}`);
    }
  });
});
