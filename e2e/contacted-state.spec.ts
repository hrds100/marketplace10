import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel: string) =>
  fs.readFileSync(path.resolve(thisDir, '..', rel), 'utf-8');

test.describe('Contacted State - Code Verification', () => {

  test('DealsPageV2 queries inquiries table for contacted property IDs', () => {
    const content = readSource('src/pages/DealsPageV2.tsx');

    // Queries inquiries filtered by tenant_id
    expect(content).toContain("from('inquiries')");
    expect(content).toContain("select('property_id')");
    expect(content).toContain("eq('tenant_id', user.id)");

    // Builds a Set of contacted property IDs
    expect(content).toContain('contactedSet');

    // Passes contacted prop to PropertyCard
    expect(content).toContain('contacted={contactedSet.has(l.id)}');
  });

  test('PropertyCard accepts contacted prop and renders badge', () => {
    const content = readSource('src/components/PropertyCard.tsx');

    // Prop accepted
    expect(content).toContain('contacted?: boolean');

    // Badge rendered conditionally
    expect(content).toContain('{contacted && (');
    expect(content).toContain('Contacted');
    expect(content).toContain('CheckCircle');
  });

  test('EmailInquiryModal calls onContactSuccess after successful send', () => {
    const content = readSource('src/components/EmailInquiryModal.tsx');

    // Callback prop exists
    expect(content).toContain('onContactSuccess?: (propertyId: string) => void');

    // Called after setSent(true)
    expect(content).toContain('onContactSuccess?.(listing!.id)');
  });

  test('Mobile claim CTA has safe-area padding and scrollable container', () => {
    const content = readSource('src/components/crm/LeadAccessAgreement.tsx');

    // Scrollable modal body
    expect(content).toContain('overflow-y-auto');

    // Safe area inset for mobile home indicator
    expect(content).toContain('safe-area-inset-bottom');
  });
});

test.describe('The Gates Rename - Code Verification', () => {

  test('Admin sidebar shows The Gates instead of Outreach', () => {
    const content = readSource('src/layouts/AdminLayout.tsx');

    // Route path unchanged
    expect(content).toContain("to: '/admin/marketplace/outreach'");

    // Label changed to The Gates
    expect(content).toContain("label: 'The Gates'");
  });

  test('AdminOutreachV2 page heading says The Gates', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    expect(content).toContain('>The Gates<');
  });

  test('AdminOutreach legacy page heading says The Gates', () => {
    const content = readSource('src/pages/admin/AdminOutreach.tsx');

    expect(content).toContain('>The Gates<');
  });
});
