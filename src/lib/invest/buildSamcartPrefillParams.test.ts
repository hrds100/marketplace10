import { describe, it, expect } from 'vitest';
import { buildSamcartPrefillParams } from './buildSamcartPrefillParams';

describe('buildSamcartPrefillParams', () => {
  it('puts plain wallet in last_name and JSON (with propertyId) in phone_number', () => {
    const wallet = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const p = buildSamcartPrefillParams({
      firstName: 'Hugo',
      email: 'h@example.com',
      wallet,
      propertyId: 1,
      investAmount: 500,
    });
    expect(p.last_name).toBe(wallet);
    expect(p.last_name).toMatch(/^0x[a-fA-F0-9]{40}$/);
    const parsed = JSON.parse(p.phone_number) as {
      propertyId: number;
      recipient: string;
      agentWallet: string;
    };
    expect(parsed.propertyId).toBe(1);
    expect(parsed.recipient).toBe(wallet);
    expect(parsed.agentWallet).toBe('0x0000000000000000000000000000000000000000');
    expect(p.custom_0zdAJJKy).toBe(wallet);
    expect(p.amount).toBe('500');
    expect(p.email).toBe('h@example.com');
    expect(p.first_name).toBe('Hugo');
  });
});
