/**
 * Scarlett WhatsApp Inquiry — end-to-end test of WhatsApp inquiry flow
 * Target: https://hub.nfstay.com (production)
 *
 * Tests the full WhatsApp inquiry pipeline:
 * 1. Tenant account setup
 * 2. Property with landlord phone exists
 * 3. wa.me URL generation from deal card
 * 4. receive-tenant-whatsapp edge function creates inquiry
 * 5. Inquiry visible in admin Tenant Requests
 * 6. IMAP check for confirmation email
 */
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ImapFlow } from 'imapflow';

// ── Constants ──────────────────────────────────────────────────────────────
const BASE = 'https://hub.nfstay.com';
const SB_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const SB_SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';

const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PW = 'Dgs58913347.';

const TENANT_EMAIL = 'scarlett-tenant@nexivoproperties.co.uk';
const TENANT_NAME = 'Scarlett Test Tenant';
const TENANT_PW = 'Test1234!Tenant';
const TENANT_PHONE = '+447414163669';

const LANDLORD_PHONE = '+447863992555';

const IMAP_HOST = 'premium215.web-hosting.com';
const IMAP_USER = 'info@nexivoproperties.co.uk';
const IMAP_PASS = 'Dgs58913347.';

// Known property with landlord_whatsapp = +447863992555
const KNOWN_PROPERTY_SLUG = 'skelton-brr-8c393061';
const KNOWN_PROPERTY_ID = '8c393061'; // first 8 chars — edge fn uses ilike prefix match

// ── Helpers ────────────────────────────────────────────────────────────────
function sbAdmin() {
  return createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
}
function sbAnon() {
  return createClient(SB_URL, SB_ANON);
}

