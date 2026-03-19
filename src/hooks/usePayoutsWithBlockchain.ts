import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useMyPayouts, useInvestProperties } from '@/hooks/useInvestData';
import { usePortfolioWithBlockchain } from '@/hooks/usePortfolioWithBlockchain';

export interface BlockchainPayout {
  propertyId: number;
  propertyTitle: string;
  propertyImage: string;
  sharesOwned: number;
  rentPerShare: string;
  totalRent: string;
  rentRemaining: string;
  startTime: number;
  endTime: number;
  eligible: boolean;
  claimableAmount: number;
}

export interface MergedPayoutItem {
  id: string;
  propertyTitle: string;
  propertyId: number;
  date: string;
  sharesOwned: number;
  amount: number;
  currency: string;
  status: 'claimable' | 'claimed' | 'paid' | 'processing';
  method: string | null;
  txHash?: string;
  /** True when this payout was derived from on-chain rent data */
  fromBlockchain: boolean;
}

/**
 * Merges on-chain rent pool data with Supabase payout history.
 *
 * For each property the user holds shares in, queries the Rent contract
 * for rent details and eligibility, then calculates the claimable amount.
 * Historical (already claimed) payouts come from Supabase.
 */
export function usePayoutsWithBlockchain() {
  const { address, connected } = useWallet();
  const { getRentDetails, isEligibleForRent } = useBlockchain();
  const { data: supabasePayouts = [], isLoading: payoutsLoading } = useMyPayouts();
  const { data: allProperties = [] } = useInvestProperties();
  const { portfolio } = usePortfolioWithBlockchain();

  const [blockchainPayouts, setBlockchainPayouts] = useState<BlockchainPayout[]>([]);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Fetch rent details for every property the user owns shares in
  const fetchRentData = useCallback(async () => {
    if (!connected || !address || portfolio.holdings.length === 0) return;

    setBlockchainLoading(true);
    setBlockchainError(null);

    try {
      const payouts: BlockchainPayout[] = [];

      await Promise.all(
        portfolio.holdings.map(async (holding) => {
          // Find the property record to get blockchain_property_id
          const prop = (allProperties as any[]).find((p: any) => p.id === holding.propertyId);
          const blockchainPropertyId = prop?.blockchain_property_id;
          if (blockchainPropertyId == null) return;

          try {
            const [rentDetails, eligible] = await Promise.all([
              getRentDetails(blockchainPropertyId),
              isEligibleForRent(blockchainPropertyId),
            ]);

            if (!rentDetails) return;

            // Calculate claimable amount: rentPerShare * sharesOwned
            // Values are in wei (18 decimals for USDC on BNB Chain)
            let claimableAmount = 0;
            try {
              const rentPerShareNum = Number(rentDetails.rentPerShare) / 1e18;
              claimableAmount = rentPerShareNum * holding.sharesOwned;
            } catch {
              claimableAmount = 0;
            }

            if (claimableAmount > 0 || eligible) {
              payouts.push({
                propertyId: holding.propertyId,
                propertyTitle: holding.propertyTitle,
                propertyImage: holding.image,
                sharesOwned: holding.sharesOwned,
                rentPerShare: rentDetails.rentPerShare,
                totalRent: rentDetails.totalRent,
                rentRemaining: rentDetails.rentRemaining,
                startTime: rentDetails.startTime,
                endTime: rentDetails.endTime,
                eligible,
                claimableAmount,
              });
            }
          } catch {
            // Individual property failure — skip silently
          }
        }),
      );

      setBlockchainPayouts(payouts);
    } catch (err) {
      setBlockchainError(
        err instanceof Error ? err.message : 'Failed to load blockchain rent data',
      );
    } finally {
      setBlockchainLoading(false);
    }
  }, [connected, address, portfolio.holdings, allProperties, getRentDetails, isEligibleForRent]);

  useEffect(() => {
    fetchRentData();
  }, [fetchRentData]);

  // Merge: Supabase history + blockchain claimable
  const mergedPayouts: MergedPayoutItem[] = (() => {
    const items: MergedPayoutItem[] = [];

    // 1. Add blockchain-derived claimable payouts
    for (const bp of blockchainPayouts) {
      if (!bp.eligible || bp.claimableAmount <= 0) continue;

      // Check if this payout already exists in Supabase as claimable
      const alreadyInDb = (supabasePayouts as any[]).some(
        (p: any) =>
          p.property_id === bp.propertyId && p.status === 'claimable',
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

    // 2. Add Supabase payouts (history + any DB-tracked claimable)
    for (const p of supabasePayouts as any[]) {
      items.push({
        id: p.id,
        propertyTitle: p.inv_properties?.title || 'Property',
        propertyId: p.property_id,
        date: p.period_date,
        sharesOwned: p.shares_owned || 0,
        amount: Number(p.amount || 0),
        currency: 'USDC',
        status: p.status as 'claimable' | 'claimed' | 'paid',
        method: p.claim_method,
        fromBlockchain: false,
      });
    }

    return items;
  })();

  return {
    payouts: mergedPayouts,
    blockchainPayouts,
    isLoading: payoutsLoading,
    blockchainLoading,
    blockchainError,
    refetchRentData: fetchRentData,
  };
}
