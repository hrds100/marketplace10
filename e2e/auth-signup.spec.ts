import { test, expect } from '@playwright/test';

const BASE = process.env.AUTH_TEST_BASE || 'http://localhost:8080';

test.describe('Sign-up page — Particle hook rewire', () => {
  test('renders social buttons + email alternative, no auth-core import at runtime', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });

    const social = page.locator('[data-feature="AUTH__SIGNUP_SOCIAL"]');
    await expect(social.first()).toBeVisible({ timeout: 10000 });
    await expect(social).toHaveCount(4);

    const html = await page.content();
    expect(html).not.toContain('thirdpartyAuth');

    const offending = errors.filter((e) => /thirdpartyAuth|particleAuth\.init|auth-core/i.test(e));
    expect(offending, `Unexpected auth-core errors: ${offending.join('\n')}`).toHaveLength(0);
  });

  test('social button click does not leave the page with an infinite spinner', async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });

    const google = page.locator('[data-feature="AUTH__SIGNUP_SOCIAL"]').first();
    await google.click();

    await page.waitForTimeout(6000);

    const modalOpened = await page.locator('[class*="particle"], [class*="connectkit"], dialog, [role="dialog"]').count();
    const url = page.url();
    const navigated = !url.includes('/signup');
    const hasError = await page.locator('text=/failed|error|try again/i').count();
    const stuck = await page.evaluate(() => {
      const btn = document.querySelector('[data-feature="AUTH__SIGNUP_SOCIAL"]');
      if (!btn) return false;
      return !!btn.querySelector('.animate-spin');
    });

    if (stuck && modalOpened === 0 && !navigated && hasError === 0) {
      throw new Error('Social signup button stayed in loading state with no modal, no navigation, no error.');
    }
  });

  test('switching to email view exposes the full form (name / email / password / phone)', async ({ page }) => {
    await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });

    const emailBtn = page.locator('text=/sign up with email/i').first();
    if (await emailBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailBtn.click();
    }

    await expect(page.locator('[data-feature="AUTH__SIGNUP_NAME"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-feature="AUTH__SIGNUP_EMAIL"]')).toBeVisible();
    await expect(page.locator('[data-feature="AUTH__SIGNUP_PASSWORD"]')).toBeVisible();
    await expect(page.locator('[data-feature="AUTH__SIGNUP_PHONE"]')).toBeVisible();
    await expect(page.locator('[data-feature="AUTH__SIGNUP_SUBMIT"]')).toBeVisible();
  });
});
