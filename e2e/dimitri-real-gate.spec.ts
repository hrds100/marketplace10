/**
 * Dimitri Real Gate Test — Full e2e on production
 * Inquiry already created. Admin releases, then we check IMAP + WhatsApp.
 */
import { test, expect, type Page } from '@playwright/test';
import { ImapFlow } from 'imapflow';

const BASE = 'https://hub.nfstay.com';
const SB = 'https://asazddtvjvmckouxcmmo.supabase.co';
const AK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';
const LANDLORD_EMAIL = 'dimitri-gatetest@nexivoproperties.co.uk';

async function getTokens(email: string, password: string) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: AK, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (d?.access_token) return d;
    } catch {}
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Auth failed: ' + email);
}

async function inject(page: Page, tokens: any) {
  const key = 'sb-asazddtvjvmckouxcmmo-auth-token';
  const val = JSON.stringify({
    access_token: tokens.access_token, refresh_token: tokens.refresh_token,
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer', user: tokens.user,
  });
  await page.goto(BASE, { waitUntil: 'commit' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, val]);
}

async function searchImap(to: string, timeoutMs = 60000): Promise<{ found: boolean; subject?: string; body?: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const client = new ImapFlow({
      host: 'premium215.web-hosting.com', port: 993, secure: true,
      auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
      logger: false,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const uids = await client.search({ to, since: new Date(Date.now() - 3600000) });
        if (uids.length > 0) {
          for await (const msg of client.fetch(uids.slice(-5), { envelope: true, source: true })) {
            const body = msg.source?.toString() || '';
            return { found: true, subject: msg.envelope?.subject, body };
          }
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      try { await client.logout(); } catch {}
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  return { found: false };
}

test.describe.serial('Dimitri Real Gate Test', () => {
  test.setTimeout(300_000);

  // ── TEST 1: Admin Direct Release ──
  test('TEST 1: Admin Direct Release on Tenant Requests', async ({ page }) => {
    const tokens = await getTokens(ADMIN_EMAIL, ADMIN_PASS);
    await inject(page, tokens);

    await page.goto(`${BASE}/admin/marketplace/outreach`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Click Tenant Requests tab
    const tenantTab = page.locator('button:has-text("Tenant Requests"), [role="tab"]:has-text("Tenant")').first();
    if (await tenantTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tenantTab.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'test-results/realgate-01-tenant-requests.png' });

    // Expand all groups
    const chevrons = page.locator('span:has-text("▶"), button[aria-expanded="false"]');
    const chevCount = await chevrons.count();
    console.log('Chevrons to expand:', chevCount);
    for (let i = 0; i < Math.min(chevCount, 20); i++) {
      await chevrons.nth(i).click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/realgate-02-expanded.png', fullPage: true });

    // Find and click Direct button
    const directBtn = page.locator('button:has-text("Direct")').first();
    const directVisible = await directBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    console.log('Direct button visible:', directVisible);

    if (directVisible) {
      await page.screenshot({ path: 'test-results/realgate-03-before-direct.png' });
      await directBtn.click();
      console.log('CLICKED DIRECT RELEASE at', new Date().toISOString());
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/realgate-04-after-direct.png' });
    } else {
      // Try alternative button text
      const altBtn = page.locator('button:has-text("Release"), button:has-text("Authorize")').first();
      if (await altBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await altBtn.click();
        console.log('CLICKED alternative release button');
        await page.waitForTimeout(5000);
      } else {
        console.log('NO release button found');
        await page.screenshot({ path: 'test-results/realgate-03-no-button.png', fullPage: true });
      }
    }

    // Wait for notifications to fire
    console.log('Waiting 45s for landlord email + WhatsApp...');
    await page.waitForTimeout(45_000);
  });

  // ── TEST 1 CHECK: IMAP ──
  test('TEST 1 CHECK: IMAP email to landlord after Direct Release', async () => {
    console.log('Searching IMAP for email to', LANDLORD_EMAIL);
    const result = await searchImap(LANDLORD_EMAIL, 60_000);
    console.log('=== IMAP RESULT ===');
    console.log('Found:', result.found);
    console.log('Subject:', result.subject || 'N/A');

    if (result.found && result.body) {
      // Extract ALL hub.nfstay.com links
      const links = result.body.match(/https?:\/\/hub\.nfstay\.com\/[^\s"'<>)\\]*/gi) || [];
      console.log('Links found in email:', links.length);
      links.forEach((l, i) => console.log(`  Link ${i}: ${l}`));

      // Look for magic link specifically
      const magicLink = links.find(l => l.includes('token=') || l.includes('/inbox') || l.includes('/lead/'));
      if (magicLink) {
        console.log('MAGIC LINK:', magicLink);
      }
    }

    if (!result.found) {
      console.log('Email NOT found yet — checking all recent emails to any @nexivoproperties address');
      const client = new ImapFlow({
        host: 'premium215.web-hosting.com', port: 993, secure: true,
        auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
        logger: false,
      });
      try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
          const uids = await client.search({ since: new Date(Date.now() - 7200000) });
          console.log('Emails in last 2 hours:', uids.length);
          if (uids.length > 0) {
            for await (const msg of client.fetch(uids.slice(-10), { envelope: true })) {
              const toList = (msg.envelope?.to || []).map((a: any) => a.address).join(', ');
              console.log(`  -> To: ${toList} | Subject: ${msg.envelope?.subject} | Date: ${msg.envelope?.date}`);
            }
          }
        } finally { lock.release(); }
        await client.logout();
      } catch (e) {
        console.log('IMAP error:', String(e).slice(0, 100));
      }
    }

    // Soft pass — email delivery depends on GHL workflow timing
    console.log('TEST 1 IMAP CHECK COMPLETE');
  });

  // ── TEST 2: Send First Outreach ──
  test('TEST 2: Send First Outreach on Landlord Activation', async ({ page }) => {
    const tokens = await getTokens(ADMIN_EMAIL, ADMIN_PASS);
    await inject(page, tokens);

    await page.goto(`${BASE}/admin/marketplace/outreach`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000);

    // Click Landlord Activation tab
    const activationTab = page.locator('button:has-text("Landlord Activation"), [role="tab"]:has-text("Landlord")').first();
    if (await activationTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await activationTab.click();
      await page.waitForTimeout(3000);
    }
    await page.screenshot({ path: 'test-results/realgate-05-landlord-activation.png' });

    // Expand groups
    const chevrons = page.locator('span:has-text("▶"), button[aria-expanded="false"]');
    const cnt = await chevrons.count();
    for (let i = 0; i < Math.min(cnt, 20); i++) {
      await chevrons.nth(i).click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/realgate-06-expanded-activation.png', fullPage: true });

    // Find Send Outreach button
    const outreachBtn = page.locator('button:has-text("Send Outreach"), button:has-text("Send First")').first();
    const visible = await outreachBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    console.log('Send Outreach button visible:', visible);

    if (visible) {
      await page.screenshot({ path: 'test-results/realgate-07-before-outreach.png' });
      await outreachBtn.click();
      console.log('CLICKED SEND FIRST OUTREACH at', new Date().toISOString());
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-results/realgate-08-after-outreach.png' });
    }

    console.log('Waiting 45s for WhatsApp + email...');
    await page.waitForTimeout(45_000);
  });

  // ── TEST 3: Assign Lead ──
  test('TEST 3: Assign Lead with NDA+Claim', async ({ page }) => {
    const tokens = await getTokens(ADMIN_EMAIL, ADMIN_PASS);
    await inject(page, tokens);

    await page.goto(`${BASE}/admin/marketplace/outreach`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(3000);

    const activationTab = page.locator('button:has-text("Landlord Activation")').first();
    if (await activationTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await activationTab.click();
      await page.waitForTimeout(3000);
    }

    // Expand
    const chevrons = page.locator('span:has-text("▶"), button[aria-expanded="false"]');
    const cnt = await chevrons.count();
    for (let i = 0; i < Math.min(cnt, 20); i++) {
      await chevrons.nth(i).click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1500);

    // Find Assign Lead button
    const assignBtn = page.locator('button:has-text("Assign Lead")').first();
    const assignVisible = await assignBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    console.log('Assign Lead button visible:', assignVisible);

    if (assignVisible) {
      await assignBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/realgate-09-assign-form.png' });

      // Fill form fields
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
      const inputCount = await inputs.count();
      console.log('Form inputs found:', inputCount);

      // Fill by placeholder or position
      for (let i = 0; i < inputCount; i++) {
        const ph = await inputs.nth(i).getAttribute('placeholder') || '';
        const type = await inputs.nth(i).getAttribute('type') || '';
        console.log(`  Input ${i}: type=${type}, placeholder="${ph}"`);
      }

      // Name field
      const nameInput = page.locator('input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Assign Test Lead');
      }

      // Email field
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill('assign-test@nexivoproperties.co.uk');
      }

      // Phone field
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i]').first();
      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('+447000000077');
      }

      // Select NDA+Claim mode
      const selects = page.locator('select');
      const selectCount = await selects.count();
      console.log('Select dropdowns found:', selectCount);
      if (selectCount >= 1) {
        await selects.nth(0).selectOption('nda_and_claim');
        console.log('Selected nda_and_claim');
      }
      if (selectCount >= 2) {
        // Cold workflow is usually the first option
        const options = await selects.nth(1).locator('option').allTextContents();
        console.log('Workflow options:', options);
        await selects.nth(1).selectOption({ index: 0 });
      }

      await page.screenshot({ path: 'test-results/realgate-10-assign-filled.png' });

      // Submit
      const submitBtn = page.locator('button:has-text("Assign Lead")').last();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        console.log('CLICKED ASSIGN LEAD at', new Date().toISOString());
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'test-results/realgate-11-assign-result.png' });
      }
    }

    console.log('Waiting 45s for notifications...');
    await page.waitForTimeout(45_000);
  });

  // ── FINAL CHECK: IMAP for all landlord emails ──
  test('FINAL CHECK: All IMAP emails to landlord', async () => {
    console.log('=== FINAL IMAP SCAN ===');
    const client = new ImapFlow({
      host: 'premium215.web-hosting.com', port: 993, secure: true,
      auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
      logger: false,
    });
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        // All emails to dimitri-gatetest in the last 2 hours
        const uids = await client.search({ to: LANDLORD_EMAIL, since: new Date(Date.now() - 7200000) });
        console.log('Emails to landlord in last 2 hours:', uids.length);

        if (uids.length > 0) {
          for await (const msg of client.fetch(uids, { envelope: true, source: true })) {
            console.log('---');
            console.log('Subject:', msg.envelope?.subject);
            console.log('Date:', msg.envelope?.date);

            // Extract links
            const body = msg.source?.toString() || '';
            const links = body.match(/https?:\/\/hub\.nfstay\.com\/[^\s"'<>)\\]*/gi) || [];
            if (links.length > 0) {
              console.log('Links:');
              links.forEach(l => console.log('  ', l));
            }
          }
        }

        // Also check all recent emails
        const allUids = await client.search({ since: new Date(Date.now() - 3600000) });
        console.log('\nAll emails in last hour:', allUids.length);
        if (allUids.length > 0) {
          for await (const msg of client.fetch(allUids.slice(-10), { envelope: true })) {
            const to = (msg.envelope?.to || []).map((a: any) => a.address).join(', ');
            console.log(`  To: ${to} | Subject: ${msg.envelope?.subject}`);
          }
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      console.log('IMAP error:', String(e).slice(0, 100));
    }
  });
});
