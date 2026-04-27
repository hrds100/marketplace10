// PR 96 verification — ContactSmsModal SMS now writes to wk_sms_messages
// (was hitting legacy `sms-send` → legacy `sms_messages` table).
//
// Strategy: insert a wk_sms_messages row directly via service-role to
// simulate a sent SMS (avoids burning Twilio + carrier). Verify it
// appears in /crm/inbox within 30s — proves the realtime + polling
// fallback path works for outbound SMS too.
//
// Real-Twilio-send testing is gated by Hugo's call (costs money).

import { test, expect } from '@playwright/test';

const EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const PASSWORD = 'CrmTest2026Pw!';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_JWT = process.env.SUPABASE_SERVICE_ROLE_JWT ?? '';

test('PR 96: outbound wk_sms_messages row appears in /crm/inbox via realtime', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!SERVICE_ROLE_JWT, 'SUPABASE_SERVICE_ROLE_JWT not set');

  // 1. Sign in.
  await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
  await page.waitForURL(/\/crm\/(inbox|dashboard|contacts)/, { timeout: 30_000 });

  await page.goto('https://hub.nfstay.com/crm/inbox', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // 2. Pick any contact with a phone to attach the message to.
  const contactsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/wk_contacts?select=id,name,phone&phone=not.is.null&limit=1`,
    { headers: { apikey: SERVICE_ROLE_JWT, Authorization: `Bearer ${SERVICE_ROLE_JWT}` } }
  );
  const contacts = (await contactsRes.json()) as Array<{ id: string; name: string; phone: string }>;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    throw new Error('no wk_contacts with phone to test against');
  }
  const target = contacts[0];

  // 3. Insert a probe outbound SMS row (PR 96: now must include channel='sms').
  const probeBody = `PR96-OutboundSMS-${Date.now()}`;
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/wk_sms_messages`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_JWT,
      Authorization: `Bearer ${SERVICE_ROLE_JWT}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      contact_id: target.id,
      direction: 'outbound',
      channel: 'sms',
      body: probeBody,
      from_e164: '+447380308316',
      to_e164: target.phone,
      status: 'sent',
    }),
  });
  const inserted = await insertRes.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertedId = Array.isArray(inserted) ? (inserted as any[])[0]?.id : (inserted as any).id;
  console.log('Inserted probe SMS row:', insertedId, 'for contact', target.id);

  // 4. Click the contact's thread in the sidebar so messages render.
  //    Wait for the thread row to appear (realtime should land it).
  await page.waitForTimeout(2000);
  const threadRow = page.locator('[data-testid^="inbox-row-"]').filter({ hasText: target.phone.slice(-9) }).first();
  if (await threadRow.count() > 0) {
    await threadRow.click();
  }

  // 5. Verify the body appears within 30s (realtime + 30s poll fallback).
  const probeLocator = page.locator(`text=${probeBody}`).first();
  try {
    await expect(probeLocator).toBeVisible({ timeout: 35_000 });
    console.log('✓ Probe SMS body visible in inbox');
    await page.screenshot({ path: 'e2e/screenshots/pr96-inbox-probe.png', fullPage: true });
  } finally {
    // 6. Clean up the probe row.
    if (insertedId) {
      await fetch(`${SUPABASE_URL}/rest/v1/wk_sms_messages?id=eq.${insertedId}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE_JWT, Authorization: `Bearer ${SERVICE_ROLE_JWT}` },
      });
      console.log('Deleted probe row', insertedId);
    }
  }
});
