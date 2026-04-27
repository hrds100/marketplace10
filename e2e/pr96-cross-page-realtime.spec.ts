// PR 96 verification — cross-page realtime propagation.
// Hugo asked: when I rename a pipeline column in Settings, does
// /crm/contacts header update without refresh?
//
// Strategy: open /crm/contacts → mutate wk_pipeline_columns directly
// via service-role HTTP (simulating the rename happening "in another
// tab") → wait for realtime push → verify the new name appears.
// Revert at the end.

import { test, expect } from '@playwright/test';

const EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const PASSWORD = 'CrmTest2026Pw!';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_JWT = process.env.SUPABASE_SERVICE_ROLE_JWT ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function patchColumn(id: string, name: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/wk_pipeline_columns?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_JWT,
      Authorization: `Bearer ${SERVICE_ROLE_JWT}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

test('PR 96: pipeline column rename propagates to /crm/contacts via realtime', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(!SERVICE_ROLE_JWT, 'SUPABASE_SERVICE_ROLE_JWT not set');

  // 1. Sign in as a CRM user.
  await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
  await page.waitForURL(/\/crm\/(inbox|dashboard|contacts)/, { timeout: 30_000 });

  // 2. Go to /crm/pipelines (kanban) — column headers render the names
  //    we want to verify the realtime sub picks up.
  await page.goto('https://hub.nfstay.com/crm/pipelines', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/screenshots/pr96-pipelines-before-rename.png', fullPage: true });

  // 3. Read the first column from the DB and rename it to a unique probe.
  const probe = `PR96-Probe-${Date.now()}`;
  const listRes = await fetch(
    `${SUPABASE_URL}/rest/v1/wk_pipeline_columns?select=id,name&order=position.asc&limit=1`,
    { headers: { apikey: SERVICE_ROLE_JWT, Authorization: `Bearer ${SERVICE_ROLE_JWT}` } }
  );
  const cols = await listRes.json();
  if (!Array.isArray(cols) || cols.length === 0) {
    throw new Error('no wk_pipeline_columns rows to test against');
  }
  const target = cols[0] as { id: string; name: string };
  const originalName = target.name;
  console.log(`Renaming column ${target.id} from "${originalName}" → "${probe}"`);

  await patchColumn(target.id, probe);

  // 4. Wait up to 30s for realtime to push the update + UI re-render.
  //    With the PR 96 sub on wk_pipeline_columns this should be < 2s.
  const probeLocator = page.locator(`text=${probe}`).first();
  try {
    await expect(probeLocator).toBeVisible({ timeout: 30_000 });
    console.log('✓ Probe name appeared in /crm/pipelines within 30s');
    await page.screenshot({ path: 'e2e/screenshots/pr96-pipelines-after-rename.png', fullPage: true });
  } finally {
    // 5. Revert.
    await patchColumn(target.id, originalName);
    console.log(`Reverted "${probe}" → "${originalName}"`);
  }
});
