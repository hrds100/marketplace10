import { test, expect } from '@playwright/test';
import { ImapFlow } from 'imapflow';

const RESEND_EMAIL = 'info@nexivoproperties.co.uk';
const IMAP_HOST = 'premium215.web-hosting.com';
const IMAP_PORT = 993;
const IMAP_USER = 'info@nexivoproperties.co.uk';
const IMAP_PASS = 'Dgs58913347.';

const SCREEN_DIR = '/tmp/resend-explore';
const WEBHOOK_ID = '8fd2944f-3a4a-46ca-aa51-89c16abcdc86';
const DOMAIN_ID = '75a81681-a84d-4b8f-acbe-304e3a612dc2';

async function fetchMagicLink(sentAfter: Date): Promise<string | null> {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });
  await client.connect();
  await client.mailboxOpen('INBOX');
  // Poll up to 90s
  for (let attempt = 0; attempt < 30; attempt++) {
    const uids = await client.search({ since: sentAfter, from: 'resend' });
    const allUids = uids?.length
      ? uids
      : await client.search({ since: sentAfter });
    if (allUids && allUids.length > 0) {
      // Iterate newest first
      for (const uid of allUids.slice().reverse()) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!msg) continue;
        const env = msg.envelope;
        const fromAddr = env?.from?.[0]?.address?.toLowerCase() || '';
        const subject = env?.subject || '';
        const body = msg.source?.toString('utf-8') || '';
        if (
          fromAddr.includes('resend') ||
          subject.toLowerCase().includes('resend') ||
          subject.toLowerCase().includes('sign in') ||
          body.toLowerCase().includes('resend.com')
        ) {
          // Find magic link
          const linkMatch =
            body.match(/https?:\/\/[^\s"<>]*resend\.com[^\s"<>]*/i) ||
            body.match(/https?:\/\/[^\s"<>]*verify[^\s"<>]*/i) ||
            body.match(/https?:\/\/[^\s"<>]*magic[^\s"<>]*/i);
          if (linkMatch) {
            console.log('FOUND email from:', fromAddr, 'subject:', subject);
            await client.logout();
            return linkMatch[0].replace(/&amp;/g, '&').replace(/=\r?\n/g, '');
          }
        }
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  await client.logout();
  return null;
}

test('explore Resend dashboard', async ({ page }) => {
  test.setTimeout(300000);

  // 1. Open login
  await page.goto('https://resend.com/login', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${SCREEN_DIR}/01-login.png`, fullPage: true });

  // 2. Enter email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.waitFor({ timeout: 15000 });
  await emailInput.fill(RESEND_EMAIL);
  await page.screenshot({ path: `${SCREEN_DIR}/02-email-filled.png`, fullPage: true });

  const sentAt = new Date(Date.now() - 60_000); // capture mail from 1 min ago

  // 3. Submit
  const submitBtn = page
    .locator(
      'button[type="submit"], button:has-text("Continue"), button:has-text("Sign in"), button:has-text("Login")'
    )
    .first();
  await submitBtn.click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SCREEN_DIR}/03-after-submit.png`, fullPage: true });

  // 4. Pull magic link via IMAP
  console.log('Polling IMAP for magic link...');
  const link = await fetchMagicLink(sentAt);
  if (!link) {
    console.log('NO MAGIC LINK FOUND — Resend probably does not recognize this email.');
    await page.screenshot({ path: `${SCREEN_DIR}/04-no-link.png`, fullPage: true });
    test.fail(true, 'Magic link did not arrive — info@nexivoproperties.co.uk likely not a Resend account');
    return;
  }

  console.log('Magic link URL:', link.substring(0, 120));

  // 5. Navigate to magic link
  await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREEN_DIR}/05-after-magic-link.png`, fullPage: true });

  // Check we are signed in (URL should not be /login anymore)
  const url = page.url();
  console.log('Post-magic-link URL:', url);
  if (url.includes('/login') || url.includes('/signup')) {
    console.log('LOGIN FAILED — magic link did not authenticate.');
    return;
  }

  // 6. Webhook deliveries
  await page.goto(`https://resend.com/webhooks/${WEBHOOK_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREEN_DIR}/06-webhook.png`, fullPage: true });

  // Click Deliveries / Attempts tab if present
  for (const label of ['Deliveries', 'Attempts', 'Activity', 'Logs', 'History']) {
    const tab = page.getByRole('tab', { name: label }).or(page.getByRole('link', { name: label })).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREEN_DIR}/07-webhook-${label.toLowerCase()}.png`, fullPage: true });
      break;
    }
  }

  // 7. Domain page
  await page.goto(`https://resend.com/domains/${DOMAIN_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREEN_DIR}/08-domain.png`, fullPage: true });

  for (const label of ['Inbound', 'Receiving', 'Receive', 'Mail', 'Routes']) {
    const tab = page.getByRole('tab', { name: label }).or(page.getByRole('link', { name: label })).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREEN_DIR}/09-domain-${label.toLowerCase()}.png`, fullPage: true });
      break;
    }
  }

  // 8. Emails page (check for inbound)
  await page.goto('https://resend.com/emails', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREEN_DIR}/10-emails.png`, fullPage: true });

  // Try inbound filter URLs
  for (const path of ['/emails?type=inbound', '/inbound', '/emails/inbound']) {
    await page.goto(`https://resend.com${path}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(3000);
    const cleanName = path.replace(/[\/?=&]/g, '_');
    await page.screenshot({ path: `${SCREEN_DIR}/11-inbound${cleanName}.png`, fullPage: true });
  }

  // 9. Settings
  await page.goto('https://resend.com/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${SCREEN_DIR}/12-settings.png`, fullPage: true });
});
