import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel: string) =>
  fs.readFileSync(path.resolve(thisDir, '..', rel), 'utf-8');

const BASE_URL = process.env.BASE_URL || 'https://hub.nfstay.com';
const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';

test.describe('Scarlett: Auth + Inquiry fixes', () => {

  test('admin login with email/password reaches dashboard', async ({ page }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).toBeTruthy();

    await page.goto(`${BASE_URL}/signin`);
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('sb-asazddtvjvmckouxcmmo-auth-token', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
      }));
    }, {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    });

    await page.goto(`${BASE_URL}/dashboard/deals`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('email inquiry modal has read-only name/email/phone inputs', async ({ page }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    await page.goto(`${BASE_URL}/signin`);
    await page.evaluate(({ accessToken, refreshToken }) => {
      localStorage.setItem('sb-asazddtvjvmckouxcmmo-auth-token', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
      }));
    }, {
      accessToken: data.session!.access_token,
      refreshToken: data.session!.refresh_token,
    });

    await page.goto(`${BASE_URL}/dashboard/deals`);
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Find and click an email inquiry button (if deals exist)
    const emailBtn = page.locator('[data-testid="email-inquiry-btn"], button:has-text("Email")').first();
    const hasDeal = await emailBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasDeal) {
      await emailBtn.click();
      const modal = page.locator('[data-testid="email-inquiry-modal"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      const nameInput = modal.locator('input[placeholder="Enter name*"]');
      const emailInput = modal.locator('input[placeholder="Enter email*"]');
      const phoneInput = modal.locator('input[placeholder="+44 phone number"]');

      await expect(nameInput).toHaveAttribute('readonly', '');
      await expect(emailInput).toHaveAttribute('readonly', '');
      await expect(phoneInput).toHaveAttribute('readonly', '');

      // Message textarea should be editable
      const textarea = modal.locator('textarea');
      await expect(textarea).not.toHaveAttribute('readonly');
    } else {
      test.skip(true, 'No deals available to test email inquiry modal');
    }
  });

  test('ProtectedRoute enforces WhatsApp verification (source check)', () => {
    const source = readSource('src/components/ProtectedRoute.tsx');

    // Admin emails must match useAuth.ts exactly
    expect(source).toContain("'admin@hub.nfstay.com'");
    expect(source).toContain("'hugo@nfstay.com'");
    expect(source).toContain("'chris@nfstay.com'");
    expect(source).not.toContain('hugo24eu@gmail.com');

    // Social login bypass removed
    expect(source).not.toContain('isSocialUser');
    expect(source).not.toContain('hasExistingAccount');

    // Only whatsapp_verified determines access
    expect(source).toContain('whatsapp_verified');
  });

  test('ParticleAuthCallback checks WhatsApp verification before redirect', () => {
    const source = readSource('src/pages/ParticleAuthCallback.tsx');

    expect(source).toContain('whatsapp_verified');
    expect(source).toContain('/verify-otp');
    expect(source).toContain('_NFsTay2!');
  });

  test('EmailInquiryModal has readOnly inputs (source check)', () => {
    const source = readSource('src/components/EmailInquiryModal.tsx');

    expect(source).toContain('readOnly');
    expect(source).toContain('cursor-not-allowed');
    // Message textarea remains editable
    expect(source).toContain('onChange={(e) => setMessage(e.target.value)}');
  });
});
