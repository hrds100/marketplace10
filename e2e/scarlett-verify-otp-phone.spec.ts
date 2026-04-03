import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel: string) =>
  fs.readFileSync(path.resolve(thisDir, '..', rel), 'utf-8');

// Browser tests use BASE_URL env var — set to Vercel preview URL when running against a deploy
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Scarlett: verify-otp phone input — source checks', () => {

  test('VerifyOtp imports CountryCodeSelect, Phone icon, and has WhatsApp form', () => {
    const source = readSource('src/pages/VerifyOtp.tsx');

    expect(source).toContain("import CountryCodeSelect from '@/components/CountryCodeSelect'");
    expect(source).toContain('Phone');
    expect(source).toContain('handleSendFirstOtp');
    expect(source).toContain('Add your WhatsApp');
    expect(source).not.toContain('No phone number provided');
    // Password seed intact
    expect(source).toContain('_NFsTay2!');
  });

  test('WhatsApp form includes country code, phone input, and send button', () => {
    const source = readSource('src/pages/VerifyOtp.tsx');

    // Country code selector
    expect(source).toContain('<CountryCodeSelect');
    expect(source).toContain('countryCode');
    expect(source).toContain('setCountryCode');

    // Phone input
    expect(source).toContain('phoneInput');
    expect(source).toContain('setPhoneInput');
    expect(source).toContain('placeholder="7863 992 555"');

    // Send button disabled when empty
    expect(source).toContain('disabled={sendingOtp || !phoneInput.trim()}');
    expect(source).toContain('Send verification code');
  });

  test('handler sends OTP and updates URL with phone param', () => {
    const source = readSource('src/pages/VerifyOtp.tsx');

    // The handler constructs full phone and calls sendOtp
    expect(source).toContain('countryCode + phoneInput');
    expect(source).toContain('await sendOtp(fullPhone)');
    expect(source).toContain("newParams.set('phone', fullPhone)");
    expect(source).toContain('navigate(`/verify-otp?${newParams.toString()}`');
  });
});

test.describe('Scarlett: verify-otp phone input — browser tests', () => {

  test('shows WhatsApp form when phone param is empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify-otp?phone=&name=Test%20User&email=test@test.com`);
    await expect(page.locator('h2:has-text("Add your WhatsApp")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=No phone number provided')).not.toBeVisible();
  });

  test('country code selector and phone input are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify-otp?phone=&name=Test%20User&email=test@test.com`);
    await expect(page.locator('h2:has-text("Add your WhatsApp")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("+44")')).toBeVisible();
    await expect(page.locator('input[type="tel"][placeholder="7863 992 555"]')).toBeVisible();
  });

  test('send button disabled when empty, enabled after typing', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify-otp?phone=&name=Test%20User&email=test@test.com`);
    await expect(page.locator('h2:has-text("Add your WhatsApp")')).toBeVisible({ timeout: 10000 });

    const sendBtn = page.locator('button:has-text("Send verification code")');
    await expect(sendBtn).toBeDisabled();

    await page.locator('input[type="tel"][placeholder="7863 992 555"]').fill('7863992555');
    await expect(sendBtn).toBeEnabled();
  });

  test('shows signed-in-as text with name and email', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify-otp?phone=&name=Hugo%20Boss&email=hugo@test.com`);
    await expect(page.locator('h2:has-text("Add your WhatsApp")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Signed in as')).toBeVisible();
    await expect(page.locator('text=Hugo Boss')).toBeVisible();
  });

  test('normal OTP form shows when phone param exists', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify-otp?phone=%2B447863992555&name=Test&email=test@test.com`);
    await expect(page.locator('text=Verify your WhatsApp')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h2:has-text("Add your WhatsApp")')).not.toBeVisible();
  });
});
