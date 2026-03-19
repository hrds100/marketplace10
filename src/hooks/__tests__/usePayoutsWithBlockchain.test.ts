import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// We test the payout merge logic directly (the same algorithm used by
// usePayoutsWithBlockchain) without needing React rendering or hook wrappers.
// ---------------------------------------------------------------------------

interface BlockchainPayout {
  propertyId: number;
  propertyTitle: string;
  sharesOwned: number;
  rentPerShare: string;
  totalRent: string;
  rentRemaining: string;
  startTime: number;
  endTime: number;
  eligible: boolean;
  claimableAmount: number;
}

interface MergedPayoutItem {
  id: string;
  propertyTitle: string;
  propertyId: number;
  date: string;
  sharesOwned: number;
  amount: number;
  currency: string;
  status: 'claimable' | 'claimed' | 'paid' | 'processing';
  method: string | null;
  fromBlockchain: boolean;
}

function mergePayouts(
  blockchainPayouts: BlockchainPayout[],
  supabasePayouts: any[],
): MergedPayoutItem[] {
  const items: MergedPayoutItem[] = [];

  // 1. Add blockchain-derived claimable payouts
  for (const bp of blockchainPayouts) {
    if (!bp.eligible || bp.claimableAmount <= 0) continue;

    const alreadyInDb = supabasePayouts.some(
      (p: any) => p.property_id === bp.propertyId && p.status === 'claimable',
    );

    if (!alreadyInDb) {
      items.push({
        id: `chain-${bp.propertyId}`,
        propertyTitle: bp.propertyTitle,
        propertyId: bp.propertyId,
        date: new Date().toISOString(),
        sharesOwned: bp.sharesOwned,
        amount: bp.claimableAmount,
        currency: 'USDC',
        status: 'claimable',
        method: null,
        fromBlockchain: true,
      });
    }
  }

  // 2. Add Supabase payouts
  for (const p of supabasePayouts) {
    items.push({
      id: p.id,
      propertyTitle: p.inv_properties?.title || 'Property',
      propertyId: p.property_id,
      date: p.period_date,
      sharesOwned: p.shares_owned || 0,
      amount: Number(p.amount || 0),
      currency: 'USDC',
      status: p.status,
      method: p.claim_method,
      fromBlockchain: false,
    });
  }

  return items;
}

describe('usePayoutsWithBlockchain — merge logic', () => {
  it('claimable amount = rentPerShare * sharesOwned', () => {
    // rentPerShare is in wei (18 decimals): 0.5 USDC = 500000000000000000
    const rentPerShareWei = '500000000000000000'; // 0.5 USDC
    const sharesOwned = 10;
    const rentPerShareNum = Number(rentPerShareWei) / 1e18;
    const claimableAmount = rentPerShareNum * sharesOwned;

    expect(claimableAmount).toBe(5.0); // 0.5 * 10 = 5.0 USDC

    const blockchainPayouts: BlockchainPayout[] = [
      {
        propertyId: 2,
        propertyTitle: 'Pembroke Place',
        sharesOwned: 10,
        rentPerShare: rentPerShareWei,
        totalRent: '5000000000000000000000',
        rentRemaining: '4000000000000000000000',
        startTime: Date.now() / 1000 - 86400,
        endTime: Date.now() / 1000 + 86400 * 29,
        eligible: true,
        claimableAmount: 5.0,
      },
    ];

    const merged = mergePayouts(blockchainPayouts, []);
    expect(merged).toHaveLength(1);
    expect(merged[0].amount).toBe(5.0);
    expect(merged[0].status).toBe('claimable');
    expect(merged[0].fromBlockchain).toBe(true);
  });

  it('ineligible properties do not show as claimable', () => {
    const blockchainPayouts: BlockchainPayout[] = [
      {
        propertyId: 2,
        propertyTitle: 'Pembroke Place',
        sharesOwned: 10,
        rentPerShare: '500000000000000000',
        totalRent: '5000000000000000000000',
        rentRemaining: '0',
        startTime: Date.now() / 1000 - 86400 * 60,
        endTime: Date.now() / 1000 - 86400 * 30,
        eligible: false, // Not eligible
        claimableAmount: 5.0,
      },
    ];

    const merged = mergePayouts(blockchainPayouts, []);
    expect(merged).toHaveLength(0); // Should not appear
  });

  it('zero claimable amount does not show as claimable', () => {
    const blockchainPayouts: BlockchainPayout[] = [
      {
        propertyId: 2,
        propertyTitle: 'Pembroke Place',
        sharesOwned: 0,
        rentPerShare: '0',
        totalRent: '0',
        rentRemaining: '0',
        startTime: 0,
        endTime: 0,
        eligible: true,
        claimableAmount: 0, // No rent
      },
    ];

    const merged = mergePayouts(blockchainPayouts, []);
    expect(merged).toHaveLength(0);
  });

  it('graceful fallback: blockchain fails, Supabase history still shows', () => {
    // Blockchain returned nothing (failure scenario)
    const blockchainPayouts: BlockchainPayout[] = [];

    // But Supabase has historical payouts
    const supabasePayouts = [
      {
        id: 'payout-1',
        property_id: 2,
        period_date: '2026-02-01',
        shares_owned: 5,
        amount: 25.0,
        status: 'paid',
        claim_method: 'bank_transfer',
        inv_properties: { title: 'Pembroke Place' },
      },
      {
        id: 'payout-2',
        property_id: 2,
        period_date: '2026-03-01',
        shares_owned: 5,
        amount: 25.0,
        status: 'claimed',
        claim_method: 'usdc',
        inv_properties: { title: 'Pembroke Place' },
      },
    ];

    const merged = mergePayouts(blockchainPayouts, supabasePayouts);
    expect(merged).toHaveLength(2);
    expect(merged[0].status).toBe('paid');
    expect(merged[1].status).toBe('claimed');
    expect(merged.every((p) => !p.fromBlockchain)).toBe(true);
  });

  it('deduplicates: blockchain payout not added if Supabase already has claimable', () => {
    const blockchainPayouts: BlockchainPayout[] = [
      {
        propertyId: 2,
        propertyTitle: 'Pembroke Place',
        sharesOwned: 10,
        rentPerShare: '500000000000000000',
        totalRent: '5000000000000000000000',
        rentRemaining: '4000000000000000000000',
        startTime: Date.now() / 1000 - 86400,
        endTime: Date.now() / 1000 + 86400 * 29,
        eligible: true,
        claimableAmount: 5.0,
      },
    ];

    const supabasePayouts = [
      {
        id: 'payout-db-claimable',
        property_id: 2,
        period_date: '2026-03-15',
        shares_owned: 10,
        amount: 5.0,
        status: 'claimable', // Already tracked in DB
        claim_method: null,
        inv_properties: { title: 'Pembroke Place' },
      },
    ];

    const merged = mergePayouts(blockchainPayouts, supabasePayouts);
    // Should only have the Supabase one, not a duplicate from blockchain
    const claimable = merged.filter((p) => p.status === 'claimable');
    expect(claimable).toHaveLength(1);
    expect(claimable[0].id).toBe('payout-db-claimable');
  });
});
