import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMyPayouts, useMyPayoutClaims, useInvestProperties } from '@/hooks/useInvestData';
import { CONTRACTS, SUBGRAPHS } from '@/lib/particle';
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
  propertyImage: string;
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
  const { data: payoutClaims = [] } = useMyPayoutClaims();
  const { data: allProperties = [] } = useInvestProperties();

  const [blockchainPayouts, setBlockchainPayouts] = useState<BlockchainPayout[]>([]);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Graph rent withdrawal history
  const [graphHistory, setGraphHistory] = useState<MergedPayoutItem[]>([]);
  const graphFetchedRef = useRef(false);

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

              // Only calculate claimable amount if user is actually eligible
              const claimableAmount = eligible
                ? (Number(rentPerShare) / 1e18) * sharesOwned
                : 0;

              if (eligible && claimableAmount > 0) {
                payouts.push({
                  propertyId: blockchainPropertyId, // Must be blockchain ID, not Supabase row ID
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

  // Fetch historical rent withdrawals from The Graph
  useEffect(() => {
    if (!connected || !address) return;
    if (allProperties.length === 0) return;
    if (graphFetchedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const query = `{
          rentWithdrawns(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
            id
            _by
            _propertyId
            _rent
            blockTimestamp
            transactionHash
          }
          rentStatuses(first: 50, orderBy: blockTimestamp, orderDirection: desc) {
            _propertyId
            _monthRent
            _status
            blockTimestamp
          }
        }`;

        const res = await fetch(SUBGRAPHS.RENT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!res.ok) return;
        const json = await res.json();

        const withdrawals: Array<{
          id: string;
          _by: string;
          _propertyId: string;
          _rent: string;
          blockTimestamp: string;
          transactionHash: string;
        }> = json.data?.rentWithdrawns || [];

        // Filter by the current user's wallet
        const walletLower = address.toLowerCase();
        const userWithdrawals = withdrawals.filter(
          (w) => w._by.toLowerCase() === walletLower,
        );

        // Build a map of blockchain property ID → Supabase property for title/image lookup
        const propMap = new Map<number, { id: number; title: string; image: string }>();
        for (const p of allProperties as any[]) {
          if (p.blockchain_property_id != null) {
            propMap.set(Number(p.blockchain_property_id), { id: p.id, title: p.title || 'Property', image: p.image || '' });
          }
        }

        const historyItems: MergedPayoutItem[] = userWithdrawals.map((w) => {
          const blockchainPropId = Number(w._propertyId);
          const prop = propMap.get(blockchainPropId);
          return {
            id: `graph-rent-${w.id}`,
            propertyTitle: prop?.title || `Property #${blockchainPropId}`,
            propertyImage: prop?.image || '',
            propertyId: prop?.id || blockchainPropId,
            date: new Date(Number(w.blockTimestamp) * 1000).toISOString(),
            sharesOwned: 0,
            amount: w._rent ? parseFloat(w._rent) / 1e18 : 0,
            currency: 'USDC',
            status: 'paid' as const,
            method: 'usdc',
            txHash: w.transactionHash,
            fromBlockchain: true,
          };
        });

        if (!cancelled) {
          setGraphHistory(historyItems);
          graphFetchedRef.current = true;
        }
      } catch {
        // Non-critical — graph history is supplementary
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address, allProperties.length]);

  // Merge: Supabase history + blockchain claimable + Graph history
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
          propertyImage: bp.propertyImage,
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
        propertyImage: p.inv_properties?.image || '',
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

    // 3. Add Graph rent withdrawal history
    for (const gh of graphHistory) {
      items.push(gh);
    }

    // 4. Add bank transfer claims (payout_claims) — paid, processing, pending
    for (const c of (payoutClaims || []) as any[]) {
      if (!c || c.status === 'cancelled') continue;
      items.push({
        id: `claim-${c.id}`,
        propertyTitle: 'Bank Transfer',
        propertyImage: '',
        propertyId: 0,
        date: c.paid_at || c.created_at,
        sharesOwned: 0,
        amount: Number(c.amount_entitled || 0),
        currency: c.currency || 'GBP',
        status: c.status as 'claimable' | 'claimed' | 'paid' | 'processing',
        method: 'bank_transfer',
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
    refetchRentData: () => {
      fetchedRef.current = false;
      graphFetchedRef.current = false;
      // Trigger re-fetch by toggling a state
      setBlockchainPayouts([]);
      setGraphHistory([]);
    },
  };
}