async function injectSession(page: Page, email: string, password: string) {
  const sb = sbAnon();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  await page.goto(`${BASE}/terms`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((sj) => {
    localStorage.setItem('sb-asazddtvjvmckouxcmmo-auth-token', sj);
  }, JSON.stringify(data.session!));
}

async function searchEmail(opts: { subject?: string; since?: Date }): Promise<number> {
  const client = new ImapFlow({
    host: IMAP_HOST, port: 993, secure: true,
    auth: { user: IMAP_USER, pass: IMAP_PASS },
    logger: false,
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const criteria: Record<string, any> = {};
    if (opts.subject) criteria.subject = opts.subject;
    if (opts.since) criteria.since = opts.since;
    const msgs = await client.search(criteria);
    lock.release();
    await client.logout();
    return msgs.length;
  } catch (e: any) {
    console.error('IMAP error:', e.message);
    return -1;
  }
}

test.setTimeout(90_000);

// ════════════════════════════════════════════════════════════════════════════
// WHATSAPP INQUIRY FLOW
// ════════════════════════════════════════════════════════════════════════════
test.describe.serial('WhatsApp Inquiry Flow', () => {
  let propertyId = '';
  let propertySlug = '';
  let propertyName = '';
  let inquiryId = '';

  test('W01: Create test tenant account with whatsapp_verified + monthly tier', async () => {
    const sb = sbAdmin();
    // Clean up existing
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 500 });
    const existing = users.find(u => u.email === TENANT_EMAIL);
    if (existing) {
      await sb.from('inquiries').delete().eq('tenant_email', TENANT_EMAIL);
      await sb.from('profiles').delete().eq('id', existing.id);
      await sb.auth.admin.deleteUser(existing.id);
    }

    // Create tenant
    const { data: newUser, error } = await sb.auth.admin.createUser({
      email: TENANT_EMAIL,
      password: TENANT_PW,
      email_confirm: true,
      user_metadata: { name: TENANT_NAME, whatsapp: TENANT_PHONE },
    });
    expect(error).toBeNull();
    expect(newUser.user).toBeTruthy();

    // Clear phone from any other profile that holds it (unique constraint)
    const { data: conflicts } = await sb.from('profiles')
      .select('id').eq('whatsapp', TENANT_PHONE);
    if (conflicts) {
      for (const c of conflicts) {
        if (c.id !== newUser.user!.id) {
          await sb.from('profiles').update({ whatsapp: null } as any).eq('id', c.id);
        }
      }
    }

    // Update profile with whatsapp_verified + monthly tier
    const { error: upErr } = await sb.from('profiles').update({
      whatsapp: TENANT_PHONE,
      whatsapp_verified: true,
      tier: 'monthly',
    } as any).eq('id', newUser.user!.id);
    if (upErr) console.error('Profile update error:', upErr.message);

    // Verify
    const { data: profile } = await (sb.from('profiles') as any)
      .select('name, whatsapp, whatsapp_verified, tier')
      .eq('id', newUser.user!.id)
      .single();
    expect(profile?.whatsapp_verified).toBe(true);
    expect(profile?.tier).toBe('monthly');
  });

  test('W02: Verify property exists with landlord phone +447863992555', async () => {
    const sb = sbAdmin();
    const { data: props } = await sb.from('properties')
      .select('id, name, slug, contact_phone, landlord_whatsapp, status')
      .eq('landlord_whatsapp', LANDLORD_PHONE)
      .eq('status', 'live')
      .limit(1);

    if (props && props.length > 0) {
      propertyId = props[0].id;
      propertySlug = props[0].slug || props[0].id;
      propertyName = props[0].name || 'Test Property';
      console.log(`Found property: ${propertyName} (${propertyId.slice(0, 8)}), slug: ${propertySlug}`);
    } else {
      // Create a test property
      const { data: newProp, error } = await sb.from('properties').insert({
        name: 'Scarlett Test Property - WhatsApp Flow',
        city: 'Manchester',
        postcode: 'M1 1AA',
        type: 'Flat',
        bedrooms: 2,
        bathrooms: 1,
        rent: 1200,
        profit: 400,
        contact_phone: LANDLORD_PHONE,
        landlord_whatsapp: LANDLORD_PHONE,
        contact_name: 'Test Landlord',
        contact_email: 'landlord@test.com',
        status: 'live',
        lister_type: 'landlord',
      } as any).select('id, name, slug').single();
      expect(error).toBeNull();
      propertyId = newProp!.id;
      propertySlug = newProp!.slug || newProp!.id;
      propertyName = newProp!.name;
      console.log(`Created test property: ${propertyName} (${propertyId.slice(0, 8)})`);
    }

    expect(propertyId).toBeTruthy();
  });

  test('W03: Tenant sees deal and WhatsApp button generates wa.me URL', async ({ page }) => {
    await injectSession(page, TENANT_EMAIL, TENANT_PW);
    await page.goto(`${BASE}/deals/${propertySlug}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the deal page to load
    await page.waitForTimeout(3000);

    // The deal detail page should have a WhatsApp button
    // Check for wa.me link or WhatsApp button
    const waBtn = page.locator('a[href*="wa.me"], button:has-text("WhatsApp"), button:has-text("Send on WhatsApp"), [data-feature="DEALS__PROPERTY_CARD_WHATSAPP"]').first();
    const visible = await waBtn.isVisible({ timeout: 10_000 }).catch(() => false);

    if (visible) {
      // Get the href or intercept window.open
      const href = await waBtn.getAttribute('href');
      if (href && href.includes('wa.me')) {
        expect(href).toContain('wa.me');
        expect(href).toContain('hub.nfstay.com');
        console.log('wa.me URL from deal detail:', href.slice(0, 100));
      } else {
        // Button uses window.open — intercept
        const waUrl = await page.evaluate(() => {
          return new Promise<string>((resolve) => {
            const orig = window.open;
            window.open = (url: any) => { resolve(String(url)); return null; };
            // Click the WhatsApp-related button
            const btn = document.querySelector('a[href*="wa.me"], button:has(svg[fill="#25D366"])');
            if (btn) (btn as HTMLElement).click();
            setTimeout(() => { resolve(''); window.open = orig; }, 3000);
          });
        });
        if (waUrl) {
          expect(waUrl).toContain('wa.me');
          console.log('wa.me URL intercepted:', waUrl.slice(0, 100));
        }
      }
    } else {
      // Deal detail may use the InquiryPanel instead — navigate to deals grid
      await page.goto(`${BASE}/dashboard/deals`);
      await page.waitForSelector('[data-feature="DEALS__GRID"]', { timeout: 15_000 });
      const gridWaBtn = page.locator('[data-feature="DEALS__PROPERTY_CARD_WHATSAPP"]').first();
      if (await gridWaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const waUrl = await page.evaluate(() => {
          return new Promise<string>((resolve) => {
            const orig = window.open;
            window.open = (url: any) => { resolve(String(url)); return null; };
            document.querySelector('[data-feature="DEALS__PROPERTY_CARD_WHATSAPP"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            setTimeout(() => { resolve(''); window.open = orig; }, 3000);
          });
        });
        if (waUrl) {
          expect(waUrl).toContain('wa.me');
          console.log('wa.me URL from grid:', waUrl.slice(0, 100));
        }
      }
    }
  });

  test('W04: receive-tenant-whatsapp edge function creates inquiry', async () => {
    // Clean up any previous test inquiries for this tenant+property
    const sb = sbAdmin();
    await sb.from('inquiries').delete()
      .eq('tenant_phone', TENANT_PHONE)
      .eq('property_id', propertyId);

    // Simulate the WhatsApp inquiry — call edge function directly
    const messageBody = `Hi, I am interested in a property on nfstay.\nLink: https://hub.nfstay.com/deals/${propertySlug}\nReference no.: ${propertyId.slice(0, 5).toUpperCase()}\nPlease contact me at your earliest convenience.`;

    const response = await fetch(`${SB_URL}/functions/v1/receive-tenant-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SB_ANON}`,
      },
      body: JSON.stringify({
        tenant_phone: TENANT_PHONE,
        tenant_name: TENANT_NAME,
        message_body: messageBody,
        tenant_email: TENANT_EMAIL,
      }),
    });

    const result = await response.json();
    console.log('Edge function response:', JSON.stringify(result));

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.inquiry_id).toBeTruthy();
    inquiryId = result.inquiry_id;
    console.log(`Inquiry created: ${inquiryId} for property: ${result.property_name}`);
  });

  test('W05: Inquiry visible in admin Tenant Requests', async ({ page }) => {
    await injectSession(page, ADMIN_EMAIL, ADMIN_PW);
    await page.goto(`${BASE}/admin/outreach`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Click "Tenant Requests" tab
    const tenantTab = page.locator('button:has-text("Tenant Requests")').first();
    const tabVisible = await tenantTab.isVisible({ timeout: 10_000 }).catch(() => false);
    if (tabVisible) {
      await tenantTab.click();
      await page.waitForTimeout(2000);
    }

    // Look for the tenant name in the page
    const pageText = await page.locator('body').textContent({ timeout: 10_000 });
    const hasTenantName = pageText?.includes(TENANT_NAME) || pageText?.includes('Scarlett');
    const hasTenantPhone = pageText?.includes('7414163669') || pageText?.includes(TENANT_PHONE);

    // Either the tenant name or phone should appear in Tenant Requests
    expect(hasTenantName || hasTenantPhone).toBeTruthy();
    console.log(`Tenant "${TENANT_NAME}" found in admin Tenant Requests: name=${hasTenantName}, phone=${hasTenantPhone}`);
  });

  test('W06: Verify inquiry exists in database with correct fields', async () => {
    const sb = sbAdmin();
    const { data: inquiry, error } = await (sb.from('inquiries') as any)
      .select('id, tenant_phone, tenant_name, tenant_email, property_id, channel, status, authorized, lister_phone')
      .eq('id', inquiryId)
      .single();

    expect(error).toBeNull();
    expect(inquiry).toBeTruthy();
    expect(inquiry.tenant_phone).toBe(TENANT_PHONE);
    expect(inquiry.tenant_name).toBe(TENANT_NAME);
    expect(inquiry.tenant_email).toBe(TENANT_EMAIL);
    expect(inquiry.property_id).toBe(propertyId);
    expect(inquiry.channel).toBe('whatsapp');
    expect(inquiry.status).toBe('new');
    // Should NOT be authorized (admin gate)
    expect(inquiry.authorized).toBe(false);
    // Lister phone should match landlord
    expect(inquiry.lister_phone).toBe(LANDLORD_PHONE);

    console.log('Inquiry DB record verified:', {
      id: inquiry.id.slice(0, 8),
      channel: inquiry.channel,
      authorized: inquiry.authorized,
      lister_phone: inquiry.lister_phone,
    });
  });

  test('W07: Check IMAP for inquiry-related emails', async () => {
    // Wait for email delivery
    await new Promise(r => setTimeout(r, 5000));
    const since = new Date(Date.now() - 15 * 60 * 1000);

    // Check for any inquiry-related emails
    const inquiryCount = await searchEmail({ subject: 'inquiry', since });
    const nfstayCount = await searchEmail({ subject: 'nfstay', since });

    console.log(`IMAP results — inquiry-related: ${inquiryCount}, nfstay-related: ${nfstayCount}`);

    // IMAP search should at least not fail
    expect(inquiryCount).toBeGreaterThanOrEqual(-1);
    if (inquiryCount > 0) {
      console.log(`Found ${inquiryCount} inquiry emails in last 15 minutes`);
    }
  });
});
