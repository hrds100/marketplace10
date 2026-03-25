import { Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'test123456';

export async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/signin`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
}

export async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/signin`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
}

export { BASE_URL };
