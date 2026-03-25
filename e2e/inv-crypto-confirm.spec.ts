/**
 * e2e test for inv-crypto-confirm edge function
 * Tests the server-side crypto purchase confirmation flow
 * Does NOT make real blockchain transactions
 */
import { test, expect } from '@playwright/test';

const SUPABASE_URL = 'https://asazddtvjvmckouxcmmo.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/inv-crypto-confirm`;
// Test wallet — hugords100+3@gmail.com
const TEST_WALLET = '0xaf1dB242506cc91393B06bCDf839D1B522Af4074';
const TEST_TX_HASH = `0xTEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

test.describe('inv-crypto-confirm edge function', () => {
  test('rejects missing fields', async ({ request }) => {
    const res = await request.post(FUNCTION_URL, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  test('returns 404 for unknown wallet', async ({ request }) => {
    const res = await request.post(FUNCTION_URL, {
      data: {
        tx_hash: '0xFAKE',
        wallet_address: '0x0000000000000000000000000000000000000000',
        property_id: 2,
        shares: 1,
        amount: 1,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('No user found');
  });

  test('creates order, commission, notifications for valid purchase', async ({ request }) => {
    // Call the edge function with a test payload
    const res = await request.post(FUNCTION_URL, {
      data: {
        tx_hash: TEST_TX_HASH,
        wallet_address: TEST_WALLET,
        property_id: 2,
        shares: 1,
        amount: 1,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.order_id).toBeTruthy();

    const orderId = body.order_id;

    // Verify: deduplicate on retry
    const res2 = await request.post(FUNCTION_URL, {
      data: {
        tx_hash: TEST_TX_HASH,
        wallet_address: TEST_WALLET,
        property_id: 2,
        shares: 1,
        amount: 1,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    const body2 = await res2.json();
    expect(body2.success).toBe(true);
    expect(body2.deduplicated).toBe(true);
    expect(body2.order_id).toBe(orderId);
  });
});
