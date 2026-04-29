// Caller — skeleton smoke spec.
//
// Asserts the public surfaces of /caller/* are reachable post-deploy:
//   1. /caller/login renders the login form
//   2. /caller/dialer (unauthenticated) redirects to /caller/login
//
// Live phone tests + admin flows live in follow-up specs once Hugo has
// run a real call through /caller and signed off the cutover.

import { test, expect } from '@playwright/test';

test.describe('Caller — public surface', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/caller/login');
    await expect(page.getByText('Caller agent sign-in', { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder(/agent@/)).toBeVisible();
    // Sign-in submit button
    await expect(page.getByRole('button', { name: /Sign in/ })).toBeVisible();
  });

  test('dialer redirects to login when not authed', async ({ page }) => {
    await page.goto('/caller/dialer');
    // CallerGuard redirects unauthed users to /caller/login.
    await expect(page).toHaveURL(/\/caller\/login/, { timeout: 10_000 });
  });

  test('inbox redirects to login when not authed', async ({ page }) => {
    await page.goto('/caller/inbox');
    await expect(page).toHaveURL(/\/caller\/login/, { timeout: 10_000 });
  });
});
