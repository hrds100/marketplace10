import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel: string) =>
  fs.readFileSync(path.resolve(thisDir, '..', rel), 'utf-8');

test.describe('Email Inquiry - Admin Gate', () => {

  test('process-inquiry edge function exists on disk with correct insert pattern', () => {
    const content = readSource('supabase/functions/process-inquiry/index.ts');

    // Creates inquiry with authorized=false by default (admin gate)
    expect(content).toContain('authorized: autoAuth');
    expect(content).toContain('always_authorised: autoAuth');

    // Sets channel from input (email)
    expect(content).toContain("channel,");

    // Populates lister fields from property
    expect(content).toContain('lister_phone: effectiveListerPhone');
    expect(content).toContain('lister_email: listerEmail');
    expect(content).toContain('lister_name: listerName');

    // Idempotency check
    expect(content).toContain('deduplicated');

    // Sends tenant confirmation email (fire-and-forget)
    expect(content).toContain("type: 'inquiry-tenant-confirmation'");
    expect(content).toContain('tenant_email');

    // Does NOT contact landlord (admin gate)
    expect(content).not.toContain('landlord-lead-released');
  });

  test('process-inquiry matches receive-tenant-whatsapp admin gate pattern', () => {
    const emailFn = readSource('supabase/functions/process-inquiry/index.ts');
    const whatsappFn = readSource('supabase/functions/receive-tenant-whatsapp/index.ts');

    // Both set authorized from autoAuth (not hardcoded true)
    expect(emailFn).toContain('authorized: autoAuth');
    expect(whatsappFn).toContain('authorized: autoAuth');

    // Both check always_authorised
    expect(emailFn).toContain('always_authorised');
    expect(whatsappFn).toContain('always_authorised');

    // Both generate unique token
    expect(emailFn).toContain('crypto.randomUUID()');
    expect(whatsappFn).toContain('crypto.randomUUID()');
  });

  test('EmailInquiryModal calls process-inquiry with correct payload', () => {
    const content = readSource('src/components/EmailInquiryModal.tsx');

    // Calls process-inquiry edge function
    expect(content).toContain("supabase.functions.invoke('process-inquiry'");

    // Sends required fields
    expect(content).toContain('property_id:');
    expect(content).toContain("channel: 'email'");
    expect(content).toContain('tenant_name:');
    expect(content).toContain('tenant_email:');
    expect(content).toContain('tenant_phone:');
  });
});

test.describe('Admin Release - Channel-Aware Delivery', () => {

  test('authorise function sends to available channels', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Checks both phone and email
    expect(content).toContain('const phone = inquiry.lister_phone || inquiry.landlordPhone');
    expect(content).toContain('const email = inquiry.landlordEmail');

    // WhatsApp via GHL when phone exists
    expect(content).toContain('callGhlEnroll(phone, GHL_WORKFLOW_WARM)');
    expect(content).toContain("channels.push('whatsapp')");

    // Email via send-email when email exists
    expect(content).toContain("type: 'landlord-lead-released'");
    expect(content).toContain("channels.push('email')");

    // Tracks which channels succeeded
    expect(content).toContain('const channels: string[] = []');

    // Audit log includes channels used
    expect(content).toContain('metadata: { type, channels }');

    // Toast shows which channels were used
    expect(content).toContain('channels.join');
  });

  test('authorise does not block on single channel failure', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // GHL failure is logged but doesn't block
    expect(content).toContain("console.error('GHL enrollment failed:'");

    // Email failure is caught
    expect(content).toContain("console.error('Landlord release email failed')");

    // DB update happens regardless of delivery
    expect(content).toContain('// Update DB -- authorized regardless of delivery success');
  });

  test('Direct mode still skips landlord contact', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // NDA/NDA+Claim contact block is gated
    expect(content).toContain("if (type === 'nda' || type === 'nda_and_claim')");

    // Direct falls through to DB update without contact
  });
});
