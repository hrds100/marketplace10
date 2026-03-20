import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMyHoldings, useInvestProperties } from '@/hooks/useInvestData';
import { CONTRACTS } from '@/lib/particle';
import { RWA_TOKEN_ABI } from '@/lib/contractAbis';

export interface PortfolioHolding {
  propertyId: number;
  propertyTitle: string;
  location: string;
  image: string;
  sharesOwned: number;
  sharePrice: number;
  currentValue: number;
  invested: number;
  totalEarned: number;
  monthlyYield: number;
  annualYield: number;
  lastPayout: string;
  status: 'earning';
  /** True when share count came from on-chain balanceOf */
  fromBlockchain: boolean;
}

export interface PortfolioData {
  totalContributed: number;
  totalValue: number;
  totalEarnings: number;
  pendingPayouts: number;
  holdings: PortfolioHolding[];
}

/**
 * Merges Supabase holdings with on-chain share balances.
 * Blockchain is the source of truth for share count — if a balance
 * is found on-chain it overrides the Supabase `shares_owned` value.
 * Properties that exist on-chain but not in Supabase are added too
 * (legacy investors who purchased before the DB existed).
 */
export function usePortfolioWithBlockchain() {
  const { address, connected } = useWallet();
  const { data: supabaseHoldings = [], isLoading: holdingsLoading } = useMyHoldings();
  const { data: allProperties = [], isLoading: propertiesLoading } = useInvestProperties();

  const [blockchainBalances, setBlockchainBalances] = useState<Record<number, number>>({});
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Fetch on-chain balances — only re-fetch when address or properties actually change
  // (not when callback references change)
  const addressRef = useRef(address);
  const fetchedRef = useRef(false);
  addressRef.current = address;

  useEffect(() => {
    if (!connected || !address || allProperties.length === 0) return;
    // Skip if already fetched for this address
    if (fetchedRef.current && addressRef.current === address) return;

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
        const walletAddr = address!; // Guaranteed non-null by guard above

        const balances: Record<number, number> = {};

        await Promise.all(
          allProperties
            .filter((p: any) => p.blockchain_property_id != null)
            .map(async (p: any) => {
              try {
                const balanceBN = await rwaContract.balanceOf(walletAddr, p.blockchain_property_id);
                const balance = balanceBN.toNumber();
                if (balance > 0) {
                  balances[p.id] = balance;
                }
              } catch {
                // Individual property failure — skip silently
              }
            }),
        );

        if (!cancelled) {
          setBlockchainBalances(balances);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setBlockchainError(
            err instanceof Error ? err.message : 'Failed to load blockchain balances',
          );
        }
      } finally {
        if (!cancelled) setBlockchainLoading(false);
      }
    })();

    return () => { cancelled = true; };
  // Only re-fetch when address or property list actually changes (by value, not reference)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address, allProperties.length]);

  // Build merged portfolio
  const portfolio: PortfolioData = (() => {
    // Start with a map of property ID → holding
    const holdingMap = new Map<number, PortfolioHolding>();

    // 1. Seed from Supabase holdings
    for (const h of supabaseHoldings as any[]) {
      const prop = h.inv_properties;
      const sharesOwned = h.shares_owned || 0;
      const sharePrice = prop?.price_per_share || 100;

      holdingMap.set(h.property_id, {
        propertyId: h.property_id,
        propertyTitle: prop?.title || 'Property',
        location: prop?.location || '',
        image: prop?.image || '',
        sharesOwned,
        sharePrice,
        currentValue: Number(h.current_value || h.invested_amount || 0),
        invested: Number(h.invested_amount || 0),
        totalEarned: Number(h.total_earned || 0),
        monthlyYield: prop
          ? (Number(prop.monthly_rent || 0) / Number(prop.total_shares || 1)) * sharesOwned
          : 0,
        annualYield: Number(prop?.annual_yield || 0),
        lastPayout: h.last_payout_date || '',
        status: 'earning',
        fromBlockchain: false,
      });
    }

    // 2. Overlay / add blockchain balances
    for (const [propertyId, onChainShares] of Object.entries(blockchainBalances)) {
      const pid = Number(propertyId);
      const existing = holdingMap.get(pid);

      if (existing) {
        // Blockchain overrides share count (source of truth)
        const sharePrice = existing.sharePrice;
        existing.sharesOwned = onChainShares;
        existing.currentValue = onChainShares * sharePrice;
        existing.fromBlockchain = true;

        // Recalculate monthly yield with updated share count
        const prop = (allProperties as any[]).find((p: any) => p.id === pid);
        if (prop) {
          existing.monthlyYield =
            (Number(prop.monthly_rent || 0) / Number(prop.total_shares || 1)) * onChainShares;
        }
      } else {
        // Property exists on-chain but not in Supabase — legacy investor
        const prop = (allProperties as any[]).find((p: any) => p.id === pid);
        if (prop) {
          const sharePrice = Number(prop.price_per_share || 100);
          holdingMap.set(pid, {
            propertyId: pid,
            propertyTitle: prop.title || 'Property',
            location: prop.location || '',
            image: prop.image || '',
            sharesOwned: onChainShares,
            sharePrice,
            currentValue: onChainShares * sharePrice,
            invested: onChainShares * sharePrice,
            totalEarned: 0,
            monthlyYield:
              (Number(prop.monthly_rent || 0) / Number(prop.total_shares || 1)) * onChainShares,
            annualYield: Number(prop.annual_yield || 0),
            lastPayout: '',
            status: 'earning',
            fromBlockchain: true,
          });
        }
      }
    }

    // 3. Fetch per-property earnings + last payout from The Graph
    if (address) {
      try {
        const res = await fetch('https://api.studio.thegraph.com/query/62641/nfstay-rwa-mainnet-rent/v3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{ rentWithdrawns(where: { _by: "${address.toLowerCase()}" }, orderBy: blockTimestamp, orderDirection: desc) { _rent _propertyId blockTimestamp } }`,
          }),
        });
        const gData = await res.json();
        const withdrawals = gData.data?.rentWithdrawns || [];
        // Sum earnings per property + find last payout date per property
        const earningsMap = new Map<number, { total: number; lastDate: string }>();
        for (const w of withdrawals) {
          const pid = Number(w._propertyId);
          const amount = parseInt(w._rent) / 1e18;
          const date = new Date(parseInt(w.blockTimestamp) * 1000).toISOString();
          const existing = earningsMap.get(pid);
          if (existing) {
            existing.total += amount;
          } else {
            earningsMap.set(pid, { total: amount, lastDate: date });
          }
        }
        // Apply to holdings (match by blockchain_property_id)
        for (const h of holdingMap.values()) {
          const prop = (allProperties as any[]).find((p: any) => p.id === h.propertyId);
          const bcId = prop?.blockchain_property_id;
          if (bcId != null) {
            const earned = earningsMap.get(bcId);
            if (earned) {
              h.totalEarned = earned.total;
              h.lastPayout = earned.lastDate;
            }
          }
        }
      } catch { /* Graph query failed — non-critical */ }
    }

    const holdings = Array.from(holdingMap.values());

    return {
      totalContributed: holdings.reduce((sum, h) => sum + h.invested, 0),
      totalValue: holdings.reduce((sum, h) => sum + h.currentValue, 0),
      totalEarnings: holdings.reduce((sum, h) => sum + h.totalEarned, 0),
      pendingPayouts: 0,
      holdings,
    };
  })();

  return {
    portfolio,
    isLoading: holdingsLoading || propertiesLoading,
    blockchainLoading,
    blockchainError,
    refetchBlockchain: () => { fetchedRef.current = false; },
  };
}
