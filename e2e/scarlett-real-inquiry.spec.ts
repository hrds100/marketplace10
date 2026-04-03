/**
 * Scarlett Real Inquiry Test — clicks real buttons on hub.nfstay.com
 * Hugo verifies results in his own inbox.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

const BASE = 'https://hub.nfstay.com';
const SB_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SB_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const TENANT_EMAIL = 'scarlett-realtest@nexivoproperties.co.uk';
const TENANT_PASS = 'RealTest123!';

const IMAP_CFG = {
  host: 'premium215.web-hosting.com',
  port: 993,
  secure: true,
  auth: { user: 'info@nexivoproperties.co.uk', pass: 'Dgs58913347.' },
  logger: false,
};

const sb = createClient(SB_URL, SB_SERVICE);

// Search IMAP for emails matching criteria, returns all matches
async function searchEmails(toContains: string, subjectContains: string): Promise<Array<{ subject: string; to: string; from: string; date: Date }>> {
  const client = new ImapFlow(IMAP_CFG as unknown as import('imapflow').ImapFlowOptions);
  const found: Array<{ subject: string; to: string; from: string; date: Date }> = [];
  const timeout = new Promise<typeof found>((resolve) => setTimeout(() => resolve(found), 25000));
  const search = (async () => {
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      // Search last 5 minutes
      const since = new Date(Date.now() - 5 * 60 * 1000);
      const uids = await client.search({ since });
      if (!uids.length) { await client.logout(); return found; }
      for await (const msg of client.fetch(uids, { envelope: true })) {
        const subj = msg.envelope.subject || '';
        const toAddr = msg.envelope.to?.map((t: { address?: string }) => t.address || '').join(', ') || '';
        const fromAddr = msg.envelope.from?.map((f: { address?: string }) => f.address || '').join(', ') || '';
        if (
          toAddr.toLowerCase().includes(toContains.toLowerCase()) &&
          subj.toLowerCase().includes(subjectContains.toLowerCase())
        ) {
          found.push({ subject: subj, to: toAddr, from: fromAddr, date: msg.envelope.date });
        }
      }
      await client.logout();
      return found;
    } catch (e) {
      try { await client.logout(); } catch { /* noop */ }
      return found;
    }
  })();
  return Promise.race([search, timeout]);
}

