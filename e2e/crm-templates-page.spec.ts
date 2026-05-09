// e2e: CRM Templates page — /crm/templates
// Verifies the page loads, all 4 tabs render, and template list appears.

import { test, expect } from '@playwright/test';

const EMAIL = 'crmtest-pw@nexivoproperties.co.uk';
const PASSWORD = 'CrmTest2026Pw!';

test.describe('CRM Templates page', () => {
  test('loads with 4 tabs and shows SMS templates by default', async ({ page }) => {
    test.setTimeout(90_000);

    // 1. Sign in via /crm/login
    await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    await page.waitForURL(/\/crm\/(inbox|dashboard)/, { timeout: 30_000 });

    // 2. Navigate to /crm/templates
    await page.goto('https://hub.nfstay.com/crm/templates', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 3. Verify page heading
    await expect(page.locator('h1', { hasText: 'Templates' })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'e2e/screenshots/crm-templates-01-loaded.png', fullPage: true });

    // 4. Verify all 4 tabs exist
    const smsTab = page.locator('button', { hasText: 'SMS' });
    const whatsappTab = page.locator('button', { hasText: 'WhatsApp' });
    const emailTab = page.locator('button', { hasText: 'Email' });
    const agreementsTab = page.locator('button', { hasText: 'Agreements' });

    await expect(smsTab.first()).toBeVisible();
    await expect(whatsappTab.first()).toBeVisible();
    await expect(emailTab.first()).toBeVisible();
    await expect(agreementsTab.first()).toBeVisible();

    // 5. SMS tab should be active by default — look for "New template" button
    await expect(page.locator('button', { hasText: 'New template' })).toBeVisible();

    // 6. Switch to WhatsApp tab
    await whatsappTab.first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=WhatsApp templates')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'e2e/screenshots/crm-templates-02-whatsapp.png', fullPage: true });

    // 7. Switch to Email tab
    await emailTab.first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Email templates')).toBeVisible({ timeout: 5_000 });

    // 8. Switch to Agreements tab
    await agreementsTab.first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=agreement templates')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'e2e/screenshots/crm-templates-03-agreements.png', fullPage: true });

    console.log('PASS: Templates page loads with all 4 tabs');
  });

  test('sidebar shows Templates nav item', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('https://hub.nfstay.com/crm/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.locator('button[type="submit"]', { hasText: /sign in/i }).click();
    await page.waitForURL(/\/crm\/(inbox|dashboard)/, { timeout: 30_000 });

    // Verify "Templates" appears in the sidebar
    const templatesLink = page.locator('a[href="/crm/templates"]');
    await expect(templatesLink).toBeVisible({ timeout: 10_000 });

    // Click it and verify navigation
    await templatesLink.click();
    await page.waitForURL('**/crm/templates', { timeout: 10_000 });
    await expect(page.locator('h1', { hasText: 'Templates' })).toBeVisible({ timeout: 10_000 });

    console.log('PASS: Sidebar nav item works');
  });
});
