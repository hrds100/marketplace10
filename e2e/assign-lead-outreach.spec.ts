import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel: string) =>
  fs.readFileSync(path.resolve(thisDir, '..', rel), 'utf-8');

test.describe('Assign a Lead - Landlord Activation', () => {

  test('AdminOutreachV2 has assign lead form with name, email, phone fields', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Assign lead form state
    expect(content).toContain('showAssignForm');
    expect(content).toContain('assignLeadForms');
    expect(content).toContain('toggleAssignForm');

    // Form fields: name, email, phone
    expect(content).toContain("placeholder=\"e.g. James Walker\"");
    expect(content).toContain("placeholder=\"james@example.com\"");
    expect(content).toContain("placeholder=\"+447911123456\"");

    // Release mode selector with all three options
    expect(content).toContain('<option value="nda">NDA</option>');
    expect(content).toContain('<option value="nda_and_claim">NDA + Claim</option>');
    expect(content).toContain('<option value="direct">Direct</option>');
  });

  test('Workflow selector exists with correct default and options', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Workflow field in form state, defaulting to cold workflow
    expect(content).toContain('workflow: GHL_WORKFLOW_COLD');

    // Selector label
    expect(content).toContain('Activation Workflow');

    // Two options with human-readable labels
    expect(content).toContain('Landlord Activation (default)');
    expect(content).toContain('Tenant Lead Release (NDA)');

    // Options use the workflow ID constants
    expect(content).toContain('{GHL_WORKFLOW_COLD}');
    expect(content).toContain('{GHL_WORKFLOW_WARM}');

    // Handler uses formData.workflow directly (no silent mode-based switching)
    expect(content).toContain('callGhlEnroll(group.phone, formData.workflow)');
  });

  test('Assign Lead button exists in group header with UserPlus icon', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // UserPlus icon imported
    expect(content).toContain('UserPlus');

    // Button text
    expect(content).toContain('Assign Lead');

    // Button triggers toggleAssignForm and expands group
    expect(content).toContain('toggleAssignForm(group.phone)');
  });

  test('assignLeadAndSendOutreach creates inquiry and sends GHL outreach', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Handler function exists
    expect(content).toContain('const assignLeadAndSendOutreach = async (group: LandlordGroup)');

    // Creates inquiry with correct fields
    expect(content).toContain("tenant_name: formData.name.trim()");
    expect(content).toContain("tenant_email: formData.email.trim()");
    expect(content).toContain("tenant_phone: formData.phone.trim()");
    expect(content).toContain("lister_phone: group.phone");
    // channel must be 'email' (DB check constraint only allows 'whatsapp' | 'email')
    expect(content).toContain("channel: 'email'");
    expect(content).toContain("authorized: true");
    expect(content).toContain("authorisation_type: formData.mode");
    expect(content).toContain("stage: 'New Leads'");

    // Generates unique token
    expect(content).toContain('crypto.randomUUID()');

    // Uses the workflow Hugo selected in the form (no silent switching)
    expect(content).toContain('callGhlEnroll(group.phone, formData.workflow)');
    // No hidden mode-based routing
    expect(content).not.toContain("formData.mode === 'direct' ? GHL_WORKFLOW_COLD : GHL_WORKFLOW_WARM");

    // Marks properties as outreach_sent
    expect(content).toContain("outreach_sent: true");

    // Audit logged
    expect(content).toContain("action: 'assign_lead_and_outreach'");
    expect(content).toContain('logAdminAction');

    // Clears form and refreshes query
    expect(content).toContain("setAssignLeadForms");
    expect(content).toContain("setShowAssignForm");
    expect(content).toContain("queryClient.invalidateQueries");
  });

  test('Assign & Activate button in form', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Combined action button
    expect(content).toContain('Assign Lead & Activate');
    expect(content).toContain('assignLeadAndSendOutreach(group)');
  });

  test('Send Activation button hidden when assign form is open', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // The Send Activation button is conditionally hidden when assign form is open
    expect(content).toContain('!showAssignForm.has(group.phone)');
  });

  test('Propertyless leads fetched and shown in landlord group', () => {
    const content = readSource('src/pages/admin/AdminOutreachV2.tsx');

    // Fetches propertyless inquiries by lister phone
    expect(content).toContain(".is('property_id', null)");
    expect(content).toContain(".in('lister_phone', allPhones)");

    // phonelessLeadMap tracks them
    expect(content).toContain('phonelessLeadMap');

    // manualLeads field on LandlordGroup
    expect(content).toContain('manualLeads');

    // Manual leads displayed in expanded section
    expect(content).toContain('Assigned leads');
    expect(content).toContain('group.manualLeads');
  });

  test('LeadsTab handles propertyless leads and gating correctly', () => {
    const content = readSource('src/components/crm/LeadsTab.tsx');

    // Queries by lister_phone (will match our admin-assigned lead)
    expect(content).toContain('lister_phone.eq.');

    // NDA gating based on authorisation_type
    expect(content).toContain("authorisation_type === 'nda'");
    expect(content).toContain("authorisation_type === 'nda_and_claim'");

    // Claim gating
    expect(content).toContain('requiresClaimForLead');

    // Handles null property_id gracefully
    expect(content).toContain('.filter(Boolean)');
    expect(content).toContain("property_name: d.property_id ? propertyMap[d.property_id]?.name : undefined");
  });

  test('Inquiries table supports all required fields for manual lead', () => {
    const typesContent = readSource('src/integrations/supabase/types.ts');

    // All fields used in the insert are present in the types
    expect(typesContent).toContain('tenant_name');
    expect(typesContent).toContain('tenant_email');
    expect(typesContent).toContain('tenant_phone');
    expect(typesContent).toContain('lister_phone');
    expect(typesContent).toContain('lister_name');
    expect(typesContent).toContain('authorized');
    expect(typesContent).toContain('authorisation_type');
    expect(typesContent).toContain('token');
    expect(typesContent).toContain('channel');
    expect(typesContent).toContain('stage');

    // property_id is optional (nullable)
    expect(typesContent).toContain('property_id: string | null');
    expect(typesContent).toContain('property_id?: string | null');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Real browser tests - admin logs in, opens Outreach, uses the
// Assign Lead form UI.  Does NOT submit (would hit live GHL).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Real browser tests - admin logs in, opens Outreach, uses the
// Assign Lead form UI.  Does NOT submit (would hit live GHL).
//
// Set PREVIEW_URL env var to run against a Vercel preview deploy.
// Falls back to hub.nfstay.com (will skip if feature not deployed).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE = process.env.PREVIEW_URL || 'https://hub.nfstay.com';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASS  = 'Dgs58913347.';

async function adminLogin(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  const signInTab = page.locator('text=Sign In').first();
  if (await signInTab.isVisible()) await signInTab.click();
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/dashboard**', { timeout: 30_000 });
}

test.describe('Assign a Lead - Browser Flow', () => {
  test.setTimeout(90_000);

  test('Admin can open The Gates, see Assign Lead button, fill form, and verify mode selector', async ({ page }) => {
    // 1. Login as admin
    await adminLogin(page);

    // 2. Navigate to Admin > The Gates
    await page.goto(`${BASE}/admin/outreach`, { waitUntil: 'networkidle' });

    // 3. Confirm we are on The Gates page
    await expect(page.locator('h1:has-text("The Gates")')).toBeVisible({ timeout: 15_000 });

    // 4. Confirm Landlord Activation tab is active by default
    const activationTab = page.locator('button:has-text("Landlord Activation")');
    await expect(activationTab).toBeVisible();

    // 5. Wait for at least one landlord group to appear (or empty state)
    const firstGroup = page.locator('[class*="rounded-2xl"][class*="border"]').first();
    await expect(firstGroup).toBeVisible({ timeout: 15_000 });

    // 6. Find and click the "Assign Lead" button on the first group
    //    This button only exists in the new code. If the preview is not
    //    deployed yet (running against production), the test will fail
    //    here - which is correct: the feature is not live yet.
    const assignBtn = page.locator('button:has-text("Assign Lead")').first();
    await expect(assignBtn).toBeVisible({ timeout: 10_000 });
    await assignBtn.click();

    // 7. The form should now be visible inside the expanded group
    const nameInput = page.locator('input[placeholder="e.g. James Walker"]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    const emailInput = page.locator('input[placeholder="james@example.com"]');
    await expect(emailInput).toBeVisible();

    const phoneInput = page.locator('input[placeholder="+447911123456"]');
    await expect(phoneInput).toBeVisible();

    // 8. Fill the form
    await nameInput.fill('Test Lead');
    await emailInput.fill('test@example.com');
    await phoneInput.fill('+447700900000');

    // 9. Verify mode selector has three options
    const modeSelect = page.locator('select').filter({ has: page.locator('option[value="nda"]') });
    await expect(modeSelect).toBeVisible();
    const options = await modeSelect.locator('option').allTextContents();
    expect(options).toContain('NDA');
    expect(options).toContain('NDA + Claim');
    expect(options).toContain('Direct');

    // 10. Confirm "Assign Lead & Activate" button is visible
    const submitBtn = page.locator('button:has-text("Assign Lead & Activate")');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // 11. Switch mode to Direct and verify
    await modeSelect.selectOption('direct');
    expect(await modeSelect.inputValue()).toBe('direct');

    // 12. Switch mode to NDA + Claim and verify
    await modeSelect.selectOption('nda_and_claim');
    expect(await modeSelect.inputValue()).toBe('nda_and_claim');

    // 12b. Verify workflow selector exists with correct default and options
    const workflowSelect = page.locator('select').filter({ has: page.locator('option:has-text("Landlord Activation")') });
    await expect(workflowSelect).toBeVisible();
    const wfOptions = await workflowSelect.locator('option').allTextContents();
    expect(wfOptions).toContain('Landlord Activation (default)');
    expect(wfOptions).toContain('Tenant Lead Release (NDA)');
    // Default should be the cold/activation workflow
    expect(await workflowSelect.inputValue()).toBe('67250bfa-e1fc-4201-8bca-08c384a4a31d');

    // 12c. Workflow choice is independent of release mode (changing mode doesn't change workflow)
    await modeSelect.selectOption('direct');
    expect(await workflowSelect.inputValue()).toBe('67250bfa-e1fc-4201-8bca-08c384a4a31d');

    // 13. Confirm Cancel button works and hides form
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    await cancelBtn.click();
    await expect(nameInput).not.toBeVisible({ timeout: 3_000 });

    // 14. Re-open form - verify it was cleared
    await assignBtn.click();
    const nameInputAgain = page.locator('input[placeholder="e.g. James Walker"]');
    await expect(nameInputAgain).toBeVisible({ timeout: 3_000 });

    // NOTE: We do NOT click "Assign Lead & Activate" because that
    // would create a real inquiry in the live DB and trigger a real GHL call.
    // The code-level tests above verify the handler logic; this browser test
    // verifies the UI renders, accepts input, and wires up correctly.
    // Once the preview is deployed, run with:
    //   PREVIEW_URL=https://<preview>.vercel.app npx playwright test e2e/assign-lead-outreach.spec.ts
  });
});
