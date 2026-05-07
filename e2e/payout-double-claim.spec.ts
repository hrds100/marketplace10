/**
 * TDD: Payout double-claim prevention
 *
 * This test proves that submit-payout-claim rejects a second claim
 * when the user already has a pending/processing claim.
 *
 * Uses Supabase service role to set up and tear down test data directly.
 */
import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxODQ2NCwiZXhwIjoyMDg4OTk0NDY0fQ.B7nmKCji4LEDU5JozanHl9PjNXzYuIpav6B8KR3BNV0';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYXpkZHR2anZtY2tvdXhjbW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg0NjQsImV4cCI6MjA4ODk5NDQ2NH0.15ushgp1bOe04pyOYmsZ7wavQ_JWTj4xEB6Ga-3FX_A';

// Chris Germano — the user from the screenshot
const TEST_USER_ID = '83d01b5c-9623-4e4e-a559-87162c4d9cbf';

async function supabaseQuery(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (!res.ok && res.status !== 204 && res.status !== 200) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }
  if (res.status === 204 || options.method === 'DELETE' || options.method === 'PATCH') return [];
  return res.json();
}

async function callEdgeFunction(name: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

test.describe('Payout double-claim prevention', () => {
  // Cancel all pending/processing claims for test user (don't delete — FK to audit log)
  async function cleanupTestClaims() {
    await supabaseQuery(
      `payout_claims?user_id=eq.${TEST_USER_ID}&status=in.(pending,processing)`,
      { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }
    );
  }

  test.beforeEach(async () => {
    await cleanupTestClaims();
  });

  test.afterEach(async () => {
    await cleanupTestClaims();
  });

  test('first claim succeeds', async () => {
    const { status, data } = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });

    expect(status).toBe(200);
    expect(data.claim_id).toBeTruthy();
    expect(data.amount).toBe(1.77);
  });

  test('second claim is REJECTED when first is still pending', async () => {
    // First claim
    const first = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });
    expect(first.status).toBe(200);
    expect(first.data.claim_id).toBeTruthy();

    // Second claim — MUST be rejected
    const second = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });

    // The fix should return 400 with an error message
    expect(second.status).toBe(400);
    expect(second.data.error).toContain('pending');
  });

  test('claim is allowed after previous claim was cancelled', async () => {
    // First claim
    const first = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });
    expect(first.status).toBe(200);

    // Admin cancels it
    await supabaseQuery(
      `payout_claims?id=eq.${first.data.claim_id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }
    );

    // New claim — should succeed
    const second = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });
    expect(second.status).toBe(200);
    expect(second.data.claim_id).toBeTruthy();
  });

  test('claim is allowed after previous claim failed', async () => {
    // First claim
    const first = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });
    expect(first.status).toBe(200);

    // Payment fails
    await supabaseQuery(
      `payout_claims?id=eq.${first.data.claim_id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'failed' }) }
    );

    // New claim — should succeed
    const second = await callEdgeFunction('submit-payout-claim', {
      user_id: TEST_USER_ID,
      user_type: 'investor',
      currency: 'GBP',
      amount: 1.77,
    });
    expect(second.status).toBe(200);
    expect(second.data.claim_id).toBeTruthy();
  });

  test('concurrent claims — only one should succeed', async () => {
    // Fire two claims simultaneously (race condition test)
    const [a, b] = await Promise.all([
      callEdgeFunction('submit-payout-claim', {
        user_id: TEST_USER_ID,
        user_type: 'investor',
        currency: 'GBP',
        amount: 1.77,
      }),
      callEdgeFunction('submit-payout-claim', {
        user_id: TEST_USER_ID,
        user_type: 'investor',
        currency: 'GBP',
        amount: 1.77,
      }),
    ]);

    const successes = [a, b].filter((r) => r.status === 200);
    const rejections = [a, b].filter((r) => r.status === 400);

    // Exactly one should succeed, one should be rejected
    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(1);
  });
});
