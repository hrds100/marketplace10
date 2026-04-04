/**
 * e2e test for hard-delete-user and hard-delete-property edge functions
 * Tests bulk mode empty array and wrong PIN rejection.
 * Does NOT delete real data.
 */
import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';
const ADMIN_EMAIL = 'admin@hub.nfstay.com';
const ADMIN_PASSWORD = 'Dgs58913347.';
const USER_FN = `${SUPABASE_URL}/functions/v1/hard-delete-user`;
const PROP_FN = `${SUPABASE_URL}/functions/v1/hard-delete-property`;

async function getAdminToken(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Admin auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

test.describe('hard-delete-user edge function', () => {
  test('bulk empty array returns ok with deleted: 0', async ({ request }) => {
    const token = await getAdminToken();
    const res = await request.post(USER_FN, {
      data: { userIds: [], pin: '5891' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(0);
  });

  test('wrong PIN returns 403', async ({ request }) => {
    const token = await getAdminToken();
    const res = await request.post(USER_FN, {
      data: { userId: '00000000-0000-0000-0000-000000000000', pin: '0000' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Incorrect PIN');
  });
});

test.describe('hard-delete-property edge function', () => {
  test('bulk empty array returns ok with deleted: 0', async ({ request }) => {
    const token = await getAdminToken();
    const res = await request.post(PROP_FN, {
      data: { propertyIds: [], pin: '5891' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(0);
  });

  test('wrong PIN returns 403', async ({ request }) => {
    const token = await getAdminToken();
    const res = await request.post(PROP_FN, {
      data: { propertyId: '00000000-0000-0000-0000-000000000000', pin: '0000' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Incorrect PIN');
  });
});
