/**
 * inbox-chat-fixes.spec.ts
 * TDD tests for 7 confirmed inbox bugs.
 * Write failing → fix → all pass.
 *
 * Tests run against hub.nfstay.com (live).
 * Auth uses token injection pattern from qa-chat-deal.spec.ts.
 */
import { test, expect, type Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

// Admin account (also an nfstay admin — blocked by BUG 1)
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

// Operator test account
const OP_EMAIL = "testoperator@test.nfstay.com";
const OP_PASSWORD = "TestOperator123!";

// Approved property IDs
const ADMIN_DEAL_ID = "b27d5af4-0520-4dac-a004-300126654e0f";
const OP_DEAL_ID = "9ebde143-a9ba-46c3-b2ed-ae2506f62d74";

// ── Auth helpers (same pattern as qa-chat-deal.spec.ts) ──────────
async function getAuthTokens(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
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

// ════════════════════════════════════════════════════════════════
// TEST 1 — Admin can Inquire Now and gets a chat thread (desktop)
// BUG 1: isAdmin guard blocks admin from creating thread
// PRE-FIX: navigating with ?deal= never creates thread → ChatWindow never shown
// POST-FIX: thread is created, ChatWindow appears
// ════════════════════════════════════════════════════════════════
test("Test 1 — Admin can Inquire Now, chat window appears", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });

  await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${HUB}/dashboard/inbox?deal=${ADMIN_DEAL_ID}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(8000); // give useInquiry time to create thread + load

  const chatWindow = page.locator('[data-feature="CRM_INBOX__CHAT_WINDOW"]');
  const emptyState = page.getByText("Select a conversation to get started");

  await expect(chatWindow).toBeVisible({ timeout: 5000 });
  await expect(emptyState).not.toBeVisible();
});

// ════════════════════════════════════════════════════════════════
// TEST 2 — Inquire Now opens right panel with earnings slider (desktop)
// BUG 2: setShowDetails(false) in inquiryThreadId effect hides panel immediately
// PRE-FIX: details panel hidden, earnings slider not visible
// POST-FIX: setShowDetails(true) — panel shows, slider visible
// ════════════════════════════════════════════════════════════════
test("Test 2 — Inquire Now opens earnings panel automatically", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });

  await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${HUB}/dashboard/inbox?deal=${ADMIN_DEAL_ID}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(8000);

  const inquiryDetails = page.locator('[data-feature="CRM_INBOX__INQUIRY_DETAILS"]');
  const inquiryEarnings = page.locator('[data-feature="CRM_INBOX__INQUIRY_EARNINGS"]');

  await expect(inquiryDetails).toBeVisible({ timeout: 5000 });
  await expect(inquiryEarnings).toBeVisible({ timeout: 5000 });

  // Earnings slider must be visible
  const slider = inquiryEarnings.locator('input[type="range"]');
  await expect(slider).toBeVisible({ timeout: 5000 });
});

// ════════════════════════════════════════════════════════════════
// TEST 3 — Messages render stable, no position jump (desktop)
// BUG 3: first loadMessages run with user?.id=undefined maps all as justify-start
//        then auth resolves and messages flip to justify-end — visible jump
// PRE-FIX: at 500ms messages may be justify-start, then flip
// POST-FIX: early return guard prevents wrong render; messages stable from first render
// ════════════════════════════════════════════════════════════════
test("Test 3 — Sent messages render as justify-end and stay stable", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });

  await injectAuth(page, OP_EMAIL, OP_PASSWORD);
  await page.goto(`${HUB}/dashboard/inbox?deal=${OP_DEAL_ID}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  // Wait briefly — pre-fix: messages appear with wrong alignment first
  await page.waitForTimeout(500);

  // Assert: at least one message is aligned right (sent by current user)
  const sentBubble = page.locator('[data-feature="CRM_INBOX__CHAT_WINDOW"] .justify-end').first();
  await expect(sentBubble).toBeVisible({ timeout: 5000 });

  // Get stable identifier of the first sent bubble
  const bubbleText = await sentBubble.locator('[data-feature="CRM_INBOX__MESSAGE_BODY"]').first().textContent();
  console.log("Sent message text at 500ms:", bubbleText);

  // Wait another 1500ms and re-check alignment hasn't changed
  await page.waitForTimeout(1500);

  const sameBubble = page.locator('[data-feature="CRM_INBOX__CHAT_WINDOW"] .justify-end').first();
  await expect(sameBubble).toBeVisible();
  const textAfter = await sameBubble.locator('[data-feature="CRM_INBOX__MESSAGE_BODY"]').first().textContent();
  expect(textAfter).toBe(bubbleText);
  console.log("Message still at justify-end after 2000ms total. Text matches:", textAfter === bubbleText);
});

// ════════════════════════════════════════════════════════════════
// TEST 4 — Mobile: Info button opens property details drawer
// BUG 4: no Info button on mobile, no Drawer for InboxInquiryPanel
// PRE-FIX: button[title="Property details"] does not exist → invisible
// POST-FIX: button present, drawer opens showing CRM_INBOX__INQUIRY_DETAILS
// ════════════════════════════════════════════════════════════════
test("Test 4 — Mobile info button opens property details drawer", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await injectAuth(page, OP_EMAIL, OP_PASSWORD);
  await page.goto(`${HUB}/dashboard/inbox?deal=${OP_DEAL_ID}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(6000); // wait for thread to load and ChatWindow to mount

  // Info button must be visible in the ChatWindow header (mobile only)
  const infoBtn = page.locator('button[title="Property details"]');
  await expect(infoBtn).toBeVisible({ timeout: 5000 });

  // Tap the button
  await infoBtn.click();
  await page.waitForTimeout(1000);

  // Drawer should open with the inquiry details panel
  const inquiryDetails = page.locator('[data-feature="CRM_INBOX__INQUIRY_DETAILS"]');
  await expect(inquiryDetails).toBeVisible({ timeout: 5000 });
});

// ════════════════════════════════════════════════════════════════
// TEST 5 — Mobile textarea font-size is >= 16px (prevents iOS zoom)
// BUG 5: text-sm = 14px → iOS auto-zooms on focus
// PRE-FIX: computed font-size is 14px → assert fails (14 < 16)
// POST-FIX: text-base = 16px → assert passes
// ════════════════════════════════════════════════════════════════
test("Test 5 — Mobile textarea font-size >= 16px (prevents iOS zoom)", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });

  await injectAuth(page, OP_EMAIL, OP_PASSWORD);
  await page.goto(`${HUB}/dashboard/inbox?deal=${OP_DEAL_ID}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(6000);

  // Get the message input textarea
  const textarea = page.locator('[data-feature="CRM_INBOX__MESSAGE_INPUT"]').first();
  await expect(textarea).toBeVisible({ timeout: 5000 });

  // Check computed font-size
  const fontSize = await textarea.evaluate((el) => {
    return parseFloat(window.getComputedStyle(el).fontSize);
  });
  console.log("Textarea computed font-size:", fontSize, "px");
  expect(fontSize).toBeGreaterThanOrEqual(16);
});
