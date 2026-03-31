/**
 * CHAT & MESSAGING AUDIT — Agent 6: Live Chat Deal Closer
 * Tests the full inbox/messaging flow on hub.nfstay.com
 */
import { test, expect, type Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";
const SCREENSHOT_DIR = "e2e/screenshots";

// ── Auth helpers ──────────────────────────────────────────────────
async function getAuthTokens(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  const data = await res.json();
  return data.access_token ? data : null;
}

async function injectAuth(page: Page, email: string, password: string) {
  const tokens = await getAuthTokens(email, password);
  if (!tokens) throw new Error(`Failed to authenticate ${email}`);
  const storageKey = "sb-asazddtvjvmckouxcmmo-auth-token";
  const sessionData = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: tokens.user,
  });
  await page.goto(HUB, { waitUntil: "commit" });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    [storageKey, sessionData]
  );
}

// ── Findings log ─────────────────────────────────────────────────
const findings: Record<string, { ok: boolean; notes: string }> = {};

function record(key: string, ok: boolean, notes: string) {
  findings[key] = { ok, notes };
  console.log(`  ${ok ? "✅" : "❌"} ${key}: ${notes}`);
}

// ═══════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════

test.describe("Chat & Messaging Audit", () => {
  test("Full inbox and messaging flow", async ({ page }) => {
    test.setTimeout(120_000);

    // ── 1. Sign in as admin ──────────────────────────────────────
    console.log("\n=== 1. Signing in as admin ===");
    try {
      await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      record("Auth", true, "Admin auth injected");
    } catch (e: any) {
      record("Auth", false, e.message);
      return; // Cannot continue without auth
    }

    // ── 2. Navigate to Inbox (/dashboard/inbox) ──────────────────
    console.log("\n=== 2. Navigating to Inbox ===");
    try {
      await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(3000); // let threads load
      record("Inbox navigation", true, `URL: ${page.url()}`);
    } catch (e: any) {
      record("Inbox navigation", false, e.message);
    }

    // ── 3. Check 3-panel layout (Airbnb-style) ───────────────────
    console.log("\n=== 3. Checking 3-panel layout ===");
    try {
      const featureRoot = page.locator('[data-feature="CRM_INBOX"]');
      const hasRoot = await featureRoot.count() > 0;

      const threadPanel = page.locator('[data-feature="CRM_INBOX__THREAD_PANEL"]');
      const hasThreadPanel = await threadPanel.count() > 0;

      const chatPanel = page.locator('[data-feature="CRM_INBOX__CHAT_PANEL"]');
      const hasChatPanel = await chatPanel.count() > 0;

      // Check for "Your messages" empty state or actual threads
      const emptyState = page.getByText("Your messages");
      const hasEmptyState = await emptyState.count() > 0;

      record(
        "3-panel layout",
        hasRoot && hasThreadPanel && hasChatPanel,
        `Root: ${hasRoot}, ThreadPanel: ${hasThreadPanel}, ChatPanel: ${hasChatPanel}, EmptyState: ${hasEmptyState}`
      );
    } catch (e: any) {
      record("3-panel layout", false, e.message);
    }

    // ── 4. Check existing threads ────────────────────────────────
    console.log("\n=== 4. Checking existing threads ===");
    let threadCount = 0;
    try {
      // The support thread is always present — look for thread items
      // ThreadList likely renders clickable items
      await page.waitForTimeout(2000);

      // Check for nfstay Support thread (always present)
      const supportThread = page.getByText("nfstay Support");
      const hasSupportThread = await supportThread.count() > 0;

      // Count other visible thread items (exclude support)
      // Look for thread list items — they usually have thread titles
      const threadItems = page.locator('[data-feature="CRM_INBOX__THREAD_PANEL"] [class*="cursor-pointer"], [data-feature="CRM_INBOX__THREAD_PANEL"] button');
      const itemCount = await threadItems.count();

      // Also try to get threads from Supabase directly
      const tokensCheck = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
      let dbThreadCount = 0;
      if (tokensCheck) {
        const threadRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_threads?select=id,operator_id,landlord_id&or=(operator_id.eq.${tokensCheck.user.id},landlord_id.eq.${tokensCheck.user.id})&limit=50`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${tokensCheck.access_token}`,
            },
          }
        );
        const threadData = await threadRes.json();
        dbThreadCount = Array.isArray(threadData) ? threadData.length : 0;
      }

      threadCount = dbThreadCount;
      record(
        "Thread list",
        hasSupportThread,
        `Support thread: ${hasSupportThread}, UI items: ${itemCount}, DB threads: ${dbThreadCount}`
      );
    } catch (e: any) {
      record("Thread list", false, e.message);
    }

    // ── 5. Navigate to a deal page and click Inquire ─────────────
    console.log("\n=== 5. Finding a deal and clicking Inquire ===");
    let dealId: string | null = null;
    try {
      // Get a property ID from Supabase
      const tokensCheck = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
      if (tokensCheck) {
        const propRes = await fetch(
          `${SUPABASE_URL}/rest/v1/properties?select=id&status=eq.approved&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${tokensCheck.access_token}`,
            },
          }
        );
        const propData = await propRes.json();
        if (Array.isArray(propData) && propData.length > 0) {
          dealId = propData[0].id;
        }
      }

      if (dealId) {
        await page.goto(`${HUB}/deals/${dealId}`, { waitUntil: "networkidle", timeout: 30_000 });
        await page.waitForTimeout(3000);

        const inquireBtn = page.locator('[data-feature="DEALS__DETAIL_INQUIRE"]');
        const hasInquireBtn = await inquireBtn.count() > 0;

        record("Inquire button", hasInquireBtn, `Deal: ${dealId}, Button found: ${hasInquireBtn}`);

        if (hasInquireBtn) {
          await inquireBtn.click();
          await page.waitForTimeout(4000);
          const afterUrl = page.url();
          const wentToInbox = afterUrl.includes("inbox");
          record("Inquire navigation", wentToInbox, `After click URL: ${afterUrl}`);
        } else {
          // Try generic text match
          const altBtn = page.getByRole("button", { name: /inquire|contact/i }).first();
          const hasAlt = await altBtn.isVisible().catch(() => false);
          record("Inquire button (alt)", hasAlt, "Tried generic button match");
          if (hasAlt) {
            await altBtn.click();
            await page.waitForTimeout(4000);
          }
        }
      } else {
        record("Inquire button", false, "No approved properties found in DB");
      }
    } catch (e: any) {
      record("Inquire button", false, e.message);
    }

    // ── 6. Check if chat thread opens ────────────────────────────
    console.log("\n=== 6. Checking chat thread ===");
    try {
      const currentUrl = page.url();
      if (currentUrl.includes("inbox")) {
        // Check for chat window — look for message input or chat panel
        await page.waitForTimeout(2000);
        const chatArea = page.locator('[data-feature="CRM_INBOX__CHAT_PANEL"]');
        const hasChatArea = await chatArea.count() > 0;
        record("Chat thread opens", hasChatArea, `URL: ${currentUrl}`);
      } else {
        // Navigate back to inbox to continue tests
        await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
        await page.waitForTimeout(3000);
        record("Chat thread opens", false, "Did not navigate to inbox after inquire");
      }
    } catch (e: any) {
      record("Chat thread opens", false, e.message);
    }

    // ── 7. Try to type and send a message ────────────────────────
    console.log("\n=== 7. Testing message sending ===");
    try {
      // First, select a thread if not already selected
      const supportThread = page.getByText("nfstay Support").first();
      if (await supportThread.isVisible().catch(() => false)) {
        await supportThread.click();
        await page.waitForTimeout(2000);
      }

      // Look for message input — could be textarea or input
      const msgInput = page.locator('textarea, input[type="text"]').last();
      const hasInput = await msgInput.isVisible().catch(() => false);

      if (hasInput) {
        const testMsg = `Test message from Playwright audit ${Date.now()}`;
        await msgInput.fill(testMsg);

        // Look for send button
        const sendBtn = page.getByRole("button", { name: /send/i }).first();
        const hasSendBtn = await sendBtn.isVisible().catch(() => false);

        // Also try the Send icon button (no text, just icon)
        const sendIconBtn = page.locator('button:has(svg)').last();

        if (hasSendBtn) {
          await sendBtn.click();
          await page.waitForTimeout(2000);
          record("Message sending", true, `Input found, send button clicked. Test msg: ${testMsg.slice(0, 30)}`);
        } else {
          // Try pressing Enter
          await msgInput.press("Enter");
          await page.waitForTimeout(2000);
          record("Message sending", true, "Input found, pressed Enter to send");
        }
      } else {
        // Check for PaymentSheet / payment gate (free tier may block messaging)
        const paymentSheet = page.locator('[class*="PaymentSheet"], [data-feature*="PAYMENT"]');
        const hasPaymentGate = await paymentSheet.count() > 0;

        // Check for lock icon or payment message
        const lockMsg = page.getByText(/upgrade|paid|subscribe|unlock/i).first();
        const hasLockMsg = await lockMsg.isVisible().catch(() => false);

        record("Message sending", false, `No input visible. Payment gate: ${hasPaymentGate}, Lock message: ${hasLockMsg}`);
      }
    } catch (e: any) {
      record("Message sending", false, e.message);
    }

    // ── 8. Check if message appears in thread ────────────────────
    console.log("\n=== 8. Checking message appears ===");
    try {
      await page.waitForTimeout(2000);
      // Look for message bubbles
      const messageBubbles = page.locator('[class*="message"], [class*="bubble"], [class*="rounded-2xl"]');
      const bubbleCount = await messageBubbles.count();
      record("Message appears", bubbleCount > 0, `Found ${bubbleCount} message-like elements`);
    } catch (e: any) {
      record("Message appears", false, e.message);
    }

    // ── 9. Check NDA/Agreement section in right panel ────────────
    console.log("\n=== 9. Checking NDA/Agreement section ===");
    try {
      // Select a non-support thread if available
      if (threadCount > 0) {
        // Click first non-support thread
        const threadPanel = page.locator('[data-feature="CRM_INBOX__THREAD_PANEL"]');
        const threadLinks = threadPanel.locator('[class*="cursor-pointer"], button').filter({ hasNot: page.getByText("nfstay Support") });
        const firstThread = threadLinks.first();
        if (await firstThread.isVisible().catch(() => false)) {
          await firstThread.click();
          await page.waitForTimeout(3000);
        }
      }

      // Check for NDA/Agreement elements in right panel
      const ndaText = page.getByText(/NDA|Agreement|Non-Disclosure|Sign|Terms/i);
      const ndaCount = await ndaText.count();

      // Check for agreement modal trigger
      const agreementBtn = page.getByRole("button", { name: /agreement|nda|sign/i }).first();
      const hasAgreementBtn = await agreementBtn.isVisible().catch(() => false);

      // Check for the FileText icon or lock icon that indicates NDA section
      const lockIcons = page.locator('svg[class*="lock"], [data-feature*="NDA"]');
      const hasLockIcons = await lockIcons.count() > 0;

      record(
        "NDA/Agreement section",
        ndaCount > 0 || hasAgreementBtn || hasLockIcons,
        `NDA text: ${ndaCount}, Agreement button: ${hasAgreementBtn}, Lock icons: ${hasLockIcons}`
      );
    } catch (e: any) {
      record("NDA/Agreement section", false, e.message);
    }

    // ── Screenshot: inbox-desktop.png ────────────────────────────
    console.log("\n=== Taking desktop screenshot ===");
    try {
      await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/inbox-desktop.png`, fullPage: false });
      record("Screenshot inbox-desktop", true, "Saved");
    } catch (e: any) {
      record("Screenshot inbox-desktop", false, e.message);
    }

    // ── Select a thread and screenshot ───────────────────────────
    console.log("\n=== Taking thread screenshot ===");
    try {
      const supportLink = page.getByText("nfstay Support").first();
      if (await supportLink.isVisible().catch(() => false)) {
        await supportLink.click();
        await page.waitForTimeout(2000);
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/inbox-thread.png`, fullPage: false });
      record("Screenshot inbox-thread", true, "Saved");
    } catch (e: any) {
      record("Screenshot inbox-thread", false, e.message);
    }

    // ── 10. Check mobile layout (375x812) ────────────────────────
    console.log("\n=== 10. Mobile layout check ===");
    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // On mobile, InboxPage should show thread list only (no 3-panel)
      const hasThreadPanel = await page.locator('[data-feature="CRM_INBOX__THREAD_PANEL"]').count() > 0;
      const has3Panel = await page.locator('[data-feature="CRM_INBOX"]').count() > 0;

      // Check if layout adapts — on mobile it should be full-width thread list
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const noHorizontalScroll = bodyWidth <= 375 + 5; // small tolerance

      await page.screenshot({ path: `${SCREENSHOT_DIR}/inbox-mobile.png`, fullPage: false });
      record("Screenshot inbox-mobile", true, "Saved");

      record(
        "Mobile layout",
        noHorizontalScroll,
        `Body width: ${bodyWidth}px, Thread panel: ${hasThreadPanel}, 3-panel root: ${has3Panel}, No h-scroll: ${noHorizontalScroll}`
      );

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    } catch (e: any) {
      record("Mobile layout", false, e.message);
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // ── 11. Check thread URL format ──────────────────────────────
    console.log("\n=== 11. Thread URL format ===");
    try {
      await page.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForTimeout(3000);

      // Click support thread and check URL
      const supportLink = page.getByText("nfstay Support").first();
      if (await supportLink.isVisible().catch(() => false)) {
        await supportLink.click();
        await page.waitForTimeout(1500);
      }
      const threadUrl = page.url();
      // Thread selection may use ?thread= param or just /inbox with state
      record("Thread URL format", true, `URL after thread select: ${threadUrl}`);
    } catch (e: any) {
      record("Thread URL format", false, e.message);
    }

    // ── 12. Check for PaymentSheet / payment gate ────────────────
    console.log("\n=== 12. Payment gate check ===");
    try {
      // Look for PaymentSheet component or payment-related modal
      const paymentSheet = page.locator('[class*="PaymentSheet"]');
      const paymentModal = page.getByText(/upgrade.*plan|choose.*plan|payment|subscribe/i).first();
      const hasPaymentSheet = await paymentSheet.count() > 0;
      const hasPaymentModal = await paymentModal.isVisible().catch(() => false);

      // Also check for the isPaidTier gate in the chat window
      const lockMessage = page.getByText(/upgrade|paid tier|locked|subscribe to/i).first();
      const hasLockMessage = await lockMessage.isVisible().catch(() => false);

      record(
        "Payment gate",
        true, // Recording what we find — not a pass/fail
        `PaymentSheet: ${hasPaymentSheet}, Payment modal: ${hasPaymentModal}, Lock message: ${hasLockMessage}`
      );
    } catch (e: any) {
      record("Payment gate", false, e.message);
    }

    // ── 14. Quick replies feature ────────────────────────────────
    console.log("\n=== 14. Quick replies check ===");
    try {
      // Look for gear/settings icon or template button in chat
      // QuickRepliesModal is imported in ChatWindow
      const gearBtn = page.locator('button:has(svg[class*="settings"]), button[aria-label*="settings"], button[aria-label*="quick"]');
      const hasGear = await gearBtn.count() > 0;

      // Look for LayoutGrid icon (used in ChatWindow for quick replies)
      const gridBtn = page.locator('button:has(svg)');
      const gridBtnCount = await gridBtn.count();

      // Check if there's a quick replies reference
      const quickReplyText = page.getByText(/quick repl|template|saved repl/i);
      const hasQuickReply = await quickReplyText.count() > 0;

      record(
        "Quick replies",
        hasGear || hasQuickReply,
        `Gear button: ${hasGear}, Grid buttons: ${gridBtnCount}, Quick reply text: ${hasQuickReply}`
      );
    } catch (e: any) {
      record("Quick replies", false, e.message);
    }

    // ── 15. Attachment button (+) ────────────────────────────────
    console.log("\n=== 15. Attachment button check ===");
    try {
      // ChatWindow imports Plus icon for attachments
      const plusBtn = page.locator('button[aria-label*="attach"], button:has(svg)');
      const plusBtnCount = await plusBtn.count();

      // Look for the Plus icon specifically near the message input
      const chatPanel = page.locator('[data-feature="CRM_INBOX__CHAT_PANEL"]');
      const chatButtons = chatPanel.locator("button");
      const chatBtnCount = await chatButtons.count();

      record(
        "Attachment button",
        chatBtnCount > 0,
        `Chat panel buttons: ${chatBtnCount}, Plus-like buttons: ${plusBtnCount}`
      );
    } catch (e: any) {
      record("Attachment button", false, e.message);
    }

    // ── 16. Thread search ────────────────────────────────────────
    console.log("\n=== 16. Thread search check ===");
    try {
      const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="find" i], input[type="search"]');
      const hasSearch = await searchInput.count() > 0;

      // Also check for search icon
      const searchIcon = page.locator('svg[class*="search"], button[aria-label*="search"]');
      const hasSearchIcon = await searchIcon.count() > 0;

      record("Thread search", hasSearch || hasSearchIcon, `Search input: ${hasSearch}, Search icon: ${hasSearchIcon}`);
    } catch (e: any) {
      record("Thread search", false, e.message);
    }

    // ── 17. Unread indicators ────────────────────────────────────
    console.log("\n=== 17. Unread indicators check ===");
    try {
      // Look for unread dot/badge in thread list
      const unreadDot = page.locator('[class*="unread"], [class*="bg-blue"], [class*="bg-green"], [class*="bg-primary"], [class*="pulse-dot"]');
      const unreadCount = await unreadDot.count();

      // Check for any badge with a number
      const badge = page.locator('[class*="badge"], span[class*="rounded-full"][class*="text-xs"]');
      const badgeCount = await badge.count();

      record(
        "Unread indicators",
        unreadCount > 0 || badgeCount > 0,
        `Unread dots: ${unreadCount}, Badges: ${badgeCount}`
      );
    } catch (e: any) {
      record("Unread indicators", false, e.message);
    }

    // ── 18. Notification bell ────────────────────────────────────
    console.log("\n=== 18. Notification bell check ===");
    try {
      // Check top nav for bell icon
      const bell = page.locator('button:has(svg[class*="bell"]), [aria-label*="notif"], button:has([data-lucide="bell"])');
      const hasBell = await bell.count() > 0;

      // Also check by looking for Bell in the DashboardTopNav area
      const topNav = page.locator("nav, header, [class*='top-nav'], [class*='TopNav']");
      const topNavButtons = topNav.locator("button");
      const topNavBtnCount = await topNavButtons.count();

      // Check for the notification bell with badge
      const bellBadge = page.locator('[class*="notification"], [class*="bell"]');
      const hasBellBadge = await bellBadge.count() > 0;

      record(
        "Notification bell",
        hasBell || hasBellBadge,
        `Bell icon: ${hasBell}, Bell badge: ${hasBellBadge}, TopNav buttons: ${topNavBtnCount}`
      );
    } catch (e: any) {
      record("Notification bell", false, e.message);
    }

    // ── SUMMARY ──────────────────────────────────────────────────
    console.log("\n\n═══════════════════════════════════════");
    console.log("       CHAT & MESSAGING AUDIT SUMMARY");
    console.log("═══════════════════════════════════════");
    for (const [key, { ok, notes }] of Object.entries(findings)) {
      console.log(`  ${ok ? "✅" : "❌"} ${key}: ${notes}`);
    }
    console.log("═══════════════════════════════════════\n");
  });
});
