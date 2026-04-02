import { test, expect } from '@playwright/test';

test.describe('Outreach Reset Button - Code Verification', () => {
  test('AdminOutreachV2 has reset button with correct behavior', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      new URL('../src/pages/admin/AdminOutreachV2.tsx', import.meta.url).pathname.replace(/%20/g, ' '), 'utf-8'
    );

    // Reset function exists
    expect(content).toContain('const resetLandlord = async (group: LandlordGroup)');

    // Confirmation dialog before destructive action
    expect(content).toContain('window.confirm(');
    expect(content).toContain('This cannot be undone.');

    // Deletes inquiries
    expect(content).toContain(".delete()");
    expect(content).toContain("lister_phone.eq.");

    // Clears property ownership
    expect(content).toContain("submitted_by: null");

    // Reverts to unclaimed via RPC
    expect(content).toContain("claim_landlord_email");
    expect(content).toContain("@nfstay.internal");

    // Resets outreach_sent flag
    expect(content).toContain("outreach_sent: false");

    // Audit logged
    expect(content).toContain("reset_landlord_test_data");
    expect(content).toContain("logAdminAction");

    // Refreshes query after reset
    expect(content).toContain("queryClient.invalidateQueries");

    // Button in UI with Trash2 icon
    expect(content).toContain("resetLandlord(group)");
    expect(content).toContain("<Trash2");
    expect(content).toContain("Resetting...");
  });
});
