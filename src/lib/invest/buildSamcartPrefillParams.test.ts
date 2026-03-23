import { describe, it, expect } from 'vitest';
import { buildSamcartPrefillParams } from './buildSamcartPrefillParams';

describe('buildSamcartPrefillParams', () => {
  it('uses human last_name, wallet only in phone JSON + custom field; no agentWallet key', () => {
    const wallet = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const p = buildSamcartPrefillParams({
      firstName: 'Hugo',
      lastName: 'de Souza',
      email: 'h@example.com',
      wallet,
      propertyId: 1,
      investAmount: 500,
    });
    expect(p.first_name).toBe('Hugo');
    expect(p.last_name).toBe('de Souza');
    expect(p.last_name).not.toMatch(/^0x/);

    const parsed = JSON.parse(p.phone_number) as {
      propertyId: number;
      recipient: string;
      investAmountUsd?: number;
      agentWallet?: string;
    };
    expect(parsed.propertyId).toBe(1);
    expect(parsed.recipient).toBe(wallet);
    expect(parsed.investAmountUsd).toBe(500);
    expect(parsed.agentWallet).toBeUndefined();

    expect(p.custom_0zdAJJKy).toBe(wallet);
    expect(p.amount).toBeUndefined();
    expect(p.email).toBe('h@example.com');
  });
});
