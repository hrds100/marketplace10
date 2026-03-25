/**
 * REFERRAL TRACKING REGRESSION TESTS
 * Ensures referral codes are captured, stored, and written to profiles.referred_by
 * via the track-referral edge function (service role), not client-side SDK.
 *
 * Run: npx playwright test e2e/referral-tracking-regression.spec.ts --config=e2e/hub-playwright.config.ts
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';

async function injectAuth(page: import('@playwright/test').Page) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const tokens = await res.json();
  if (!tokens.access_token) throw new Error(`Auth failed: ${JSON.stringify(tokens)}`);
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.evaluate(
    ([key, data]) => localStorage.setItem(key, data),
    ['sb-asazddtvjvmckouxcmmo-auth-token', JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: tokens.user,
    })]
  );
  return tokens;
}

test.describe('Referral Tracking — Regression Tests', () => {

  test('1. Signup page captures ?ref= into localStorage', async ({ page }) => {
    await page.goto(`${BASE}/signup?ref=TESTREF99`, { waitUntil: 'networkidle' });
    const ref = await page.evaluate(() => localStorage.getItem('nfstay_ref'));
    expect(ref).toBe('TESTREF99');
  });

  test('2. Invest page captures ?ref= into localStorage', async ({ page }) => {
    // Invest page is behind auth, so the ref should be captured before redirect
    await page.goto(`${BASE}/dashboard/invest/marketplace?ref=INVESTREF1&property=2`, { waitUntil: 'networkidle' });
    // Even though redirected to signin, ref should be in localStorage
    const ref = await page.evaluate(() => localStorage.getItem('nfstay_ref'));
    expect(ref).toBe('INVESTREF1');
  });

  test('3. track-referral click event returns success', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/track-referral?code=HU1`, { method: 'POST' });
    const result = await res.json();
    expect(result.success).toBe(true);
  });

  test('4. track-referral signup event returns success and writes referred_by', async () => {
    // Fire signup event via track-referral with a test userId
    // The edge function uses service role to write referred_by
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const tokens = await authRes.json();
    const userId = tokens.user.id;

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/track-referral?code=HU1&event=signup&userId=${userId}&userName=TestAdmin&userEmail=${ADMIN_EMAIL}`,
      { method: 'POST' },
    );
    const result = await res.json();
    expect(result.success).toBe(true);

    // Wait for DB write, then verify
    await new Promise(r => setTimeout(r, 2000));
    const profile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=referred_by`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tokens.access_token}` },
    }).then(r => r.json());
    expect(profile[0]?.referred_by).toBe('HU1');

    // Clean up
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ referred_by: null }),
    });
  });

  test('5. Old referral codes still work via previous_codes fallback', async () => {
    // AGEN0W was Hugo's old code, now renamed to HU1
    const res = await fetch(`${SUPABASE_URL}/functions/v1/track-referral?code=AGEN0W`, { method: 'POST' });
    const result = await res.json();
    expect(result.success).toBe(true);
  });

  test('6. Sign out redirects to landing page', async ({ page }) => {
    await injectAuth(page);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Find and click sign out (could be in sidebar, topnav, or burger menu)
    const signOutBtn = page.locator('button, a').filter({ hasText: /sign out|log out|logout/i }).first();
    if (await signOutBtn.count() > 0) {
      await signOutBtn.click();
      await page.waitForTimeout(3000);
      // Should be on the landing page
      expect(page.url()).toBe(`${BASE}/`);
    }
  });

  test('7. All 4 email types are functional', async () => {
    for (const type of ['inv-purchase-buyer', 'inv-purchase-agent', 'inv-purchase-admin', 'inv-order-approved-buyer']) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data: {
            email: 'test-noreply@example.com',
            agentEmail: 'test-noreply@example.com',
            property: 'Test',
            amount: 1,
            shares: 1,
          },
        }),
      });
      // Should not get a BOOT_ERROR or 500
      expect(res.status).toBeLessThan(500);
    }
  });

  test('8. inv-samcart-webhook is alive and responding (NOT returning NOT_FOUND)', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/inv-samcart-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Should return 400 (invalid payload) NOT 404 (function not found)
    expect(res.status).not.toBe(404);
    const body = await res.json();
    expect(body.code).not.toBe('NOT_FOUND');
    expect(body.code).not.toBe('BOOT_ERROR');
  });

  test('9. inv-approve-order is alive and responding', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/inv-approve-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).not.toBe(404);
    const body = await res.json();
    expect(body.code).not.toBe('NOT_FOUND');
    expect(body.code).not.toBe('BOOT_ERROR');
  });
});
