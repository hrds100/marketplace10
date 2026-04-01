import { test, expect } from '@playwright/test';

// These tests verify the code changes are correct by checking file contents
// and build output. Live e2e tests will run after deployment.

test.describe('Issue 1: GHL iframe Back to Deals button', () => {
  test('InquiryPanel.tsx contains Back to Deals button outside iframe', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/components/InquiryPanel.tsx', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify Back to Deals button exists outside the iframe
    expect(content).toContain('Back to Deals');
    // Verify it's in a separate div with border-t (outside iframe area)
    expect(content).toContain('flex-shrink-0 border-t border-border p-3 bg-card');
    // Verify it navigates to /dashboard/deals
    expect(content).toContain("window.location.href = '/dashboard/deals'");
  });
});

test.describe('Issue 2: Admin toggles and lister type', () => {
  test('AdminSubmissions has First Landlord Inquiry and NDA Required toggles', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/pages/admin/AdminSubmissions.tsx', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify both toggle labels exist
    expect(content).toContain('1st Inquiry');
    expect(content).toContain('NDA');
    // Verify toggles update the correct DB fields
    expect(content).toContain('first_landlord_inquiry');
    expect(content).toContain('nda_required');
    // Verify source tags
    expect(content).toContain('Quick List');
    expect(content).toContain('Self-submitted');
    // Verify lister type labels
    expect(content).toContain('Landlord');
    expect(content).toContain('Agent');
    expect(content).toContain('Deal Sourcer');
  });

  test('AdminQuickList has radio buttons for lister type', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/pages/admin/AdminQuickList.tsx', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify radio buttons exist (not select/dropdown)
    expect(content).toContain('type="radio"');
    expect(content).toContain("'landlord', 'Landlord'");
    expect(content).toContain("'agent', 'Agent'");
    expect(content).toContain("'deal_sourcer', 'Deal Sourcer'");
    // Verify source is set
    expect(content).toContain("source: 'quick_list'");
  });

  test('ListADealPage has lister type radio buttons', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/pages/ListADealPage.tsx', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify radio buttons
    expect(content).toContain('I am a');
    expect(content).toContain('type="radio"');
    expect(content).toContain("'landlord', 'Landlord'");
    expect(content).toContain("'agent', 'Agent'");
    expect(content).toContain("'deal_sourcer', 'Deal Sourcer'");
    // Verify source and lister_type in insert
    expect(content).toContain("source: 'self_submitted'");
    expect(content).toContain('lister_type: form.listerType');
  });
});

test.describe('Issue 3: NDA controlled by DB flag', () => {
  test('process-inquiry uses DB flags instead of lister_type for NDA and cold', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../supabase/functions/process-inquiry/index.ts', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify DB flags are fetched from property row
    expect(content).toContain('nda_required, first_landlord_inquiry');
    expect(content).toContain('const ndaRequired =');
    expect(content).toContain('const firstLandlordInquiry =');
    // Verify nda_required is stamped on inquiry insert
    expect(content).toContain('nda_required: ndaRequired');
  });

  test('LeadsTab uses authorisation_type to enforce NDA vs NDA+Claim vs Direct', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/components/crm/LeadsTab.tsx', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify release mode drives lock behavior
    expect(content).toContain("lead.authorisation_type === 'nda'");
    expect(content).toContain("lead.authorisation_type === 'nda_and_claim'");
    // Verify fallback still supports legacy rows with only nda_required
    expect(content).toContain('!lead.authorisation_type && lead.nda_required');
    // Direct mode is implicitly bypassed because only nda / nda_and_claim create locks
    expect(content).toContain("lead.authorisation_type === 'nda_and_claim' && isUnclaimed");
  });

  test('Migration file adds correct columns and fixes RLS', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../supabase/migrations/20260330_nda_and_first_inquiry_toggles.sql', import.meta.url).pathname.replace(/%20/g, ' '),
      'utf-8'
    );
    // Verify new columns
    expect(content).toContain('nda_required BOOLEAN DEFAULT FALSE');
    expect(content).toContain('first_landlord_inquiry BOOLEAN DEFAULT FALSE');
    expect(content).toContain("source TEXT DEFAULT 'self_submitted'");
    // Verify broken RLS is dropped
    expect(content).toContain('DROP POLICY IF EXISTS "Anyone can read by token"');
    // Verify new lister-scoped policy
    expect(content).toContain('Listers can read their inquiries');
    // Verify admin policy
    expect(content).toContain('Admins can read all inquiries');
  });
});

test.describe('Build verification', () => {
  test('TypeScript compiles with zero errors', async () => {
    const { execSync } = await import('child_process');
    const cwd = new URL('..', import.meta.url).pathname.replace(/%20/g, ' ');
    // This will throw if there are TS errors
    const result = execSync('NO_COLOR=1 FORCE_COLOR=0 npx tsc --noEmit 2>&1', { cwd, encoding: 'utf-8', timeout: 120000 });
    // No TypeScript errors
    expect(result).not.toContain('error TS');
  });
});
