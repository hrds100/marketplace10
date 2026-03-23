import { describe, it, expect } from 'vitest';
import { mergeBuyerEmailsIntoOrders } from './mergeOrderBuyerEmails';

describe('mergeBuyerEmailsIntoOrders', () => {
  it('maps profiles.id (auth uid) to user_email on each order', () => {
    const orders = [
      { id: 'a', user_id: 'u1', amount_paid: 5 },
      { id: 'b', user_id: 'u2', amount_paid: 10 },
    ];
    const profiles = [
      { id: 'u1', email: 'buyer@example.com', wallet_address: '0xabc123' },
      { id: 'u2', email: null, wallet_address: null },
    ];
    const merged = mergeBuyerEmailsIntoOrders(orders, profiles);
    expect(merged[0].user_email).toBe('buyer@example.com');
    expect(merged[0].investor_wallet).toBe('0xabc123');
    expect(merged[1].user_email).toBe('');
    expect(merged[1].investor_wallet).toBe('');
  });

  it('returns empty user_email when profile missing', () => {
    const merged = mergeBuyerEmailsIntoOrders(
      [{ id: 'x', user_id: 'ghost' }],
      [],
    );
    expect(merged[0].user_email).toBe('');
  });
});
