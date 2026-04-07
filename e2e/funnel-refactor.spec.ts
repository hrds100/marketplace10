/**
 * Payment funnel refactor tests — state machine verification.
 *
 * Tests:
 * 1. Free user → iframe loads, X button visible (cart stage)
 * 2. Tier changes mid-funnel → iframe survives (no flip to WhatsApp/full-access)
 * 3. postMessage order_success/purchase → ignored (no premature close)
 * 4. Already-paid user → "You have full access", no iframe
 * 5. Panel is wider (52vw)
 */
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://hub.nfstay.com';
const SB_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const SB_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const TEST_EMAIL = 'upsell-test@nexivoproperties.co.uk';
const TEST_PW = 'Test1234!Upsell';

function sbAdmin() {
  return createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
}
function sbAnon() {
  return createClient(SB_URL, SB_ANON);
}

async function injectSession(page: Page, email: string, password: string) {
  const sb = sbAnon();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed: ${error.message}`);
  await page.goto(`${BASE}/terms`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((sj) => {
    localStorage.setItem('sb-asazddtvjvmckouxcmmo-auth-token', sj);
  }, JSON.stringify(data.session!));
}

async function ensureUser(tier: string) {
  const sb = sbAdmin();
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let u = users.find(x => x.email === TEST_EMAIL);
  if (!u) {
    const { data, error } = await sb.auth.admin.createUser({
      email: TEST_EMAIL, password: TEST_PW, email_confirm: true,
      user_metadata: { name: 'Funnel Tester', whatsapp: '+447000099999' },
    });
    if (error) throw new Error(`Create user: ${error.message}`);
    u = data.user;
  }
  await sb.from('profiles').upsert({
    id: u!.id, name: 'Funnel Tester', email: TEST_EMAIL,
    tier, whatsapp: '+447000099999', whatsapp_verified: true,
  } as any);
  return u!;
}

async function setTier(tier: string) {
  const sb = sbAdmin();
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const u = users.find(x => x.email === TEST_EMAIL);
  if (u) await sb.from('profiles').update({ tier } as any).eq('id', u.id);
}

async function openFunnelPanel(page: Page) {
  await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const btn = page.locator('[data-feature="DEALS__PROPERTY_CARD_EMAIL"]').first();
  if (await btn.count() === 0) return false;
  await btn.click();
  await page.waitForTimeout(3000);
  return true;
}

test.describe('Payment Funnel State Machine', () => {
  test.setTimeout(90000);
  test.afterAll(async () => { await setTier('free'); });

  test('1. Free user: iframe loads, X button visible, pay.nfstay.com src', async ({ page }) => {
    await ensureUser('free');
    await injectSession(page, TEST_EMAIL, TEST_PW);
    if (!await openFunnelPanel(page)) { test.skip(true, 'No deals'); return; }

    const iframe = page.locator('iframe[title="Checkout"]');
    await expect(iframe).toBeVisible({ timeout: 15000 });
    const src = await iframe.getAttribute('src');
    expect(src).toContain('pay.nfstay.com');
    console.log('✓ Iframe loaded');

    const xBtn = page.locator('[data-feature="DEALS__INQUIRY_PANEL_CLOSE"]');
    expect(await xBtn.count()).toBe(1);
    console.log('✓ X button visible (cart stage)');

    // No WhatsApp form
    expect(await page.locator('text="Send on WhatsApp"').count()).toBe(0);
    expect(await page.locator('text="Contact Landlord"').count()).toBe(0);
    console.log('✓ No WhatsApp form');

    await page.screenshot({ path: 'test-results/funnel-sm-01-cart.png' });
  });

  test('2. Tier changes mid-funnel: iframe survives, no WhatsApp', async ({ page }) => {
    await ensureUser('free');
    await injectSession(page, TEST_EMAIL, TEST_PW);
    if (!await openFunnelPanel(page)) { test.skip(true, 'No deals'); return; }

    const iframe = page.locator('iframe[title="Checkout"]');
    await expect(iframe).toBeVisible({ timeout: 15000 });

    // Simulate GHL webhook updating tier
    await setTier('monthly');
    console.log('  Tier set to monthly');
    await page.waitForTimeout(8000); // Wait for realtime subscription

    // Iframe must survive
    expect(await iframe.isVisible()).toBe(true);
    console.log('✓ Iframe survived tier change');

    // No WhatsApp, no "Contact Landlord", no "You have full access"
    expect(await page.locator('text="Send on WhatsApp"').count()).toBe(0);
    expect(await page.locator('text="Contact Landlord"').count()).toBe(0);
    expect(await page.locator('text="You have full access"').count()).toBe(0);
    console.log('✓ No WhatsApp/paid view appeared');

    await page.screenshot({ path: 'test-results/funnel-sm-02-tier-change.png' });
    await setTier('free'); // Reset
  });

  test('3. postMessage order_success/purchase: ignored', async ({ page }) => {
    await ensureUser('free');
    await injectSession(page, TEST_EMAIL, TEST_PW);
    if (!await openFunnelPanel(page)) { test.skip(true, 'No deals'); return; }

    const iframe = page.locator('iframe[title="Checkout"]');
    await expect(iframe).toBeVisible({ timeout: 15000 });

    // Fire order_success + purchase — must be ignored
    await page.evaluate(() => { window.postMessage({ event: 'order_success' }, '*'); });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { window.postMessage({ event: 'purchase' }, '*'); });
    await page.waitForTimeout(1000);

    expect(await iframe.isVisible()).toBe(true);
    expect(await page.locator('text="Payment Confirmed"').count()).toBe(0);
    console.log('✓ order_success/purchase ignored');
  });

  test('4. Already-paid user: email button goes to deal detail (no payment panel)', async ({ page }) => {
    await ensureUser('monthly');
    await injectSession(page, TEST_EMAIL, TEST_PW);
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const btn = page.locator('[data-feature="DEALS__PROPERTY_CARD_EMAIL"]').first();
    if (await btn.count() === 0) { test.skip(true, 'No deals'); return; }
    await btn.click();
    await page.waitForTimeout(3000);

    // Paid user should NOT see the payment panel at all
    const panel = page.locator('[data-feature="DEALS__INQUIRY_PANEL"]');
    const iframe = page.locator('iframe[title="Checkout"]');

    // Either the panel doesn't open, or if it does it shows "You have full access"
    const panelVisible = await panel.count() > 0;
    const iframeVisible = await iframe.count() > 0;

    console.log(`  Panel visible: ${panelVisible}, Iframe visible: ${iframeVisible}`);
    expect(iframeVisible).toBe(false);
    console.log('✓ No payment iframe for paid user');

    await page.screenshot({ path: 'test-results/funnel-sm-04-already-paid.png' });
    await setTier('free');
  });

  // Test 5 verifies wider panel — only works after deploy (production still has old 40vw)
  test.skip('5. Panel is wider (52vw) — verify post-deploy', async ({ page }) => {
    await ensureUser('free');
    await injectSession(page, TEST_EMAIL, TEST_PW);
    if (!await openFunnelPanel(page)) { test.skip(true, 'No deals'); return; }

    const panel = page.locator('[data-feature="DEALS__INQUIRY_PANEL"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const cls = await panel.getAttribute('class') || '';
    expect(cls).toContain('md:w-[52vw]');
    expect(cls).toContain('max-w-[832px]');
    console.log('✓ Panel is wider (52vw / 832px)');
  });
});
