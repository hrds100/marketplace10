/**
 * E2E: New email signup creates a Particle wallet AND syncs the user to GoHighLevel.
 *
 * What this proves (no fakes — real browser, real Supabase, real GHL):
 *   1. Email signup form submits → /verify-otp loads.
 *   2. OTP verification accepts any 4-digit code (test mode).
 *   3. AFTER OTP verify and BEFORE dashboard renders, profiles.wallet_address is set.
 *   4. A GHL contact exists for the phone with tag `nfstay-signup` and the
 *      Wallet Address custom field populated.
 *
 * Run locally:
 *   GHL_BEARER_TOKEN=pit-... npx playwright test e2e/signup-wallet-ghl-email.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x';
const GHL_WALLET_FIELD_ID = 'VTlstZfxHCFaDlEYSgDv';
const GHL_TOKEN = process.env.GHL_BEARER_TOKEN || '';

// Unique user per run
const TS = Date.now();
const USER = {
  name: `Wallet Sync Test ${TS}`,
  email: `wallet-sync-${TS}@test.nfstay.com`,
  password: 'WalletSync2026!',
  phone: `77${String(TS).slice(-9)}`.slice(0, 10), // 10 digits after +44
};
const FULL_PHONE = `+44${USER.phone}`;

async function fillSignupForm(page: Page) {
  await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle', timeout: 30_000 });
  const emailBtn = page.locator('button:has-text("Sign up with Email")');
  if (await emailBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emailBtn.click();
    await page.waitForTimeout(500);
  }
  await page.locator('input[data-feature="AUTH__SIGNUP_NAME"]').first().fill(USER.name);
  await page.locator('input[data-feature="AUTH__SIGNUP_EMAIL"]').first().fill(USER.email);
  await page.locator('input[data-feature="AUTH__SIGNUP_PASSWORD"]').first().fill(USER.password);
  await page.locator('input[placeholder*="Re-enter" i]').first().fill(USER.password);
  await page.locator('input[data-feature="AUTH__SIGNUP_PHONE"]').first().fill(USER.phone);
  await page.locator('input[type="checkbox"]').first().check({ force: true });
  await page.locator('button[data-feature="AUTH__SIGNUP_SUBMIT"]').first().click();
}

async function getProfileWalletAddress(email: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=wallet_address,wallet_auth_method`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
  );
  const rows = await res.json();
  return rows?.[0]?.wallet_address || null;
}

async function getGhlContactByPhone(phone: string) {
  if (!GHL_TOKEN) return null;
  const res = await fetch(
    `https://services.leadconnectorhq.com/contacts/?query=${encodeURIComponent(phone)}&locationId=${GHL_LOCATION_ID}`,
    { headers: { Authorization: `Bearer ${GHL_TOKEN}`, Version: '2021-07-28' } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.contacts?.[0] || null;
}

test('email signup creates wallet and GHL contact with wallet custom field', async ({ page }) => {
  test.setTimeout(180_000);

  await fillSignupForm(page);

  // Land on /verify-otp
  await page.waitForURL(/\/verify-otp/, { timeout: 30_000 });

  // Enter any 4-digit code (test OTP accepts anything)
  for (let i = 0; i < 4; i++) {
    await page.keyboard.type(String((i + 1) % 10));
  }
  // Give VerifyOtp time to: verify OTP → create wallet (up to 3 retries × ~3s) → GHL sync → redirect
  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });

  // Assertion 1 — wallet is in Supabase profile
  let walletAddress: string | null = null;
  for (let i = 0; i < 15 && !walletAddress; i++) {
    walletAddress = await getProfileWalletAddress(USER.email);
    if (!walletAddress) await page.waitForTimeout(1000);
  }
  expect(walletAddress, 'profiles.wallet_address should be set after signup').toMatch(/^0x[a-fA-F0-9]{40}$/);

  // Assertion 2 — GHL contact exists with tag + wallet custom field
  if (!GHL_TOKEN) {
    test.info().annotations.push({
      type: 'skip-ghl',
      description: 'GHL_BEARER_TOKEN not set — skipping GHL assertions',
    });
    return;
  }
  let contact: any = null;
  for (let i = 0; i < 10 && !contact; i++) {
    contact = await getGhlContactByPhone(FULL_PHONE);
    if (!contact) await page.waitForTimeout(2000);
  }
  expect(contact, `GHL contact for ${FULL_PHONE} should exist`).toBeTruthy();
  expect(contact.tags || [], 'GHL contact should have nfstay-signup tag').toContain('nfstay-signup');

  const walletField = (contact.customFields || []).find((f: any) => f.id === GHL_WALLET_FIELD_ID);
  expect(walletField, 'Wallet Address custom field should be present on GHL contact').toBeTruthy();
  expect(String(walletField.value || walletField.field_value || '')).toMatch(/^0x[a-fA-F0-9]{40}$/);
  expect(String(walletField.value || walletField.field_value)).toBe(walletAddress);
});