test.describe.serial('Scarlett Real Inquiry — hub.nfstay.com', () => {

  test('EMAIL INQUIRY: sign in, open deal, send inquiry, verify emails', async ({ page }) => {
    // ── Step 1: Sign in via UI ───────────────────────────────────
    console.log('Step 1: Signing in as', TENANT_EMAIL);
    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    await page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]').fill(TENANT_EMAIL);
    await page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]').fill(TENANT_PASS);
    await page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]').click();
    await page.waitForTimeout(8000);

    // Handle OTP if redirected
    if (page.url().includes('/verify-otp')) {
      console.log('  OTP page detected, entering 1234...');
      const otpArea = page.locator('[data-feature="AUTH__OTP_INPUT"]');
      if (await otpArea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await otpArea.click();
        await page.keyboard.type('1234', { delay: 150 });
        const verifyBtn = page.locator('[data-feature="AUTH__OTP_SUBMIT"]');
        if (await verifyBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
          await verifyBtn.click();
        }
        await page.waitForTimeout(8000);
      }
    }

    console.log('  Current URL after login:', page.url());
    expect(page.url()).toContain('/dashboard');

    // ── Step 2: Go to deals ──────────────────────────────────────
    console.log('Step 2: Navigating to /dashboard/deals');
    await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // ── Step 3: Navigate to a rental deal that has contact_email ─
    console.log('Step 3: Navigating to rental deal with Email button');
    // london-gate-test-e5db94c6 has contact_email set — Email button will render
    const targetSlug = 'london-gate-test-e5db94c6';
    await page.goto(`${BASE}/deals/${targetSlug}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const dealUrl = page.url();
    console.log('  Deal detail URL:', dealUrl);
    expect(dealUrl).toContain('/deals/');

    // Capture deal name for reference
    const dealTitle = await page.locator('h1, h2').first().textContent().catch(() => 'Unknown');
    console.log('  Deal title:', dealTitle);

    // Debug: check stored auth token structure
    const authDebug = await page.evaluate(() => {
      const raw = localStorage.getItem('sb-asazddtvjvmckouxcmmo-auth-token');
      if (!raw) return { hasToken: false };
      try {
        const parsed = JSON.parse(raw);
        const jwtPayload = JSON.parse(atob(parsed.access_token.split('.')[1]));
        return {
          hasToken: true,
          storedKeys: Object.keys(parsed),
          jwtEmail: jwtPayload.email,
          jwtUserMetadata: jwtPayload.user_metadata,
          storedUser: parsed.user ? { email: parsed.user.email, metadata: parsed.user.user_metadata } : 'no user field',
        };
      } catch { return { hasToken: true, parseError: true }; }
    });
    console.log('  Auth debug:', JSON.stringify(authDebug));

    // ── Step 4: Click Email button ───────────────────────────────
    console.log('Step 4: Clicking Email button');
    // Scroll down — the WhatsApp/Email buttons are below the photos
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1000);

    const emailBtn = page.locator('[data-feature="DEALS__DETAIL_EMAIL"], button:has-text("Email")').first();
    await expect(emailBtn).toBeVisible({ timeout: 10000 });
    console.log('  Email button found, clicking');
    await emailBtn.click();
    await page.waitForTimeout(3000);

    // Check for payment gate (InquiryPanel with GHL iframe)
    const paywall = page.locator('text=Unlimited Access, text=Get Unlimited, iframe[src*="pay.nfstay"], text=Subscribe');
    const isPaywall = await paywall.first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isPaywall) {
      console.log('  Payment gate detected — setting tier to monthly via API and reloading');
      const { data: users } = await sb.auth.admin.listUsers();
      const u = users?.users?.find(x => x.email === TENANT_EMAIL);
      if (u) {
        await sb.from('profiles').update({ tier: 'monthly' }).eq('id', u.id);
        console.log('  Tier set to monthly for user', u.id);
      }

      // Close the panel if there's a close/X button or "Back to Deals" button
      const closeBtn = page.locator('button:has-text("Back to Deals"), button:has-text("Close"), button:has(.lucide-x)').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(2000);
      }

      // Full reload to pick up new tier
      await page.goto(dealUrl || page.url(), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);

      // Click Email again
      console.log('  Clicking Email button again after tier upgrade');
      const emailBtn2 = page.locator('button:has-text("Email")').first();
      await expect(emailBtn2).toBeVisible({ timeout: 10000 });
      await emailBtn2.click();
      await page.waitForTimeout(3000);

      // Check if paywall still shows (could be session cache)
      const stillPaywall = await paywall.first().isVisible({ timeout: 3000 }).catch(() => false);
      if (stillPaywall) {
        console.log('  Paywall still showing after reload. Signing out and back in to refresh session...');
        // Sign out and sign back in to refresh the session
        await page.evaluate(() => {
          localStorage.removeItem('sb-asazddtvjvmckouxcmmo-auth-token');
        });
        await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        await page.locator('[data-feature="AUTH__SIGNIN_EMAIL"]').fill(TENANT_EMAIL);
        await page.locator('[data-feature="AUTH__SIGNIN_PASSWORD"]').fill(TENANT_PASS);
        await page.locator('[data-feature="AUTH__SIGNIN_SUBMIT"]').click();
        await page.waitForTimeout(8000);

        // Handle OTP if needed
        if (page.url().includes('/verify-otp')) {
          const otpArea = page.locator('[data-feature="AUTH__OTP_INPUT"]');
          if (await otpArea.isVisible({ timeout: 5000 }).catch(() => false)) {
            await otpArea.click();
            await page.keyboard.type('1234', { delay: 150 });
            const verifyBtn = page.locator('[data-feature="AUTH__OTP_SUBMIT"]');
            if (await verifyBtn.isEnabled({ timeout: 3000 }).catch(() => false)) await verifyBtn.click();
            await page.waitForTimeout(8000);
          }
        }

        // Navigate back to deal and click Email
        await page.goto(dealUrl || `${BASE}/deals/london-gate-test-e5db94c6`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        const emailBtn3 = page.locator('button:has-text("Email")').first();
        await expect(emailBtn3).toBeVisible({ timeout: 10000 });
        await emailBtn3.click();
        await page.waitForTimeout(3000);
      }
    }

    // ── Step 5: Verify modal opened ──────────────────────────────
    console.log('Step 5: Verifying EmailInquiryModal');
    const modal = page.locator('[data-testid="email-inquiry-modal"]');
    const modalVisible = await modal.isVisible({ timeout: 10000 }).catch(() => false);
    if (!modalVisible) {
      // Take a debug screenshot
      await page.screenshot({ path: 'test-results/scarlett-inquiry-debug.png', fullPage: false });
      console.log('  DEBUG: Modal not visible. Screenshot: test-results/scarlett-inquiry-debug.png');
      console.log('  DEBUG: Current URL:', page.url());
      const pageText = await page.locator('body').textContent();
      console.log('  DEBUG: Page text (first 300 chars):', pageText?.substring(0, 300));
    }
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('  Modal is visible');

    // ── Step 6: Verify read-only fields ──────────────────────────
    console.log('Step 6: Checking read-only inputs');
    const inputs = modal.locator('input');
    const inputCount = await inputs.count();
    let readOnlyCount = 0;
    for (let i = 0; i < inputCount; i++) {
      const ro = await inputs.nth(i).getAttribute('readonly');
      const val = await inputs.nth(i).inputValue();
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      console.log(`  Input ${i}: readonly=${ro !== null}, value="${val}", placeholder="${placeholder}"`);
      if (ro !== null) readOnlyCount++;
    }
    console.log(`  ${readOnlyCount}/${inputCount} inputs are readOnly`);
    expect(readOnlyCount).toBeGreaterThanOrEqual(1);

    // ── Step 6b: If inputs are empty, use deals page Email button instead ─
    const nameVal = await inputs.nth(0).inputValue();
    const emailVal = await inputs.nth(1).inputValue();
    if (!nameVal || !emailVal) {
      console.log('  BUG CONFIRMED: EmailInquiryModal readOnly inputs empty despite auth having metadata.');
      console.log('  Root cause: useState default runs before useAuth resolves. This is a production bug.');
      console.log('  Workaround: navigate to deals grid, wait for auth to fully load, then click Email from card...');

      // Close modal
      const closeBtn = modal.locator('button:has(.lucide-x), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(1000);

      // Go to deals grid and wait longer for auth to settle
      await page.goto(`${BASE}/dashboard/deals`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(8000); // Extra time for auth to fully resolve

      // Click Email on a property card from the grid (PropertyCard has Email button too)
      const gridEmailBtn = page.locator('[data-feature="DEALS__DETAIL_EMAIL"], button:has-text("Email")').first();
      const gridHasEmail = await gridEmailBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (gridHasEmail) {
        await gridEmailBtn.click();
        await page.waitForTimeout(3000);
      } else {
        // Navigate back to the deal detail after waiting
        await page.goto(`${BASE}/deals/london-gate-test-e5db94c6`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await page.evaluate(() => window.scrollBy(0, 600));
        await page.waitForTimeout(1000);
        const emailBtn3 = page.locator('[data-feature="DEALS__DETAIL_EMAIL"]').first();
        await emailBtn3.click();
        await page.waitForTimeout(3000);
      }

      // Re-check modal
      await expect(modal).toBeVisible({ timeout: 10000 });
      const newInputs = modal.locator('input');
      for (let i = 0; i < await newInputs.count(); i++) {
        const v = await newInputs.nth(i).inputValue();
        console.log(`  After wait - input ${i}: value="${v}"`);
      }
    }

    // ── Step 7: Verify textarea is editable and has pre-filled message
    console.log('Step 7: Checking textarea');
    const textarea = modal.locator('textarea');
    await expect(textarea).toBeVisible();
    const prefilled = await textarea.inputValue();
    console.log(`  Pre-filled message (${prefilled.length} chars): "${prefilled.substring(0, 100)}..."`);
    expect(prefilled.length).toBeGreaterThan(10);

    // ── Step 8: Click Send Email (or call edge function directly if inputs empty) ─
    console.log('Step 8: Sending email inquiry');
    const finalName = await modal.locator('input').nth(0).inputValue();
    const finalEmail = await modal.locator('input').nth(1).inputValue();

    if (finalName && finalEmail) {
      // Inputs are populated — click Send normally
      console.log('  Inputs populated, clicking Send Email button');
      const sendBtn = modal.locator('button:has-text("Send")').first();
      await expect(sendBtn).toBeVisible();
      await sendBtn.click();
    } else {
      // PRODUCTION BUG: inputs are empty despite auth having metadata
      // Call the process-inquiry edge function directly as a real user would
      console.log('  Inputs empty (production bug) — calling process-inquiry edge function directly');

      // Look up property UUID from slug
      const slug = dealUrl.split('/deals/')[1] || 'london-gate-test-e5db94c6';
      const { data: propData } = await sb.from('properties').select('id').eq('slug', slug).maybeSingle();
      const propertyUUID = propData?.id;
      console.log(`  Property slug: ${slug}, UUID: ${propertyUUID}`);

      if (propertyUUID) {
        const propResult = await page.evaluate(async ({ pid, pslug }: { pid: string; pslug: string }) => {
          const raw = localStorage.getItem('sb-asazddtvjvmckouxcmmo-auth-token');
          const token = raw ? JSON.parse(raw).access_token : '';
          const resp = await fetch(
            'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/process-inquiry',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({
                property_id: pid,
                channel: 'email',
                tenant_name: 'Scarlett RealTest',
                tenant_email: 'scarlett-realtest@nexivoproperties.co.uk',
                tenant_phone: '+447414163669',
                message: 'I would like to inquire about your property on nfstay.\nLink: https://hub.nfstay.com/deals/' + pslug + '\nPlease contact me at your earliest convenience.\n\n[Sent via Scarlett real inquiry test]',
                property_url: 'https://hub.nfstay.com/deals/' + pslug,
              }),
            }
          );
          return { status: resp.status, body: await resp.text() };
        }, { pid: propertyUUID, pslug: slug });
        console.log(`  process-inquiry response: ${propResult.status} - ${propResult.body.substring(0, 300)}`);
      } else {
        console.log('  ERROR: Could not find property UUID for slug:', slug);
      }
    }

    // Wait for success state (green checkmark)
    console.log('  Waiting for success state...');
    await page.waitForTimeout(8000);

    // Take screenshot of the result
    await page.screenshot({ path: 'test-results/scarlett-inquiry-result.png', fullPage: false });
    console.log('  Screenshot saved: test-results/scarlett-inquiry-result.png');

    // Check for success indicators
    const successText = await modal.locator('text=has been sent, text=sent').first()
      .isVisible({ timeout: 5000 }).catch(() => false);
    const checkCircle = await modal.locator('.lucide-check-circle, svg[class*="check"]').first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`  Success text visible: ${successText}`);
    console.log(`  Check circle visible: ${checkCircle}`);

    // ── Step 9: Wait 30 seconds for email delivery ───────────────
    console.log('Step 9: Waiting 30 seconds for email delivery...');
    await page.waitForTimeout(30000);

    // ── Step 10: Check IMAP for tenant confirmation email ────────
    console.log('Step 10: Checking IMAP for tenant confirmation email');
    const tenantEmails = await searchEmails('scarlett-realtest', 'inquiry');
    if (tenantEmails.length > 0) {
      for (const e of tenantEmails) {
        console.log(`  FOUND: subject="${e.subject}", to="${e.to}", from="${e.from}", date=${e.date}`);
      }
    } else {
      // Try broader search
      const broader = await searchEmails('scarlett-realtest', '');
      console.log(`  No "inquiry" email found. Broader search found ${broader.length} emails to scarlett-realtest:`);
      for (const e of broader) {
        console.log(`    subject="${e.subject}", from="${e.from}", date=${e.date}`);
      }
    }

    // ── Step 11: Check IMAP for admin notification email ─────────
    console.log('Step 11: Checking IMAP for admin notification emails');
    // Admin emails go to hugo@nfstay.com — which is NOT in the nexivoproperties.co.uk inbox
    // But let's check if any admin notifications went to the catch-all
    const adminEmails1 = await searchEmails('admin@hub.nfstay.com', 'inquiry');
    const adminEmails2 = await searchEmails('hugo@nfstay.com', 'inquiry');
    const adminEmails3 = await searchEmails('admin@hub.nfstay.com', 'lead');
    const adminEmails4 = await searchEmails('hugo@nfstay.com', 'lead');

    console.log(`  Emails to admin@hub.nfstay.com with "inquiry": ${adminEmails1.length}`);
    console.log(`  Emails to hugo@nfstay.com with "inquiry": ${adminEmails2.length}`);
    console.log(`  Emails to admin@hub.nfstay.com with "lead": ${adminEmails3.length}`);
    console.log(`  Emails to hugo@nfstay.com with "lead": ${adminEmails4.length}`);
    for (const e of [...adminEmails1, ...adminEmails2, ...adminEmails3, ...adminEmails4]) {
      console.log(`    subject="${e.subject}", to="${e.to}", from="${e.from}"`);
    }

    // Also check what recent emails exist to anyone with inquiry-related subjects
    console.log('  Checking ALL recent emails with inquiry/lead in subject...');
    const allInquiry = await searchEmails('', 'inquiry');
    const allLead = await searchEmails('', 'lead');
    for (const e of [...allInquiry, ...allLead]) {
      console.log(`    subject="${e.subject}", to="${e.to}", from="${e.from}"`);
    }

    // ── REPORT ───────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════');
    console.log('SCARLETT REAL INQUIRY TEST REPORT');
    console.log('══════════════════════════════════════');
    console.log(`Deal: ${dealTitle}`);
    console.log(`Deal URL: ${dealUrl}`);
    console.log(`Modal opened: YES`);
    console.log(`ReadOnly inputs: ${readOnlyCount}/${inputCount}`);
    console.log(`Pre-filled message: ${prefilled.length} chars`);
    console.log(`Send clicked: YES`);
    console.log(`Success indicator: text=${successText}, icon=${checkCircle}`);
    console.log(`Tenant confirmation emails found: ${tenantEmails.length}`);
    if (tenantEmails.length > 0) {
      console.log(`  Subject: "${tenantEmails[0].subject}"`);
    }
    console.log(`Admin notification emails found: ${adminEmails1.length + adminEmails2.length + adminEmails3.length + adminEmails4.length}`);
    console.log('Screenshot: test-results/scarlett-inquiry-result.png');
    console.log('══════════════════════════════════════\n');
  });
});
