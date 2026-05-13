/**
 * inbox-unknown-contacts.spec.ts
 * TDD: contacts should not show as "Unknown" in CRM inbox when they
 * have names in wk_contacts. Edit modal should show all fields.
 */
import { test, expect, type Page } from "@playwright/test";

const HUB = "https://hub.nfstay.com";
const SUPABASE_URL = "https://asazddtvjvmckouxcmmo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A";

const ADMIN_EMAIL = "admin@hub.nfstay.com";
const ADMIN_PASSWORD = "Dgs58913347.";

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
  await page.goto(HUB, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => localStorage.setItem(k, v),
    [storageKey, sessionData]
  );
}

test.describe("CRM Inbox — contact names & edit modal", () => {
  test("sidebar contacts should not show 'Unknown' when wk_contacts has a name or phone", async ({
    page,
  }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${HUB}/crm/inbox`, { waitUntil: "domcontentloaded" });

    // Wait for sidebar to populate
    await page.waitForSelector("aside button", {
      timeout: 20000,
    });

    // Collect all sidebar contact names
    const names = await page.$$eval(
      "aside button",
      (btns) =>
        btns
          .map((b) => {
            const nameEl = b.querySelector(".font-semibold");
            return nameEl?.textContent?.trim() ?? "";
          })
          .filter(Boolean)
    );

    // None of them should be literally "Unknown"
    const unknowns = names.filter((n) => n === "Unknown");
    expect(
      unknowns.length,
      `Found ${unknowns.length} contacts showing as "Unknown" out of ${names.length} total`
    ).toBe(0);

    await page.screenshot({
      path: "e2e/screenshots/inbox-no-unknowns.png",
      fullPage: false,
    });
  });

  test("edit modal should show contact fields (name, phone) when opened", async ({
    page,
  }) => {
    await injectAuth(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${HUB}/crm/inbox`, { waitUntil: "domcontentloaded" });

    // Wait for sidebar, click first contact
    await page.waitForSelector("aside button", { timeout: 20000 });
    // Brief wait for store hydration (useHydrateContacts)
    await page.waitForTimeout(2000);
    await page.click("aside button:first-child");

    // Wait for thread header to appear, then click Edit
    await page.waitForSelector('button:has-text("Edit")', { timeout: 10000 });
    await page.click('button:has-text("Edit")');

    // Wait for modal
    await page.waitForSelector("text=Edit contact", { timeout: 5000 });

    // Scope to the modal overlay
    const modal = page.locator('.fixed.inset-0').filter({ hasText: 'Edit contact' });

    // Name field should not be empty
    const nameInput = modal.locator('input').first();
    const nameVal = await nameInput.inputValue();
    console.log(`[test] Name field value: "${nameVal}"`);
    expect(nameVal.trim().length, "Name field should not be empty").toBeGreaterThan(0);

    // Phone field should not be empty
    const phoneInput = modal.locator('input').nth(1);
    const phoneVal = await phoneInput.inputValue();
    console.log(`[test] Phone field value: "${phoneVal}"`);
    expect(phoneVal.trim().length, "Phone field should not be empty").toBeGreaterThan(0);

    await page.screenshot({
      path: "e2e/screenshots/inbox-edit-modal-fields.png",
      fullPage: false,
    });
  });
});
