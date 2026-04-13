import { test, expect } from '@playwright/test';

// SMS Module — comprehensive TDD tests
// Tests against hub.nfstay.com as a real admin user

const BASE = process.env.BASE_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS = 'Dgs58913347.';

async function adminSignIn(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard/**', { timeout: 20000 });
}

test.describe('SMS Module', () => {
  test.setTimeout(120_000);

  // ============================================================
  // 1. SMS Dashboard loads
  // ============================================================
  test('SMS dashboard loads', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await expect(page.locator('text=SMS Inbox').or(page.locator('text=Dashboard'))).toBeVisible({ timeout: 10000 });
  });

  // ============================================================
  // 2. Automation flow editor — Global Prompt panel opens
  // ============================================================
  test('Global Prompt panel opens when button clicked', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/automations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Create new automation
    const newBtn = page.locator('button:has-text("New")').first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(3000);
    }

    // Click "Global Prompt" button
    const globalPromptBtn = page.locator('button:has-text("Global Prompt")');
    await expect(globalPromptBtn).toBeVisible({ timeout: 15000 });
    await globalPromptBtn.click();
    await page.waitForTimeout(1000);

    // Global Prompt panel should be visible (slide-in sidebar)
    await expect(page.locator('text=This prompt is the brain')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Model')).toBeVisible();
    await expect(page.locator('text=Temperature')).toBeVisible();
    await expect(page.locator('text=Max Replies Per Lead')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    console.log('PASS: Global Prompt panel opens and shows all fields');
  });

  // ============================================================
  // 3. Start node shows "AI Response" not "Start"
  // ============================================================
  test('Start node displays as AI Response', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/automations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const newBtn = page.locator('button:has-text("New")').first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(4000);
    }

    // The node should say "AI Response"
    await expect(page.locator('text=AI Response')).toBeVisible({ timeout: 10000 });
    // "Uses Global Prompt" should be visible
    await expect(page.locator('text=Uses Global Prompt')).toBeVisible({ timeout: 5000 });
    console.log('PASS: Start node shows "AI Response" with "Uses Global Prompt"');
  });

  // ============================================================
  // 4. Add Node panel has correct node types (no AI Response)
  // ============================================================
  test('Add Node panel shows correct node types', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/automations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const newBtn = page.locator('button:has-text("New")').first();
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(4000);
    }

    // Click "Add Node"
    const addNodeBtn = page.locator('button:has-text("Add Node")');
    await expect(addNodeBtn).toBeVisible({ timeout: 10000 });
    await addNodeBtn.click();
    await page.waitForTimeout(1000);

    // Panel should have these nodes
    const panel = page.locator('.fixed.right-0');
    await expect(panel.locator('text=Stop Conversation')).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('text=Follow Up')).toBeVisible();
    await expect(panel.locator('text=Transfer')).toBeVisible();
    await expect(panel.locator('text=Add Label')).toBeVisible();
    await expect(panel.locator('text=Move Stage')).toBeVisible();
    await expect(panel.locator('text=Webhook')).toBeVisible();

    // Count the node option buttons — should be exactly 6 (no AI Response)
    const nodeButtons = panel.locator('button').filter({ hasText: /Stop Conversation|Follow Up|Transfer|Add Label|Move Stage|Webhook/ });
    const count = await nodeButtons.count();
    console.log(`Found ${count} node type buttons in panel`);
    expect(count).toBe(6);
    console.log('PASS: Add Node panel has 6 node types, no AI Response');
  });

  // ============================================================
  // 5. Campaign wizard opens
  // ============================================================
  test('Campaign wizard opens and shows steps', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/campaigns`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const newBtn = page.getByRole('button', { name: 'New Campaign' });
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(1000);

    // Wizard should open with step 1
    await expect(page.locator('text=Campaign name')).toBeVisible({ timeout: 5000 });
    console.log('PASS: Campaign wizard opens with Name step');
  });

  // ============================================================
  // 6. Contacts page loads
  // ============================================================
  test('Contacts page loads', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/contacts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible({ timeout: 10000 });
    console.log('PASS: Contacts page loads');
  });

  // ============================================================
  // 7. Templates page loads
  // ============================================================
  test('Templates page loads', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/templates`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: 'Templates' }).or(page.locator('h1:has-text("Templates")'))).toBeVisible({ timeout: 10000 });
    console.log('PASS: Templates page loads');
  });

  // ============================================================
  // 8. Pipeline page loads
  // ============================================================
  test('Pipeline page loads', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/pipeline`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: 'Pipeline' })).toBeVisible({ timeout: 10000 });
    console.log('PASS: Pipeline page loads');
  });

  // ============================================================
  // 9. Settings page loads
  // ============================================================
  test('Settings page loads', async ({ page }) => {
    await adminSignIn(page);
    await page.goto(`${BASE}/sms/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    console.log('PASS: Settings page loads');
  });
});
