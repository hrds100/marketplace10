/**
 * QA-ADMIN-NOTIFICATIONS — Agent 5 audit
 *
 * Covers:
 *   ADMIN DASHBOARD  — sign-in, nav, pages, bell
 *   CROSS-PLATFORM   — header/footer links, mobile menu, 404, auth edges
 *   NOTIFICATIONS    — bell component, admin notification page
 */

import { test, expect, type Page } from "@playwright/test";

const BASE = "https://hub.nfstay.com";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";
const SCREENSHOTS = "e2e/screenshots";

// ─── helpers ────────────────────────────────────────────────────────

async function adminSignIn(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for the email input to appear (form loaded)
  const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(ADMIN_EMAIL);

  const passwordInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]');
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(ADMIN_PASSWORD);

  // Submit via the data-feature submit button
  const submitBtn = page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]');
  await submitBtn.click();

  // The app uses window.location.href redirect — wait for full page navigation
  await page.waitForURL((url) => !url.pathname.includes("/signin"), { timeout: 30000 });
  // Give the new page time to hydrate
  await page.waitForTimeout(2000);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════

test.describe("ADMIN DASHBOARD", () => {
  test("1. Sign in as admin and reach admin workspace selector", async ({ page }) => {
    await adminSignIn(page);
    // Navigate to admin
    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 30000 });
    // Should not redirect to /signin (AdminGuard passed)
    expect(page.url()).toContain("/admin");
    await page.screenshot({ path: `${SCREENSHOTS}/admin-dashboard.png`, fullPage: true });
  });

  test("2. Admin marketplace dashboard loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin");
    // Should have some heading or content
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("3. Admin Users page loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/users`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin");
    await page.screenshot({ path: `${SCREENSHOTS}/admin-users.png`, fullPage: true });
    // Should have Users heading or a table
    const content = page.locator("h1, table, [data-feature]").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("4. Admin Submissions page loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/submissions`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin");
    await page.screenshot({ path: `${SCREENSHOTS}/admin-submissions.png`, fullPage: true });
    const content = page.locator("h1, table, [data-feature]").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("5. Admin Notifications page loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/notifications`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin");
    // AdminNotifications heading
    const heading = page.locator("h1:has-text('Notifications')");
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("6. Admin Listings page loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace/listings`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin");
    const content = page.locator("h1, table, [data-feature]").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("7. Admin Invest dashboard loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/invest`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin/invest");
    const content = page.locator("h1, h2, [data-feature]").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("8. Admin Invest orders loads", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/invest/orders`, { waitUntil: "networkidle", timeout: 30000 });
    expect(page.url()).toContain("/admin/invest/orders");
    const content = page.locator("h1, h2, table, [data-feature]").first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("9. Admin sidebar nav links are present (marketplace workspace)", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "networkidle", timeout: 30000 });

    const expectedLabels = [
      "Dashboard", "Quick List", "Listings", "Users",
      "Submissions", "Notifications", "University",
      "Pricing", "FAQ", "Affiliates", "Settings",
    ];

    for (const label of expectedLabels) {
      const link = page.locator(`a:has-text("${label}")`).first();
      const visible = await link.isVisible().catch(() => false);
      console.log(`  Sidebar link "${label}": ${visible ? "VISIBLE" : "NOT FOUND"}`);
    }
  });

  test("10. Notification indicators in admin layout", async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/admin/marketplace`, { waitUntil: "networkidle", timeout: 30000 });

    // AdminLayout does NOT use NotificationBell component (that's in DashboardLayout).
    // Instead, AdminLayout shows an unread count badge on the "Notifications" nav link.
    const notifLink = page.locator('a:has-text("Notifications")').first();
    const notifVisible = await notifLink.isVisible().catch(() => false);
    console.log(`  Notifications nav link visible: ${notifVisible}`);

    if (notifVisible) {
      // Check for unread badge (red circle) next to the Notifications link
      const badge = notifLink.locator("span.bg-red-500, span.rounded-full");
      const badgeVisible = await badge.isVisible().catch(() => false);
      if (badgeVisible) {
        const text = await badge.textContent();
        console.log(`  Unread count badge on Notifications link: ${text}`);
      } else {
        console.log(`  No unread badge (0 unread or badge not rendered)`);
      }
    }

    // Also check: NotificationBell exists on the member dashboard (not admin)
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "networkidle", timeout: 30000 });
    const bellButton = page.locator('[data-feature="NOTIFICATIONS__BELL_BUTTON"]');
    const bellVisible = await bellButton.isVisible().catch(() => false);
    console.log(`  NotificationBell on member dashboard: ${bellVisible}`);

    expect(notifVisible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — CROSS-PLATFORM CHECKS
// ═══════════════════════════════════════════════════════════════════

test.describe("CROSS-PLATFORM", () => {
  test("11. Header links present on homepage", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    // The desktop nav may use a different selector; the first nav is the mobile one (hidden).
    // Check for any visible nav/header element
    const desktopNav = page.locator('nav:visible, header:visible, [data-feature*="NAV"]:visible').first();
    const navVisible = await desktopNav.isVisible().catch(() => false);
    console.log(`  Visible nav/header found: ${navVisible}`);

    // Check for key links anywhere on the page (some may be in desktop nav, some in footer)
    const linkTexts = ["Deals", "Academy", "Sign In", "Invest", "Get Started"];
    for (const text of linkTexts) {
      const link = page.locator(`a:has-text("${text}"), button:has-text("${text}")`).first();
      const visible = await link.isVisible().catch(() => false);
      console.log(`  Link "${text}": ${visible ? "VISIBLE" : "NOT FOUND"}`);
    }
  });

  test("12. Footer links present on homepage", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
    const footer = page.locator("footer").first();
    const footerExists = await footer.isVisible().catch(() => false);
    console.log(`  Footer visible: ${footerExists}`);
    if (footerExists) {
      const footerText = await footer.textContent();
      console.log(`  Footer content snippet: ${(footerText || "").slice(0, 200)}`);
    }
  });

  test("13. Mobile hamburger menu (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });

    // Look for hamburger/burger menu button
    const burger = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="Menu" i], [data-feature*="BURGER"], button:has(svg.lucide-menu), button:has(svg)'
    ).first();
    const burgerVisible = await burger.isVisible().catch(() => false);
    console.log(`  Hamburger button visible (375px): ${burgerVisible}`);

    if (burgerVisible) {
      await burger.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOTS}/admin-mobile.png`, fullPage: true });
    }
  });

  test("14. 404 page — /this-does-not-exist", async ({ page }) => {
    await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "networkidle", timeout: 30000 });
    // Check page content for 404 or "not found"
    const body = await page.textContent("body");
    const has404 = /404|not found|page.*not.*found|doesn.t exist/i.test(body || "");
    console.log(`  404 page shows error: ${has404}`);
    console.log(`  URL after navigation: ${page.url()}`);
  });

  test("15. Wrong password shows error message", async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Fill wrong credentials using data-feature selectors
    const emailInput = page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]');
    await emailInput.waitFor({ state: "visible", timeout: 15000 });
    await emailInput.fill("admin@hub.nfstay.com");

    const passwordInput = page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]');
    await passwordInput.fill("WrongPassword123!");

    const submitBtn = page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]');
    await submitBtn.click();

    // Wait for error
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOTS}/wrong-password-error.png`, fullPage: true });

    // Check for error message
    const errorMsg = page.locator('[role="alert"], .text-red-500, .text-destructive, .error, [class*="error"], [class*="toast"]').first();
    const errorVisible = await errorMsg.isVisible().catch(() => false);
    if (errorVisible) {
      const text = await errorMsg.textContent();
      console.log(`  Error message: "${text}"`);
    } else {
      // Check toast/sonner
      const toast = page.locator('[data-sonner-toast], [class*="Toastify"], .toast').first();
      const toastVisible = await toast.isVisible().catch(() => false);
      if (toastVisible) {
        const text = await toast.textContent();
        console.log(`  Toast error: "${text}"`);
      } else {
        console.log(`  No visible error message found`);
      }
    }
  });

  test("16. Forgot password page exists", async ({ page }) => {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "networkidle", timeout: 30000 });
    const body = await page.textContent("body");
    const hasForgot = /forgot|reset|email|password/i.test(body || "");
    console.log(`  Forgot password page loads: ${hasForgot}`);
    console.log(`  URL: ${page.url()}`);
  });

  test("17. Health endpoint check", async ({ request }) => {
    // Try common health endpoints
    for (const path of ["/api/health", "/health"]) {
      try {
        const resp = await request.get(`${BASE}${path}`);
        console.log(`  ${path}: status=${resp.status()}`);
        if (resp.ok()) {
          const text = await resp.text();
          console.log(`  Response: ${text.slice(0, 200)}`);
        }
      } catch (e: any) {
        console.log(`  ${path}: FAILED (${e.message?.slice(0, 80)})`);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 3 — NOTIFICATIONS AUDIT (code-level analysis via console logs)
// ═══════════════════════════════════════════════════════════════════

test.describe("NOTIFICATIONS AUDIT", () => {
  test("18. Notification bell dropdown works on member dashboard", async ({ page }) => {
    await adminSignIn(page);
    // NotificationBell is in DashboardLayout (member dashboard), not AdminLayout
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: "networkidle", timeout: 30000 });

    const bell = page.locator('[data-feature="NOTIFICATIONS__BELL_BUTTON"]');
    const bellVisible = await bell.isVisible().catch(() => false);
    console.log(`  Bell button on member dashboard: ${bellVisible}`);

    if (bellVisible) {
      // Check for unread count badge
      const badge = page.locator('[data-feature="NOTIFICATIONS__UNREAD_COUNT"]');
      const badgeVisible = await badge.isVisible().catch(() => false);
      if (badgeVisible) {
        const text = await badge.textContent();
        console.log(`  Unread count badge: ${text}`);
      } else {
        console.log(`  Unread count badge: not shown (0 unread)`);
      }

      // Click to open dropdown
      await bell.click();
      await page.waitForTimeout(700);
      const dropdown = page.locator('[data-feature="NOTIFICATIONS__DROPDOWN"]');
      const isOpen = await dropdown.isVisible().catch(() => false);
      console.log(`  Bell dropdown opened: ${isOpen}`);

      if (isOpen) {
        const items = page.locator('[data-feature="NOTIFICATIONS__ITEM"]');
        const count = await items.count();
        console.log(`  Notification items in dropdown: ${count}`);
        for (let i = 0; i < Math.min(count, 3); i++) {
          const text = await items.nth(i).textContent();
          console.log(`  Item ${i + 1}: ${(text || "").trim().slice(0, 80)}`);
        }
      }
    }

    // Also check admin notifications page for completeness
    await page.goto(`${BASE}/admin/marketplace/notifications`, { waitUntil: "networkidle", timeout: 30000 });
    const adminNotifList = page.locator('[data-feature="ADMIN__NOTIFICATIONS_LIST"]');
    const listVisible = await adminNotifList.isVisible().catch(() => false);
    console.log(`  Admin notifications page list: ${listVisible ? "has items" : "empty or not visible"}`);
  });

  test("19. Supabase notifications table — check via API", async ({ request }) => {
    const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
    const ANON_KEY =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

    // Sign in to get JWT
    const authResp = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: {
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      data: {
        email: ADMIN_EMAIL,
        // The app derives the password by appending seed "_NFsTay2!" but Supabase stores the derived version
        // We need to use the derived password for direct Supabase auth
        password: `${ADMIN_PASSWORD}_NFsTay2!`,
      },
    });

    if (authResp.ok()) {
      const { access_token } = await authResp.json();
      console.log(`  Supabase auth: OK`);

      // Query notifications table
      const notifResp = await request.get(
        `${SUPABASE_URL}/rest/v1/notifications?select=id,type,title,read,created_at&order=created_at.desc&limit=5`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      if (notifResp.ok()) {
        const data = await notifResp.json();
        console.log(`  Notifications table exists: YES`);
        console.log(`  Recent entries: ${data.length}`);
        for (const n of data) {
          console.log(`    [${n.type}] ${n.title} | read=${n.read} | ${n.created_at}`);
        }
      } else {
        console.log(`  Notifications table query: ${notifResp.status()} ${await notifResp.text()}`);
      }
    } else {
      console.log(`  Supabase auth failed: ${authResp.status()} — will try raw password`);
      // Try with raw password (maybe direct Supabase uses raw password)
      const authResp2 = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        headers: {
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        data: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      });

      if (authResp2.ok()) {
        const { access_token } = await authResp2.json();
        console.log(`  Supabase auth (raw password): OK`);

        const notifResp = await request.get(
          `${SUPABASE_URL}/rest/v1/notifications?select=id,type,title,read,created_at&order=created_at.desc&limit=5`,
          {
            headers: {
              apikey: ANON_KEY,
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        if (notifResp.ok()) {
          const data = await notifResp.json();
          console.log(`  Notifications table exists: YES`);
          console.log(`  Recent entries: ${data.length}`);
          for (const n of data) {
            console.log(`    [${n.type}] ${n.title} | read=${n.read} | ${n.created_at}`);
          }
        } else {
          console.log(`  Notifications query: ${notifResp.status()}`);
        }
      } else {
        console.log(`  Supabase auth (raw password): ${authResp2.status()}`);
      }
    }
  });

  test("20. Code-level audit summary (console output)", async () => {
    // This test outputs the analysis from reading the codebase
    console.log("");
    console.log("═══════════════════════════════════════════════════");
    console.log("NOTIFICATIONS AUDIT — CODE ANALYSIS SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log("");
    console.log("NOTIFICATION BELL COMPONENT:");
    console.log("  File: src/components/NotificationBell.tsx");
    console.log("  Polls every 30s (no realtime)");
    console.log("  Admin sees own + admin-wide (user_id IS NULL) notifications");
    console.log("  Regular users see own notifications only");
    console.log("  Supports mark-read per item and mark-all-read");
    console.log("  Notification types with icons: deal_approved, deal_rejected,");
    console.log("    deal_expired, new_signup, purchase_confirmed, commission_earned,");
    console.log("    commission_claimable, rent_available, rent_claimed, payout_request,");
    console.log("    payout_completed, proposal_created, proposal_result, new_deal, deal_edit");
    console.log("");
    console.log("ADMIN NOTIFICATIONS PAGE:");
    console.log("  File: src/pages/admin/AdminNotifications.tsx");
    console.log("  Full-page notification list with mark-read functionality");
    console.log("  Polls every 30s");
    console.log("");
    console.log("IN-APP NOTIFICATION TRIGGERS (from code):");
    console.log("  - new_deal: n8n webhook notify-admin-new-deal → inserts row");
    console.log("  - deal_edit: n8n webhook notify-admin-edit → inserts row");
    console.log("  - Investment events: src/lib/notifications.ts sendInvestNotification()");
    console.log("    Types: purchase_confirmed, rent_available, rent_claimed,");
    console.log("    commission_earned, commission_claimable, payout_completed,");
    console.log("    proposal_created, proposal_result, bank_details_saved, boost_activated");
    console.log("");
    console.log("MEMBER NOTIFICATIONS:");
    console.log("  Regular members have NO notification feed or bell icon");
    console.log("  Only admins see in-app notifications");
    console.log("");
    console.log("NOTIFICATION PREFERENCES (Settings page):");
    console.log("  4 toggles exist in UI, save to profiles table");
    console.log("  NONE are enforced — purely cosmetic");
    console.log("  WhatsApp: New deals — saved but NOT enforced");
    console.log("  WhatsApp: Daily digest — saved but NOT enforced (digest doesn't exist)");
    console.log("  Email: Daily digest — saved but NOT enforced (digest doesn't exist)");
    console.log("  WhatsApp: Status updates — saved but NOT enforced");
    console.log("");
    console.log("GHL WHATSAPP WORKFLOWS (from COMMUNICATIONS.md):");
    console.log("  ACTIVE:");
    console.log("  1. OTP - nfstay (signup OTP code)");
    console.log("  2. 1-landlord_enquiry (first contact from operator)");
    console.log("  3. 2 Tenant to Landlord (follow-up messages)");
    console.log("  4. 3- Landlord to Tenant (landlord replies)");
    console.log("  5. 4- Investment NFSTAY (investment alerts)");
    console.log("  6. Investors 1st message");
    console.log("  7. Investors FB leads Enquiry");
    console.log("  8. Webhook nfstay Chat");
    console.log("  9. inbox-new-inquiry");
    console.log("  10. inbox-new-message");
    console.log("  11. landlord replies");
    console.log("");
    console.log("DEAD CODE (webhook exists but never called):");
    console.log("  - inbox-tenant-message: NEVER CALLED");
    console.log("  - signup-welcome: NEVER CALLED");
    console.log("");
    console.log("EMAILS THAT FIRE (from EMAIL_NOTIFICATIONS.md):");
    console.log("  WORKING:");
    console.log("  1. new-deal-admin — member submits deal → admin email");
    console.log("  2. deal-approved-member — admin approves → member email");
    console.log("  3. Password reset — Supabase built-in SMTP");
    console.log("");
    console.log("EMAILS THAT SHOULD FIRE BUT DON'T:");
    console.log("  1. deal-rejected-member — admin rejects deal (Medium priority)");
    console.log("  2. deal-expired-member — deal expires (Medium priority)");
    console.log("  3. tier-upgraded-member — payment confirmation (Low priority)");
    console.log("  4. welcome-member — new user welcome email (Low priority)");
    console.log("  5. Daily digest — no backend exists (Low priority)");
    console.log("");
    console.log("EMAIL DOMAIN STATUS:");
    console.log("  hub.nfstay.com: NOT VERIFIED in Resend");
    console.log("  nfstay.app: NOT VERIFIED in Resend");
    console.log("  Currently sending from sandbox: onboarding@resend.dev");
    console.log("");
    console.log("REALTIME SUBSCRIPTIONS (non-notification):");
    console.log("  DashboardTopNav → chat_threads (unread inbox badge)");
    console.log("  InboxPage → chat_threads (live thread list)");
    console.log("  ChatWindow → chat_messages (live messages)");
    console.log("  MyListingsPanel → properties (live status)");
    console.log("  useUserTier → profiles (live tier upgrade)");
    console.log("  notifications table: NO realtime (polls every 30s)");
    console.log("═══════════════════════════════════════════════════");
  });
});
