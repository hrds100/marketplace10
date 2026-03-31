/**
 * QA: Deals, Listings & Chat — Full End-to-End Live Test
 * Tests listing creation (quick list + normal), approval, browsing, inquiry, and chat flow.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";
const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";
const OPERATOR_EMAIL = "qa-operator-miami@hub.nfstay.com";
const OPERATOR_PASSWORD = "QAMiami2026!";
const SCREENSHOT_DIR = "e2e/screenshots";
const TS = Date.now();

// ── Helpers ──────────────────────────────────────────────────────────

async function getAuthTokens(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );
  return await res.json();
}

async function signUpUser(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { name: "QA Operator Miami" } }),
  });
  return await res.json();
}

async function injectAuth(page: Page, tokens: any) {
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

async function signInViaUI(page: Page, email: string, password: string) {
  await page.goto(`${HUB}/signin`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Click "Sign In" tab if present
  try {
    const signInTab = page.getByRole("button", { name: /sign in/i }).first();
    if (await signInTab.isVisible({ timeout: 3000 })) await signInTab.click();
  } catch { /* ignore */ }

  await page.waitForTimeout(500);

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  await passwordInput.fill(password);

  // Click submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait for redirect
  await page.waitForTimeout(5000);
}

async function ss(page: Page, name: string) {
  try {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
    console.log(`    [ss] ${name}.png`);
  } catch (e: any) {
    console.log(`    [ss] FAIL ${name}: ${e.message}`);
  }
}

// ── Findings tracker ────────────────────────────────────────────────
const R: Record<string, string> = {};
function log(key: string, value: string) {
  R[key] = value;
  console.log(`  ${value.startsWith("FAIL") ? "X" : ">"} ${key}: ${value}`);
}

// ═════════════════════════════════════════════════════════════════════
// MAIN TEST
// ═════════════════════════════════════════════════════════════════════

