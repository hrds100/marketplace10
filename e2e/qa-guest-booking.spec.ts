import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const NFSTAY_APP = "https://nfstay.app";
const HUB_URL = "https://hub.nfstay.com";

// Helper to take a named screenshot
async function snap(page: any, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, name),
    fullPage: true,
  });
}

test.describe("GUEST BOOKING EXPERIENCE — nfstay.app", () => {
  // ─── 1. Homepage loads ────────────────────────────────────────────
  test("1. nfstay.app homepage loads", async ({ page }) => {
    const findings: string[] = [];
    try {
      const res = await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = res?.status() ?? 0;
      findings.push(`Homepage HTTP status: ${status}`);
      expect(status).toBeLessThan(400);

      // Wait for any visible content
      await page.waitForTimeout(3000);
      const title = await page.title();
      findings.push(`Page title: "${title}"`);

      const bodyText = await page.innerText("body").catch(() => "(empty)");
      findings.push(
        `Body text length: ${bodyText.length} chars (first 200): ${bodyText.slice(0, 200)}`
      );

      await snap(page, "nfstay-app-homepage.png");
      findings.push("Screenshot: nfstay-app-homepage.png");
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
      await snap(page, "nfstay-app-homepage.png").catch(() => {});
    }
    console.log("\n=== TEST 1: HOMEPAGE ===\n" + findings.join("\n"));
  });

  // ─── 2. Browse available properties ───────────────────────────────
  test("2. Browse available properties / listings", async ({ page }) => {
    const findings: string[] = [];
    try {
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Look for property cards or listings
      const propertySelectors = [
        '[data-testid="property-card"]',
        ".property-card",
        ".listing-card",
        'a[href*="property"]',
        'a[href*="listing"]',
        'a[href*="room"]',
        'a[href*="stay"]',
        ".card",
        'div[class*="property"]',
        'div[class*="listing"]',
        'div[class*="card"]',
      ];

      let foundSelector = "";
      let count = 0;
      for (const sel of propertySelectors) {
        try {
          const els = await page.locator(sel).all();
          if (els.length > 0) {
            foundSelector = sel;
            count = els.length;
            findings.push(`Found ${count} elements matching "${sel}"`);
            break;
          }
        } catch {
          // ignore
        }
      }

      if (!foundSelector) {
        findings.push("No property/listing cards found with common selectors");
      }

      // Check for navigation links
      const links = await page.locator("a").all();
      const hrefs: string[] = [];
      for (const link of links.slice(0, 30)) {
        const href = await link.getAttribute("href").catch(() => null);
        if (href) hrefs.push(href);
      }
      findings.push(`Links found (first 30): ${hrefs.join(", ")}`);

      // Look for search / filter elements
      const searchInput = await page
        .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="find" i], input[placeholder*="location" i]')
        .first()
        .isVisible()
        .catch(() => false);
      findings.push(`Search input visible: ${searchInput}`);

    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log("\n=== TEST 2: BROWSE PROPERTIES ===\n" + findings.join("\n"));
  });

  // ─── 3. Property detail page ──────────────────────────────────────
  test("3. Click into a property listing — detail page", async ({ page }) => {
    const findings: string[] = [];
    try {
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Try to find a clickable property link
      const propertyLinks = [
        'a[href*="property"]',
        'a[href*="listing"]',
        'a[href*="room"]',
        'a[href*="stay"]',
        ".card a",
        'div[class*="card"] a',
        'div[class*="property"] a',
      ];

      let clicked = false;
      for (const sel of propertyLinks) {
        try {
          const link = page.locator(sel).first();
          if (await link.isVisible({ timeout: 2000 })) {
            await link.click();
            clicked = true;
            findings.push(`Clicked property link: "${sel}"`);
            break;
          }
        } catch {
          // next
        }
      }

      if (!clicked) {
        // Try clicking any card-like element
        const allLinks = await page.locator("a").all();
        for (const link of allLinks) {
          const href = await link.getAttribute("href").catch(() => "");
          const text = await link.innerText().catch(() => "");
          if (
            href &&
            !href.startsWith("#") &&
            !href.includes("login") &&
            !href.includes("sign") &&
            text.length > 5
          ) {
            try {
              await link.click();
              clicked = true;
              findings.push(`Clicked link: "${text.slice(0, 50)}" → ${href}`);
              break;
            } catch {
              // next
            }
          }
        }
      }

      if (!clicked) {
        findings.push("Could not find any property link to click");
      } else {
        await page.waitForTimeout(3000);
        const url = page.url();
        findings.push(`Detail page URL: ${url}`);

        // Check for detail page elements
        const checks = {
          "Photos/gallery": 'img, [class*="gallery"], [class*="carousel"], [class*="slider"], [class*="photo"]',
          "Description": 'p, [class*="description"], [class*="about"]',
          "Pricing": '[class*="price"], [class*="pricing"], [class*="cost"], [class*="rate"]',
          "Availability calendar": '[class*="calendar"], [class*="date"], input[type="date"], [class*="availability"]',
          "Book Now button": 'button:has-text("Book"), button:has-text("Reserve"), a:has-text("Book"), a:has-text("Reserve")',
          "Contact button": 'button:has-text("Contact"), button:has-text("Enquir"), a:has-text("Contact"), button:has-text("Message")',
        };

        for (const [name, sel] of Object.entries(checks)) {
          try {
            const visible = await page
              .locator(sel)
              .first()
              .isVisible({ timeout: 2000 });
            findings.push(`${visible ? "✅" : "❌"} ${name}`);
          } catch {
            findings.push(`❌ ${name} — not found`);
          }
        }

        await snap(page, "nfstay-app-property.png");
        findings.push("Screenshot: nfstay-app-property.png");
      }
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
      await snap(page, "nfstay-app-property.png").catch(() => {});
    }
    console.log(
      "\n=== TEST 3: PROPERTY DETAIL PAGE ===\n" + findings.join("\n")
    );
  });

  // ─── 4 & 5. Booking flow + payment wall ───────────────────────────
  test("4-5. Attempt booking — proceed until payment wall", async ({
    page,
  }) => {
    const findings: string[] = [];
    try {
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Navigate to a property first
      const propertyLinks = [
        'a[href*="property"]',
        'a[href*="listing"]',
        'a[href*="room"]',
        ".card a",
        'div[class*="card"] a',
      ];

      let onDetail = false;
      for (const sel of propertyLinks) {
        try {
          const link = page.locator(sel).first();
          if (await link.isVisible({ timeout: 2000 })) {
            await link.click();
            onDetail = true;
            break;
          }
        } catch {
          // next
        }
      }

      if (!onDetail) {
        findings.push("Could not navigate to a property detail page");
      }

      await page.waitForTimeout(2000);

      // Try to click Book Now / Reserve button
      const bookButtons = [
        'button:has-text("Book")',
        'button:has-text("Reserve")',
        'a:has-text("Book Now")',
        'a:has-text("Reserve")',
        'button:has-text("Check availability")',
        'button:has-text("Request")',
        '[data-testid="book-now"]',
      ];

      let bookClicked = false;
      for (const sel of bookButtons) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 2000 })) {
            const btnText = await btn.innerText().catch(() => "");
            await btn.click();
            bookClicked = true;
            findings.push(`Clicked booking button: "${btnText}"`);
            break;
          }
        } catch {
          // next
        }
      }

      if (!bookClicked) {
        findings.push("No Book/Reserve button found on page");
      }

      await page.waitForTimeout(3000);
      const bookingUrl = page.url();
      findings.push(`URL after booking attempt: ${bookingUrl}`);

      // Check for payment wall / checkout elements
      const paymentChecks = [
        '[class*="payment"]',
        '[class*="checkout"]',
        '[class*="stripe"]',
        'input[name*="card"]',
        'iframe[src*="stripe"]',
        'iframe[src*="payment"]',
        '[class*="pay"]',
        'form[action*="pay"]',
        'button:has-text("Pay")',
        'button:has-text("Complete")',
        'button:has-text("Confirm")',
      ];

      let paymentFound = false;
      for (const sel of paymentChecks) {
        try {
          const vis = await page
            .locator(sel)
            .first()
            .isVisible({ timeout: 2000 });
          if (vis) {
            paymentFound = true;
            findings.push(`✅ Payment element found: "${sel}"`);
          }
        } catch {
          // next
        }
      }

      if (!paymentFound) {
        findings.push("❌ No payment wall / checkout form detected");
      }

      // Log where booking stopped
      findings.push(`Booking flow stopped at: ${page.url()}`);

      await snap(page, "nfstay-app-booking-flow.png");
      findings.push("Screenshot: nfstay-app-booking-flow.png");
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
      await snap(page, "nfstay-app-booking-flow.png").catch(() => {});
    }
    console.log(
      "\n=== TEST 4-5: BOOKING FLOW + PAYMENT WALL ===\n" +
        findings.join("\n")
    );
  });

  // ─── 7. Chat / enquiry with operator ──────────────────────────────
  test("7. Chat / enquiry feature", async ({ page }) => {
    const findings: string[] = [];
    try {
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      const chatSelectors = [
        '[class*="chat"]',
        '[id*="chat"]',
        'button:has-text("Chat")',
        'button:has-text("Message")',
        'a:has-text("Chat")',
        '[class*="intercom"]',
        '[class*="crisp"]',
        '[class*="tawk"]',
        '[class*="drift"]',
        '[class*="zendesk"]',
        '[class*="widget"]',
        'iframe[src*="chat"]',
        '[class*="enquir"]',
        'button:has-text("Enquir")',
        'a:has-text("Contact")',
        'button:has-text("Contact")',
        'form[class*="contact"]',
        'form[class*="enquir"]',
      ];

      let chatFound = false;
      for (const sel of chatSelectors) {
        try {
          const vis = await page
            .locator(sel)
            .first()
            .isVisible({ timeout: 1500 });
          if (vis) {
            chatFound = true;
            findings.push(`✅ Chat/enquiry element found: "${sel}"`);
          }
        } catch {
          // next
        }
      }

      if (!chatFound) {
        findings.push("❌ No chat widget or enquiry form detected on homepage");
      }
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log(
      "\n=== TEST 7: CHAT / ENQUIRY ===\n" + findings.join("\n")
    );
  });

  // ─── 8. Mobile layout ─────────────────────────────────────────────
  test("8. Mobile layout (375x812)", async ({ browser }) => {
    const findings: string[] = [];
    try {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      });
      const page = await context.newPage();

      // Mobile homepage
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      const bodyWidth = await page.evaluate(
        () => document.body.scrollWidth
      );
      findings.push(`Body scroll width: ${bodyWidth}px (viewport: 375px)`);
      if (bodyWidth > 400) {
        findings.push("⚠️ Horizontal overflow detected on mobile");
      } else {
        findings.push("✅ No horizontal overflow");
      }

      // Check for mobile nav (hamburger)
      const hamburger = await page
        .locator(
          'button[class*="menu"], button[aria-label*="menu" i], [class*="hamburger"], [class*="mobile-nav"], button[class*="nav"]'
        )
        .first()
        .isVisible()
        .catch(() => false);
      findings.push(`Mobile nav / hamburger: ${hamburger ? "✅ Found" : "❌ Not found"}`);

      // Check text readability - nothing smaller than 12px
      const smallText = await page.evaluate(() => {
        const els = document.querySelectorAll("*");
        let tooSmall = 0;
        for (const el of els) {
          const style = window.getComputedStyle(el);
          const size = parseFloat(style.fontSize);
          if (el.textContent && el.textContent.trim().length > 0 && size < 12 && size > 0) {
            tooSmall++;
          }
        }
        return tooSmall;
      });
      findings.push(
        `Elements with font-size < 12px: ${smallText} ${smallText > 0 ? "⚠️" : "✅"}`
      );

      // Check images aren't overflowing
      const overflowingImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll("img");
        let overflow = 0;
        for (const img of imgs) {
          if (img.offsetWidth > 375) overflow++;
        }
        return overflow;
      });
      findings.push(
        `Overflowing images: ${overflowingImages} ${overflowingImages > 0 ? "⚠️" : "✅"}`
      );

      await snap(page, "nfstay-app-mobile.png");
      findings.push("Screenshot: nfstay-app-mobile.png");

      await context.close();
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log(
      "\n=== TEST 8: MOBILE LAYOUT ===\n" + findings.join("\n")
    );
  });

  // ─── 9. Sign-up flow on nfstay.app ────────────────────────────────
  test("9. Sign-up flow on nfstay.app", async ({ page }) => {
    const findings: string[] = [];
    try {
      await page.goto(NFSTAY_APP, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);

      // Look for sign-up / login links
      const authLinks = [
        'a:has-text("Sign Up")',
        'a:has-text("Register")',
        'a:has-text("Sign In")',
        'a:has-text("Login")',
        'a:has-text("Log In")',
        'button:has-text("Sign Up")',
        'button:has-text("Register")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'a[href*="sign"]',
        'a[href*="login"]',
        'a[href*="register"]',
        'a[href*="auth"]',
      ];

      let authFound = false;
      for (const sel of authLinks) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 1500 })) {
            const text = await el.innerText().catch(() => "");
            const href = await el.getAttribute("href").catch(() => "");
            findings.push(
              `✅ Auth link found: "${text}" → ${href}`
            );
            authFound = true;

            // Click it to see the auth page
            await el.click();
            await page.waitForTimeout(2000);
            findings.push(`Auth page URL: ${page.url()}`);

            // Check if it redirects to hub
            if (page.url().includes("hub.nfstay.com")) {
              findings.push("Auth redirects to hub.nfstay.com (shared auth)");
            } else {
              findings.push("Auth stays on nfstay.app (separate auth)");
              // Check for form elements
              const hasEmail = await page
                .locator('input[type="email"], input[name="email"]')
                .first()
                .isVisible()
                .catch(() => false);
              const hasPassword = await page
                .locator('input[type="password"]')
                .first()
                .isVisible()
                .catch(() => false);
              findings.push(`Email input: ${hasEmail ? "✅" : "❌"}`);
              findings.push(`Password input: ${hasPassword ? "✅" : "❌"}`);
            }
            break;
          }
        } catch {
          // next
        }
      }

      if (!authFound) {
        findings.push("❌ No sign-up/login link found on nfstay.app");
      }
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log(
      "\n=== TEST 9: SIGN-UP FLOW ===\n" + findings.join("\n")
    );
  });
});

