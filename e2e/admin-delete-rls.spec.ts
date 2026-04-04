/**
 * e2e test: admin DELETE RLS policies on inquiries, notifications, aff_profiles.
 * Verifies that admin bulk-delete and reset operations actually delete rows
 * now that the RLS policies are in place.
 */
import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';

/** Get a real admin JWT via email/password auth */
async function getAdminToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Admin auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

/** Insert a row using service role (bypasses RLS) */
async function serviceInsert(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  return res.json();
}

/** Delete a row using service role (cleanup) */
async function serviceDelete(table: string, col: string, val: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
}

/** Delete using the admin JWT (tests RLS) */
async function adminDelete(token: string, table: string, col: string, val: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
    method: 'DELETE',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
    },
  });
  return { status: res.status, data: await res.json() };
}

/** Select using the admin JWT */
async function adminSelect(token: string, table: string, col: string, val: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
    method: 'GET',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

test.describe('Admin DELETE RLS policies', () => {
  let adminToken: string;
  const testToken = `rls-test-${Date.now()}`;

  test.beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  test('admin can delete from inquiries table', async () => {
    // Insert a test inquiry via service role
    const [inserted] = await serviceInsert('inquiries', {
      tenant_name: 'RLS-Test-Tenant',
      tenant_email: 'rls-test@example.com',
      channel: 'email',
      token: testToken,
      message: 'RLS delete test',
    });

    expect(inserted.id).toBeTruthy();
    const id = inserted.id;

    // Delete via admin JWT — this is the actual RLS test
    const { status, data } = await adminDelete(adminToken, 'inquiries', 'id', id);
    expect(status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe(id);

    // Verify it's gone
    const remaining = await adminSelect(adminToken, 'inquiries', 'id', id);
    expect(remaining.length).toBe(0);
  });

  test('admin can delete from notifications table', async () => {
    // Insert a test notification via service role
    const [inserted] = await serviceInsert('notifications', {
      type: 'rls_test',
      title: 'RLS Delete Test',
      body: 'This should be deletable by admin',
    });

    expect(inserted.id).toBeTruthy();
    const id = inserted.id;

    // Delete via admin JWT
    const { status, data } = await adminDelete(adminToken, 'notifications', 'id', id);
    expect(status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe(id);

    // Verify it's gone
    const remaining = await adminSelect(adminToken, 'notifications', 'id', id);
    expect(remaining.length).toBe(0);
  });

  test('admin can delete from aff_profiles table', async () => {
    // Create a throwaway auth user for the FK constraint (user_id is UNIQUE)
    const testEmail = `rls-aff-test-${Date.now()}@example.com`;
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail, password: 'TestPass123!', email_confirm: true }),
    });
    const testUser = await createRes.json();
    expect(testUser.id).toBeTruthy();

    // Insert a test affiliate profile via service role
    const affCode = `rls-test-${Date.now()}`;
    const insertResult = await serviceInsert('aff_profiles', {
      user_id: testUser.id,
      full_name: 'RLS-Test-Affiliate',
      referral_code: affCode,
    });

    const inserted = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    expect(inserted.id).toBeTruthy();
    const id = inserted.id;

    // Delete via admin JWT — this is the actual RLS test
    const { status, data } = await adminDelete(adminToken, 'aff_profiles', 'id', id);
    expect(status).toBe(200);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe(id);

    // Verify it's gone
    const remaining = await adminSelect(adminToken, 'aff_profiles', 'id', id);
    expect(remaining.length).toBe(0);

    // Cleanup: delete the throwaway auth user
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUser.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
  });

  test.afterAll(async () => {
    // Cleanup any leftover test data
    await serviceDelete('inquiries', 'token', testToken);
    await serviceDelete('aff_profiles', 'full_name', 'RLS-Test-Affiliate');
    await serviceDelete('notifications', 'type', 'rls_test');
  });
});
