// PR 96 verification — new wk_numbers row appears in Settings →
// Campaigns channel-slot dropdown without refresh. Proxy for the
// "connect new WhatsApp" flow (which requires Hugo's phone for the
// QR scan; we simulate by directly inserting a wk_numbers row).

import { test, expect } from '@playwright/test';

// Settings is admin-only (AdminOnlyRoute), so we sign in as the admin
// fixture rather than the regular CRM agent test user.
const EMAIL = 'admin@hub.nfstay.com';
const PASSWORD = 'Dgs58913347.';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_JWT = process.env.SUPABASE_SERVICE_ROLE_JWT ?? '';

test('PR 96: wk_numbers INSERT propagates to Settings panel via realtime', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!SERVICE_ROLE_JWT, 'SUPABASE_SERVICE_ROLE_JWT not set');

  const probeE164 = `+44999900${Date.now() % 10000}`;
  let insertedId: string | null = null;

  // Admin uses the regular sign-in page, not /crm/login (the latter is
  // for agents only; admin signs in via /signin then routes to /crm).
  await page.goto('https://hub.nfstay.com/signin', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
  await page.waitForTimeout(5000);

  await page.goto('https://hub.nfstay.com/crm/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click the first campaign in the sidebar to render its bundle.
  const firstCampaign = page.locator('text=/Dialer test|bb|Girlie/').first();
  await firstCampaign.click({ timeout: 10_000 });
  await page.waitForTimeout(2000);

  // Click the Numbers/Channels tab inside the campaign view.
  const numbersTab = page.locator('button, a').filter({
    hasText: /Numbers|Channels|Phone/i,
  }).first();
  if (await numbersTab.count() > 0) {
    await numbersTab.click().catch(() => {});
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: 'e2e/screenshots/pr96-numbers-before.png', fullPage: true });

  try {
    // Insert a probe whatsapp wk_numbers row.
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/wk_numbers`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_JWT,
        Authorization: `Bearer ${SERVICE_ROLE_JWT}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        e164: probeE164,
        channel: 'whatsapp',
        provider: 'unipile',
        external_id: `probe-${Date.now()}`,
        is_active: true,
        voice_enabled: false,
        sms_enabled: false,
        recording_enabled: false,
      }),
    });
    const inserted = await insertRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    insertedId = Array.isArray(inserted) ? (inserted as any[])[0]?.id ?? null : (inserted as any).id ?? null;
    console.log('Inserted probe wk_numbers row:', insertedId, probeE164);

    // The campaign channel-slot dropdown is a <select>. The probe e164
    // appears as an <option>. We can detect it via DOM eval.
    const appeared = await page.waitForFunction(
      (e164) => {
        const opts = Array.from(document.querySelectorAll('option')) as HTMLOptionElement[];
        return opts.some((o) => o.textContent?.includes(e164));
      },
      probeE164,
      { timeout: 35_000 }
    ).then(() => true).catch(() => false);

    expect(appeared).toBe(true);
    console.log('\u2713 Probe wk_numbers row appeared in dropdown via realtime');
    await page.screenshot({ path: 'e2e/screenshots/pr96-numbers-after.png', fullPage: true });
  } finally {
    if (insertedId) {
      await fetch(`${SUPABASE_URL}/rest/v1/wk_numbers?id=eq.${insertedId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE_JWT, Authorization: `Bearer ${SERVICE_ROLE_JWT}` },
      });
      console.log('Deleted probe wk_numbers row', insertedId);
    }
  }
});
