import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMyPayouts, useInvestProperties } from '@/hooks/useInvestData';
import { CONTRACTS } from '@/lib/particle';
import { RWA_TOKEN_ABI, RENT_ABI } from '@/lib/contractAbis';

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
  const { data: supabasePayouts = [], isLoading: payoutsLoading } = useMyPayouts();
  const { data: allProperties = [] } = useInvestProperties();

  const [blockchainPayouts, setBlockchainPayouts] = useState<BlockchainPayout[]>([]);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Fetch rent details — only re-fetch when address or holdings actually change
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!connected || !address) return;
    // Wait for properties to load from Supabase
    if (allProperties.length === 0) return;
    if (fetchedRef.current) return;

    let cancelled = false;
    setBlockchainLoading(true);
    setBlockchainError(null);

    (async () => {
      try {
        // Use ethers directly — avoids stale React closure on address
        const ethers = await import('ethers').catch(() => null);
        if (!ethers) { setBlockchainLoading(false); return; }

        const provider = new ethers.providers.JsonRpcProvider(
          'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
        );
        const rwaContract = new ethers.Contract(CONTRACTS.RWA_TOKEN, RWA_TOKEN_ABI, provider);
        const rentContract = new ethers.Contract(CONTRACTS.RENT, RENT_ABI, provider);
        const walletAddr = address!; // Guaranteed non-null by guard above

        const payouts: BlockchainPayout[] = [];

        await Promise.all(
          (allProperties as any[])
            .filter((p: any) => p.blockchain_property_id != null)
            .map(async (prop: any) => {
            const blockchainPropertyId = prop.blockchain_property_id;

            try {
              const [balanceBN, rentDetailsTuple, eligible] = await Promise.all([
                rwaContract.balanceOf(walletAddr, blockchainPropertyId),
                rentContract.getRentDetails(blockchainPropertyId),
                rentContract.isEligibleForRent(blockchainPropertyId, walletAddr).catch(() => false),
              ]);

              const sharesOwned = balanceBN.toNumber();
              if (sharesOwned === 0) return;

              const rentPerShare = rentDetailsTuple[4].toString();
              const totalRent = rentDetailsTuple[2].toString();
              const rentRemaining = rentDetailsTuple[3].toString();
              const startTime = rentDetailsTuple[0].toNumber();
              const endTime = rentDetailsTuple[1].toNumber();

              let claimableAmount = 0;
              try {
                claimableAmount = (Number(rentPerShare) / 1e18) * sharesOwned;
              } catch {
                claimableAmount = 0;
              }

              if (claimableAmount > 0 || eligible) {
                payouts.push({
                  propertyId: prop.id,
                  propertyTitle: prop.title || 'Property',
                  propertyImage: prop.image || '',
                  sharesOwned,
                  rentPerShare,
                  totalRent,
                  rentRemaining,
                  startTime,
                  endTime,
                  eligible,
                  claimableAmount,
                });
              }
            } catch {
              // Individual property failure — skip silently
            }
          }),
        );

        if (!cancelled) {
          setBlockchainPayouts(payouts);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setBlockchainError(
            err instanceof Error ? err.message : 'Failed to load blockchain rent data',
          );
        }
      } finally {
        if (!cancelled) setBlockchainLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address, allProperties.length]);

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
    refetchRentData: () => { fetchedRef.current = false; },
  };
}
