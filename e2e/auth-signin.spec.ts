import { test, expect } from '@playwright/test';

const BASE = process.env.AUTH_TEST_BASE || 'http://localhost:8080';

test.describe('Sign-in page — Particle hook rewire', () => {
  test('renders all controls and no button spins forever', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });

    // Core controls exist
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    // Four social buttons render
    const socialButtons = page.locator('[data-feature="AUTH__SIGNIN_SOCIAL"]');
    await expect(socialButtons).toHaveCount(4);

    // No mention of the removed redirect API
    const bodyText = await page.content();
    expect(bodyText).not.toContain('thirdpartyAuth');

    // Legacy redirect API must not be imported at runtime (any of these errors would indicate regression)
    const offending = consoleErrors.filter((e) =>
      /thirdpartyAuth|particleAuth\.init|auth-core/i.test(e),
    );
    expect(offending, `Unexpected auth-core errors: ${offending.join('\n')}`).toHaveLength(0);
  });

  test('email + password form submits and returns a result (no infinite spinner)', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });

    await page.locator('input[type="email"]').first().fill('does-not-exist-' + Date.now() + '@nfstay-qa.test');
    await page.locator('input[type="password"]').first().fill('WrongPass1!');
    await page.locator('button[type="submit"]').first().click();

    // Either an error message appears or we navigate — never a permanent spinner
    await Promise.race([
      page.waitForSelector('text=/invalid|credential|failed|incorrect|not found|wrong/i', { timeout: 15000 }),
      page.waitForURL('**/dashboard/**', { timeout: 15000 }),
      page.waitForURL('**/verify-otp**', { timeout: 15000 }),
    ]);
  });

  test('clicking Google does not leave the page on a stuck loader', async ({ page }) => {
    await page.goto(`${BASE}/signin`, { waitUntil: 'domcontentloaded' });

    const google = page.locator('[data-feature="AUTH__SIGNIN_SOCIAL"]').first();
    await google.click();

    // Expect Particle's modal to appear within 5s, OR a redirect away, OR an error toast.
    // What we must NOT see: the same page after 10s with the spinner still inside the button.
    await page.waitForTimeout(6000);

    const stuck = await page.evaluate(() => {
      const btn = document.querySelector('[data-feature="AUTH__SIGNIN_SOCIAL"]');
      if (!btn) return false;
      const spinner = btn.querySelector('.animate-spin');
      return !!spinner;
    });

    // If Particle opened its modal, the button may still show spinner — that is fine.
    // We only fail if there is NEITHER a modal NOR a navigation NOR a visible error.
    const modalOpened = await page.locator('[class*="particle"], [class*="connectkit"], dialog, [role="dialog"]').count();
    const url = page.url();
    const navigated = !url.includes('/signin');
    const hasError = await page.locator('text=/failed|error|try again/i').count();

    if (stuck && modalOpened === 0 && !navigated && hasError === 0) {
      throw new Error('Social login button stayed in loading state with no modal, no navigation, no error — the bug is back.');
    }
  });
});