test.describe("HUB SIDE — booking-related guest pages", () => {
  // ─── 10. Hub booking-related pages ────────────────────────────────
  test("10. hub.nfstay.com — booking-related guest pages", async ({
    page,
  }) => {
    const findings: string[] = [];
    try {
      await page.goto(HUB_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Check for booking-related links on hub
      const bookingPaths = [
        "/book",
        "/booking",
        "/bookings",
        "/reserve",
        "/guest",
        "/stay",
        "/properties",
        "/listings",
      ];

      for (const path of bookingPaths) {
        try {
          const res = await page.goto(`${HUB_URL}${path}`, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
          const status = res?.status() ?? 0;
          const finalUrl = page.url();
          const bodyLen = await page
            .innerText("body")
            .then((t) => t.length)
            .catch(() => 0);
          if (status < 400 && bodyLen > 100) {
            findings.push(
              `✅ ${HUB_URL}${path} → ${status} (${bodyLen} chars) final: ${finalUrl}`
            );
          } else {
            findings.push(
              `❌ ${HUB_URL}${path} → ${status} (${bodyLen} chars) final: ${finalUrl}`
            );
          }
        } catch (e: any) {
          findings.push(`❌ ${HUB_URL}${path} → ERROR: ${e.message.slice(0, 80)}`);
        }
      }

      // Also check hub homepage for any guest booking CTA
      await page.goto(HUB_URL, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(2000);

      const bookingLinks = await page
        .locator(
          'a[href*="book"], a[href*="nfstay.app"], a:has-text("Book"), a:has-text("Guest")'
        )
        .all();
      for (const link of bookingLinks.slice(0, 10)) {
        const href = await link.getAttribute("href").catch(() => "");
        const text = await link.innerText().catch(() => "");
        findings.push(`Hub booking link: "${text.slice(0, 40)}" → ${href}`);
      }

      if (bookingLinks.length === 0) {
        findings.push("No booking-related links found on hub homepage");
      }
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log(
      "\n=== TEST 10: HUB BOOKING PAGES ===\n" + findings.join("\n")
    );
  });

  // ─── 11. Hub booking preview / guest-facing page ──────────────────
  test("11. Hub — booking preview or guest-facing booking page", async ({
    page,
  }) => {
    const findings: string[] = [];
    try {
      // Check deals page for any guest-visible content
      const guestPaths = [
        "/deals",
        "/marketplace",
        "/explore",
      ];

      for (const path of guestPaths) {
        try {
          const res = await page.goto(`${HUB_URL}${path}`, {
            waitUntil: "domcontentloaded",
            timeout: 10000,
          });
          const status = res?.status() ?? 0;
          const finalUrl = page.url();
          const bodyLen = await page
            .innerText("body")
            .then((t) => t.length)
            .catch(() => 0);
          findings.push(
            `${status < 400 ? "✅" : "❌"} ${HUB_URL}${path} → ${status} (${bodyLen} chars) final: ${finalUrl}`
          );

          // If accessible, check if it has property listings
          if (status < 400 && bodyLen > 200) {
            const hasCards = await page
              .locator('[class*="card"], [class*="property"], [class*="listing"]')
              .first()
              .isVisible({ timeout: 3000 })
              .catch(() => false);
            findings.push(`  Has property cards: ${hasCards ? "✅" : "❌"}`);
          }
        } catch (e: any) {
          findings.push(`❌ ${HUB_URL}${path} → ERROR: ${e.message.slice(0, 80)}`);
        }
      }
    } catch (e: any) {
      findings.push(`FAIL: ${e.message}`);
    }
    console.log(
      "\n=== TEST 11: HUB GUEST-FACING PAGES ===\n" + findings.join("\n")
    );
  });
});