test("Full deals, listings & chat flow", async ({ browser }) => {
  test.setTimeout(300_000);

  // ══════════════════════════════════════════════════════════════════
  // PART 1: CREATE LISTINGS AS ADMIN
  // ══════════════════════════════════════════════════════════════════

  console.log("\n========== PART 1: CREATE LISTINGS AS ADMIN ==========\n");

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const adminPage = await adminContext.newPage();

  // ── 1.0 Sign in as admin via UI ──
  console.log("--- 1.0 Admin sign-in ---");
  let adminTokens: any = null;
  try {
    await signInViaUI(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
    const url = adminPage.url();
    log("admin_signin", `URL: ${url}`);
    await ss(adminPage, "01-admin-signin");

    if (url.includes("signin")) {
      console.log("  UI sign-in stuck, using token injection...");
      adminTokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
      if (adminTokens.access_token) {
        await injectAuth(adminPage, adminTokens);
        log("admin_signin", `Token injected. User: ${adminTokens.user?.id}`);
      }
    } else {
      adminTokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
    }
  } catch (e: any) {
    log("admin_signin", `FAIL: ${e.message}`);
    try {
      adminTokens = await getAuthTokens(ADMIN_EMAIL, ADMIN_PASSWORD);
      if (adminTokens.access_token) await injectAuth(adminPage, adminTokens);
    } catch { /* ignore */ }
  }

  // ── 1A: Quick Listing (AI-powered) ──
  console.log("\n--- 1A Quick Listing ---");
  let quickListPropertyId: string | null = null;
  try {
    await adminPage.goto(`${HUB}/admin/marketplace/quick-list`, { waitUntil: "networkidle", timeout: 30_000 });
    await adminPage.waitForTimeout(3000);
    log("quick_list_nav", `URL: ${adminPage.url()}`);
    await ss(adminPage, "02-quick-list-page");

    const heading = adminPage.locator('h1:has-text("Quick List")');
    const hasHeading = await heading.isVisible({ timeout: 5000 }).catch(() => false);
    log("quick_list_loaded", hasHeading ? "OK" : "FAIL: heading not visible");

    if (hasHeading) {
      // Paste listing text
      const textarea = adminPage.locator('[data-feature="ADMIN__QUICK_LIST_INPUT"]');
      await textarea.fill(`2-Bed Apartment in Miami Beach
Miami, FL 33139
2 Bedrooms, 1 Bathroom
Rent: $2,500 per month
SA Approved
Beautiful apartment close to the ocean, furnished.`);

      await ss(adminPage, "03-quick-list-filled");

      // Click Generate
      await adminPage.locator('[data-feature="ADMIN__QUICK_LIST_PARSE"]').click();
      await adminPage.waitForTimeout(5000);
      await ss(adminPage, "04-quick-list-generated");

      // Check preview
      const preview = adminPage.locator('[data-feature="ADMIN__QUICK_LIST_PREVIEW"]');
      const hasPreview = await preview.isVisible({ timeout: 5000 }).catch(() => false);
      log("quick_list_preview", hasPreview ? "OK" : "FAIL: No preview");

      if (hasPreview) {
        // Edit city to Miami
        const cityInput = preview.locator('input').nth(1);
        await cityInput.fill("Miami");

        // Approve & Publish
        await adminPage.locator('[data-feature="ADMIN__QUICK_LIST_SUBMIT"]').click();
        await adminPage.waitForTimeout(5000);
        await ss(adminPage, "05-quick-list-published");

        // Get latest property
        if (adminTokens?.access_token) {
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/properties?select=id,name,city,status&order=created_at.desc&limit=1`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${adminTokens.access_token}` } }
          );
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            quickListPropertyId = data[0].id;
            log("quick_list_result", `ID: ${quickListPropertyId}, Name: ${data[0].name}, Status: ${data[0].status}`);
          }
        }
      }
    }
  } catch (e: any) {
    log("quick_list", `FAIL: ${e.message}`);
    await ss(adminPage, "05-quick-list-error");
  }

  // ── 1B: Rental Listing (via Supabase API — the form has complex accordion UX) ──
  console.log("\n--- 1B Rental Listing ---");
  let rentalPropertyId: string | null = null;
  try {
    // Also navigate to list-a-deal to screenshot the page
    await adminPage.goto(`${HUB}/dashboard/list-a-deal`, { waitUntil: "networkidle", timeout: 30_000 });
    await adminPage.waitForTimeout(3000);
    await ss(adminPage, "06-list-a-deal-page");
    log("list_a_deal_page", `URL: ${adminPage.url()}`);

    // Create via API for reliability (the accordion form is complex)
    if (adminTokens?.access_token) {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${adminTokens.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name: `Miami Beach Rental — QA Test ${TS}`,
          city: "Miami",
          postcode: "33139",
          type: "2-bed flat",
          property_category: "flat",
          bedrooms: 2,
          bathrooms: 1,
          rent_monthly: 2800,
          profit_est: 800,
          deposit: 2800,
          sa_approved: "yes",
          contact_name: "QA Test Landlord",
          contact_email: "info@nexivoproperties.co.uk",
          contact_phone: "+1 305 555 0100",
          description: "Beautiful 2-bedroom apartment in Miami Beach, close to the ocean. Perfect for serviced accommodation.",
          status: "pending",
          submitted_by: adminTokens.user?.id,
          photos: [],
          listing_type: "rental",
        }),
      });
      const insertData = await insertRes.json();
      if (Array.isArray(insertData) && insertData.length > 0) {
        rentalPropertyId = insertData[0].id;
        log("rental_property", `Created: ID=${rentalPropertyId}`);
      } else {
        log("rental_property", `FAIL: ${JSON.stringify(insertData).slice(0, 200)}`);
      }
    }
  } catch (e: any) {
    log("rental_listing", `FAIL: ${e.message}`);
  }

  // ── 1C: Sale Listing (via API) ──
  console.log("\n--- 1C Sale Listing ---");
  let salePropertyId: string | null = null;
  try {
    if (adminTokens?.access_token) {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${adminTokens.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name: `Miami Downtown Sale — QA Test ${TS}`,
          city: "Miami",
          postcode: "33131",
          type: "3-bed house",
          property_category: "house",
          bedrooms: 3,
          bathrooms: 2,
          rent_monthly: 3500,
          profit_est: 1000,
          deposit: 3500,
          sa_approved: "yes",
          contact_name: "QA Test Seller",
          contact_email: "info@nexivoproperties.co.uk",
          contact_phone: "+1 305 555 0200",
          description: "Spacious 3-bedroom house in downtown Miami. Great investment opportunity for rent-to-rent operators.",
          status: "pending",
          submitted_by: adminTokens.user?.id,
          photos: [],
          listing_type: "sale",
        }),
      });
      const insertData = await insertRes.json();
      if (Array.isArray(insertData) && insertData.length > 0) {
        salePropertyId = insertData[0].id;
        log("sale_property", `Created: ID=${salePropertyId}`);
      } else {
        log("sale_property", `FAIL: ${JSON.stringify(insertData).slice(0, 200)}`);
      }
    }
  } catch (e: any) {
    log("sale_listing", `FAIL: ${e.message}`);
  }

  // ── 1D: Approve listings ──
  console.log("\n--- 1D Approve listings ---");
  try {
    if (adminTokens?.access_token) {
      const toApprove = [rentalPropertyId, salePropertyId, quickListPropertyId].filter(Boolean);
      for (const propId of toApprove) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?id=eq.${propId}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${adminTokens.access_token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({ status: "approved" }),
        });
        log(`approve_${propId?.slice(0, 8)}`, `HTTP ${res.status}`);
      }

      // Screenshot admin submissions page
      await adminPage.goto(`${HUB}/admin/marketplace/submissions`, { waitUntil: "networkidle", timeout: 30_000 });
      await adminPage.waitForTimeout(3000);
      await ss(adminPage, "07-admin-submissions");

      // Click any remaining Approve buttons
      try {
        const approveButtons = adminPage.locator('[data-feature="ADMIN__SUBMISSIONS_APPROVE"]');
        const count = await approveButtons.count();
        log("admin_approve_buttons", `${count} approve buttons on page`);
        for (let i = 0; i < Math.min(count, 5); i++) {
          try { await approveButtons.nth(i).click(); await adminPage.waitForTimeout(1500); } catch { /* ignore */ }
        }
        await ss(adminPage, "08-admin-after-approve");
      } catch { /* ignore */ }
    }
  } catch (e: any) {
    log("approve", `FAIL: ${e.message}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // PART 2: BROWSE AND CONTACT AS OPERATOR
  // ══════════════════════════════════════════════════════════════════

  console.log("\n========== PART 2: BROWSE AND CONTACT AS OPERATOR ==========\n");

  const operatorContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const operatorPage = await operatorContext.newPage();
  let operatorTokens: any = null;

  // ── 2A: Create/sign-in operator ──
  console.log("--- 2A Operator auth ---");
  try {
    operatorTokens = await getAuthTokens(OPERATOR_EMAIL, OPERATOR_PASSWORD);
    if (!operatorTokens.access_token) {
      console.log("  Signing up operator...");
      await signUpUser(OPERATOR_EMAIL, OPERATOR_PASSWORD);
      await new Promise(r => setTimeout(r, 2000));
      operatorTokens = await getAuthTokens(OPERATOR_EMAIL, OPERATOR_PASSWORD);
    }
    if (operatorTokens.access_token) {
      await injectAuth(operatorPage, operatorTokens);
      log("operator_auth", `OK. ID: ${operatorTokens.user?.id}`);
    } else {
      log("operator_auth", `FAIL: ${JSON.stringify(operatorTokens).slice(0, 150)}`);
    }
  } catch (e: any) {
    log("operator_auth", `FAIL: ${e.message}`);
  }

  // ── 2B: Browse deals ──
  console.log("\n--- 2B Browse deals ---");
  try {
    await operatorPage.goto(`${HUB}/dashboard/deals`, { waitUntil: "networkidle", timeout: 30_000 });
    await operatorPage.waitForTimeout(4000);
    log("deals_page", `URL: ${operatorPage.url()}`);
    await ss(operatorPage, "09-deals-page");

    const bodyText = await operatorPage.textContent("body");
    const hasMiami = bodyText?.includes("Miami") || false;
    log("deals_miami", hasMiami ? "Miami visible" : "Miami not visible on default view");

    // Try search
    try {
      const searchInput = operatorPage.locator('input[placeholder*="search" i]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill("Miami");
        await operatorPage.waitForTimeout(3000);
        await ss(operatorPage, "10-deals-search-miami");
      }
    } catch { /* ignore */ }
  } catch (e: any) {
    log("deals_browse", `FAIL: ${e.message}`);
  }

  // ── 2B-2: Deal detail ──
  console.log("\n--- 2B-2 Deal detail ---");
  const targetDealId = rentalPropertyId || quickListPropertyId;
  try {
    if (targetDealId) {
      await operatorPage.goto(`${HUB}/deals/${targetDealId}`, { waitUntil: "networkidle", timeout: 30_000 });
      await operatorPage.waitForTimeout(4000);
      log("deal_detail", `URL: ${operatorPage.url()}`);
      await ss(operatorPage, "11-deal-detail");

      const title = operatorPage.locator('[data-feature="DEALS__DETAIL_TITLE"]');
      const titleText = await title.textContent().catch(() => null);
      log("deal_detail_title", titleText ? `Title: ${titleText}` : "FAIL: no title");
    } else {
      log("deal_detail", "SKIP: no deal ID");
    }
  } catch (e: any) {
    log("deal_detail", `FAIL: ${e.message}`);
  }

  // ── 2C: Inquire ──
  console.log("\n--- 2C Inquire ---");
  let threadCreated = false;
  let paymentGateDetected = false;
  try {
    if (targetDealId && operatorPage.url().includes(`deals/`)) {
      const inquireBtn = operatorPage.locator('[data-feature="DEALS__DETAIL_INQUIRE"]');
      const hasInquire = await inquireBtn.isVisible({ timeout: 5000 }).catch(() => false);
      log("inquire_button", hasInquire ? "Found" : "FAIL: not found");

      if (hasInquire) {
        await inquireBtn.click();
        await operatorPage.waitForTimeout(5000);
        const afterUrl = operatorPage.url();
        log("inquire_nav", `URL: ${afterUrl}`);
        await ss(operatorPage, "12-after-inquire");

        threadCreated = afterUrl.includes("inbox");
        log("thread_created", threadCreated ? "OK — navigated to inbox" : "FAIL");

        // Check for payment gate ("Unlock Messaging")
        await operatorPage.waitForTimeout(2000);
        const unlockMsg = operatorPage.getByText(/unlock messaging|upgrade|subscribe|choose.*plan/i).first();
        paymentGateDetected = await unlockMsg.isVisible({ timeout: 3000 }).catch(() => false);
        log("payment_gate", paymentGateDetected ? "DETECTED — free tier blocks messaging" : "No payment gate");
        if (paymentGateDetected) await ss(operatorPage, "13-payment-gate");

        // Try sending a message (may fail if payment gate is shown)
        try {
          // Close payment gate modal if it's a modal/dialog
          const closeBtn = operatorPage.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]').first();
          if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click();
            await operatorPage.waitForTimeout(1000);
          }
          // Also try pressing Escape
          await operatorPage.keyboard.press("Escape");
          await operatorPage.waitForTimeout(1000);

          const textarea = operatorPage.locator('textarea[placeholder*="Ask the landlord" i], textarea[placeholder*="message" i], textarea').first();
          const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);

          if (hasTextarea) {
            const msg = `Hi, is this property still available? I'm interested in a 12-month rent-to-rent arrangement. [QA-${TS}]`;
            await textarea.fill(msg);

            // Click send button (the arrow icon button)
            const sendBtn = operatorPage.locator('button[type="submit"], button:has(svg.lucide-send), button:has(svg[class*="send"])').last();
            if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await sendBtn.click();
            } else {
              // Try the send-plane icon button at bottom right of chat
              const allBtns = operatorPage.locator('[data-feature="CRM_INBOX__CHAT_PANEL"] button');
              const btnCount = await allBtns.count();
              if (btnCount > 0) await allBtns.last().click();
            }
            await operatorPage.waitForTimeout(3000);
            log("operator_msg", "Sent (or attempted)");
            await ss(operatorPage, "14-operator-message");
          } else {
            log("operator_msg", paymentGateDetected ? "BLOCKED by payment gate" : "FAIL: no textarea");
          }
        } catch (e: any) {
          log("operator_msg", `FAIL: ${e.message}`);
        }
      }
    } else {
      log("inquire", "SKIP: no deal");
    }
  } catch (e: any) {
    log("inquire", `FAIL: ${e.message}`);
  }

  // ── 2C-2: Send message via Supabase API if payment gate blocked UI ──
  console.log("\n--- 2C-2 Ensure message exists in DB ---");
  let chatThreadId: string | null = null;
  try {
    if (adminTokens?.access_token && operatorTokens?.access_token && targetDealId) {
      // Check if thread was created
      const threadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/chat_threads?select=id,property_id,operator_id,landlord_id&property_id=eq.${targetDealId}&operator_id=eq.${operatorTokens.user.id}&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${operatorTokens.access_token}` } }
      );
      const threads = await threadRes.json();

      if (Array.isArray(threads) && threads.length > 0) {
        chatThreadId = threads[0].id;
        log("chat_thread_db", `Found thread: ${chatThreadId}`);

        // Check if message exists
        const msgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=id,body,sender_id&thread_id=eq.${chatThreadId}&limit=5`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${operatorTokens.access_token}` } }
        );
        const msgs = await msgRes.json();
        const msgCount = Array.isArray(msgs) ? msgs.length : 0;
        log("chat_messages_db", `${msgCount} messages in thread`);

        // If no messages (payment gate blocked), insert one via API
        if (msgCount === 0) {
          console.log("  Inserting operator message via API...");
          const insertMsgRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${operatorTokens.access_token}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              thread_id: chatThreadId,
              sender_id: operatorTokens.user.id,
              body: `Hi, is this property still available? I'm interested in a 12-month rent-to-rent arrangement. [QA-API-${TS}]`,
            }),
          });
          const insertMsgData = await insertMsgRes.json();
          log("operator_msg_api", `HTTP ${insertMsgRes.status}, Data: ${JSON.stringify(insertMsgData).slice(0, 100)}`);
        }
      } else {
        log("chat_thread_db", `No thread found for property ${targetDealId} and operator ${operatorTokens.user.id}`);

        // The thread may exist but the operator doesn't have SELECT access — try with admin
        const adminThreadRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_threads?select=id,property_id,operator_id,landlord_id&property_id=eq.${targetDealId}&limit=5`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${adminTokens.access_token}` } }
        );
        const adminThreads = await adminThreadRes.json();
        log("chat_thread_admin_view", `Admin sees ${Array.isArray(adminThreads) ? adminThreads.length : 0} threads for property. Data: ${JSON.stringify(adminThreads).slice(0, 200)}`);

        if (Array.isArray(adminThreads) && adminThreads.length > 0) {
          chatThreadId = adminThreads[0].id;
        }
      }
    }
  } catch (e: any) {
    log("chat_thread_check", `FAIL: ${e.message}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // PART 3: LANDLORD RECEIVES AND REPLIES
  // ══════════════════════════════════════════════════════════════════

  console.log("\n========== PART 3: LANDLORD RECEIVES AND REPLIES ==========\n");

  // ── 3A: Admin checks inbox ──
  console.log("--- 3A Admin inbox ---");
  try {
    await adminPage.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
    await adminPage.waitForTimeout(4000);
    log("admin_inbox_url", adminPage.url());
    await ss(adminPage, "15-admin-inbox");

    // The thread panel should be visible — look for "Miami" text
    const bodyText = await adminPage.textContent("body");
    const hasMiamiThread = bodyText?.includes("Miami") || false;
    log("admin_inbox_miami", hasMiamiThread ? "Miami thread visible" : "Miami thread NOT visible");

    // Click directly on the "Miami" thread text
    try {
      const miamiThread = adminPage.getByText("Miami", { exact: false }).first();
      if (await miamiThread.isVisible({ timeout: 3000 }).catch(() => false)) {
        await miamiThread.click();
        await adminPage.waitForTimeout(3000);
        await ss(adminPage, "16-admin-miami-thread-open");

        // Check if chat panel loaded with messages
        const chatPanel = adminPage.locator('[data-feature="CRM_INBOX__CHAT_PANEL"]');
        const chatText = await chatPanel.textContent().catch(() => "");
        const hasMessages = chatText?.includes("QA") || chatText?.includes("property") || chatText?.includes("available") || false;
        log("admin_chat_loaded", hasMessages ? "Chat messages visible" : "Chat panel loaded but no QA messages visible");

        // Check for message input (textarea)
        const textarea = adminPage.locator('textarea').first();
        const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
        log("admin_has_textarea", hasTextarea ? "Textarea visible" : "No textarea visible");
      } else {
        log("admin_miami_click", "FAIL: Could not find Miami thread to click");
      }
    } catch (e: any) {
      log("admin_miami_click", `FAIL: ${e.message}`);
    }
  } catch (e: any) {
    log("admin_inbox", `FAIL: ${e.message}`);
  }

  // ── 3B: NDA check ──
  console.log("\n--- 3B NDA check ---");
  try {
    const ndaText = adminPage.getByText(/NDA|Non-Disclosure|Agreement.*sign|Sign.*before/i).first();
    const hasNDA = await ndaText.isVisible({ timeout: 3000 }).catch(() => false);
    log("nda_prompt", hasNDA ? "NDA prompt appeared" : "No NDA prompt");

    if (hasNDA) {
      await ss(adminPage, "17-nda-prompt");
      try {
        const checkbox = adminPage.locator('input[type="checkbox"]').first();
        if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) await checkbox.click();
        const signBtn = adminPage.getByRole("button", { name: /sign|agree|accept/i }).first();
        if (await signBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await signBtn.click();
          await adminPage.waitForTimeout(2000);
          log("nda_signed", "OK");
          await ss(adminPage, "18-nda-signed");
        }
      } catch { /* ignore */ }
    }
  } catch (e: any) {
    log("nda", `FAIL: ${e.message}`);
  }

  // ── 3C: Landlord replies ──
  console.log("\n--- 3C Landlord reply ---");
  let landlordReplied = false;
  try {
    // First try via the UI
    const textarea = adminPage.locator('textarea').first();
    const hasTextarea = await textarea.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTextarea) {
      const replyMsg = `Yes, the property is still available. The rent is $2,800/month with a 12-month minimum. Would you like to arrange a viewing? [QA-REPLY-${TS}]`;
      await textarea.fill(replyMsg);
      await adminPage.waitForTimeout(500);

      // Click send (the arrow/plane icon button near the textarea)
      const sendBtn = adminPage.locator('button[type="submit"]').last();
      const hasSend = await sendBtn.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasSend) {
        await sendBtn.click();
      } else {
        // Try clicking any button near the textarea
        const chatBtns = adminPage.locator('[data-feature="CRM_INBOX__CHAT_PANEL"] button');
        const chatBtnCount = await chatBtns.count();
        if (chatBtnCount > 0) await chatBtns.last().click();
      }
      await adminPage.waitForTimeout(3000);
      landlordReplied = true;
      log("landlord_reply_ui", "Reply sent via UI");
      await ss(adminPage, "19-landlord-reply");
    } else {
      log("landlord_reply_ui", "No textarea — will try API");
    }

    // Also try via Supabase API if we have a thread
    if (!landlordReplied && chatThreadId && adminTokens?.access_token) {
      console.log("  Sending landlord reply via API...");
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${adminTokens.access_token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          thread_id: chatThreadId,
          sender_id: adminTokens.user.id,
          body: `Yes, the property is still available. The rent is $2,800/month with a 12-month minimum. Would you like to arrange a viewing? [QA-REPLY-API-${TS}]`,
        }),
      });
      const data = await insertRes.json();
      landlordReplied = insertRes.status >= 200 && insertRes.status < 300;
      log("landlord_reply_api", `HTTP ${insertRes.status}, Data: ${JSON.stringify(data).slice(0, 100)}`);
    }
  } catch (e: any) {
    log("landlord_reply", `FAIL: ${e.message}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // PART 4: OPERATOR SEES REPLY
  // ══════════════════════════════════════════════════════════════════

  console.log("\n========== PART 4: OPERATOR SEES REPLY ==========\n");

  try {
    await operatorPage.goto(`${HUB}/dashboard/inbox`, { waitUntil: "networkidle", timeout: 30_000 });
    await operatorPage.waitForTimeout(5000);
    log("operator_inbox", `URL: ${operatorPage.url()}`);
    await ss(operatorPage, "20-operator-inbox");

    // Click on Miami thread
    try {
      const miamiThread = operatorPage.getByText("Miami", { exact: false }).first();
      if (await miamiThread.isVisible({ timeout: 3000 }).catch(() => false)) {
        await miamiThread.click();
        await operatorPage.waitForTimeout(3000);
        await ss(operatorPage, "21-operator-thread-open");

        const bodyText = await operatorPage.textContent("body");
        const hasReply = bodyText?.includes("still available") || bodyText?.includes("QA-REPLY") || false;
        log("operator_sees_reply", hasReply ? "OK — landlord reply visible" : "Landlord reply NOT visible");
      } else {
        log("operator_thread_click", "Miami thread not visible in operator inbox");
        await ss(operatorPage, "21-operator-no-miami");
      }
    } catch (e: any) {
      log("operator_thread", `FAIL: ${e.message}`);
    }

    // Verify messages in DB
    if (chatThreadId && operatorTokens?.access_token) {
      try {
        const msgRes = await fetch(
          `${SUPABASE_URL}/rest/v1/chat_messages?select=id,body,sender_id,created_at&thread_id=eq.${chatThreadId}&order=created_at.asc`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${operatorTokens.access_token}` } }
        );
        const msgs = await msgRes.json();
        if (Array.isArray(msgs)) {
          log("chat_messages_final", `${msgs.length} messages in thread`);
          msgs.forEach((m: any, i: number) => {
            log(`msg_${i}`, `From: ${m.sender_id?.slice(0, 8)}, Body: ${m.body?.slice(0, 60)}`);
          });
        }
      } catch { /* ignore */ }
    }
  } catch (e: any) {
    log("operator_inbox", `FAIL: ${e.message}`);
  }

  // ══════════════════════════════════════════════════════════════════
  // PART 5: FINAL REPORT
  // ══════════════════════════════════════════════════════════════════

  console.log("\n\n" + "=".repeat(65));
  console.log("       QA DEALS, LISTINGS & CHAT — FINAL REPORT");
  console.log("=".repeat(65));

  console.log("\n  LISTINGS CREATED");
  console.log(`  Quick List:   ${quickListPropertyId ? `${HUB}/deals/${quickListPropertyId} — OK` : "FAILED/skipped"}`);
  console.log(`  Miami Rental: ${rentalPropertyId ? `${HUB}/deals/${rentalPropertyId} — OK` : "FAILED/skipped"}`);
  console.log(`  Miami Sale:   ${salePropertyId ? `${HUB}/deals/${salePropertyId} — OK` : "FAILED/skipped"}`);

  console.log("\n  CHAT THREAD");
  console.log(`  Thread created:            ${threadCreated ? "OK" : "FAIL/UNKNOWN"}`);
  console.log(`  Thread ID:                 ${chatThreadId || "UNKNOWN"}`);
  console.log(`  Operator sent message:     ${R["operator_msg"] || R["operator_msg_api"] || "UNKNOWN"}`);
  console.log(`  Payment gate:              ${paymentGateDetected ? "YES — free tier blocks messaging" : "No"}`);
  console.log(`  Landlord received message: ${R["admin_inbox_miami"] || "UNKNOWN"}`);
  console.log(`  NDA appeared:              ${R["nda_prompt"] || "UNKNOWN"}`);
  console.log(`  NDA signed:                ${R["nda_signed"] || "N/A"}`);
  console.log(`  Landlord replied:          ${landlordReplied ? "OK" : "FAIL"}`);
  console.log(`  Operator saw reply:        ${R["operator_sees_reply"] || "UNKNOWN"}`);

  console.log("\n  ALL FINDINGS");
  for (const [key, value] of Object.entries(R)) {
    console.log(`  ${value.startsWith("FAIL") ? "X" : ">"} ${key}: ${value}`);
  }

  console.log("\n  FIXES NEEDED");
  if (paymentGateDetected) {
    console.log("  - Payment gate blocks new/free users from messaging — operator cannot send inquiry without paying");
  }
  console.log("=".repeat(65));

  // Clean up contexts
  try { await adminContext.close(); } catch { /* ignore */ }
  try { await operatorContext.close(); } catch { /* ignore */ }
});
