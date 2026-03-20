// useSubgraph — all The Graph subgraph query functions.
//
// Direct port from legacy subgraphHelper.js.
// Every query uses batched pagination (100 items per request) and
// deduplicates/transforms data exactly as legacy does.
//
// Endpoints from SUBGRAPHS in lib/particle.ts.

import { SUBGRAPHS, CONTRACTS } from '@/lib/particle';

// Helper: convert wei to ETH (same as legacy getEthFrom)
function getEthFrom(wei: string | number): number {
  return parseFloat(String(wei)) / 1e18;
}

// Generic paginated fetch — legacy fetches 100 at a time
async function fetchAllPaginated<T>(
  endpoint: string,
  entityName: string,
  fields: string,
  where: string = '',
  orderBy: string = 'blockTimestamp',
  orderDirection: string = 'desc',
): Promise<T[]> {
  const results: T[] = [];
  let skip = 0;
  const batchSize = 100;
  let hasMore = true;

  while (hasMore) {
    const whereClause = where ? `, where: {${where}}` : '';
    const query = `{
      ${entityName}(first: ${batchSize}, skip: ${skip}, orderBy: ${orderBy}, orderDirection: ${orderDirection}${whereClause}) {
        ${fields}
      }
    }`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      const batch = json?.data?.[entityName] || [];
      results.push(...batch);
      hasMore = batch.length === batchSize;
      skip += batchSize;
    } catch {
      hasMore = false;
    }
  }
  return results;
}

// ── 1. Primary Sale Status Events ──
export async function fetchPrimarySalesEvents(state: number): Promise<{ _propertyId: number; _status: number }[]> {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'primarySaleStatuses',
    '_propertyId _status',
  );
  // Keep highest status per property
  const map = new Map<number, number>();
  for (const e of raw) {
    const pid = Number(e._propertyId);
    const status = Number(e._status);
    if (!map.has(pid) || status > map.get(pid)!) {
      map.set(pid, status);
    }
  }
  return Array.from(map.entries())
    .filter(([, s]) => s === state)
    .map(([pid, s]) => ({ _propertyId: pid, _status: s }))
    .sort((a, b) => a._propertyId - b._propertyId);
}

// ── 2. Secondary Sales Events ──
export async function fetchSecondarySalesEvents() {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'secondarySaleStatuses',
    '_seller _listingId _propertyId _status',
  );
  const map = new Map<string, any>();
  for (const e of raw) {
    const key = String(e._listingId);
    if (!map.has(key)) {
      map.set(key, {
        _seller: e._seller?.toLowerCase(),
        _listingId: Number(e._listingId),
        _propertyId: Number(e._propertyId),
        _status: Number(e._status),
      });
    }
  }
  return Array.from(map.values())
    .filter((e) => e._status === 0)
    .sort((a, b) => b._listingId - a._listingId);
}

// ── 3. Proposal Status Events ──
export async function fetchProposalStatusEvents() {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.VOTING,
    'proposalStatuses',
    '_by _proposalId _endTime blockTimestamp',
  );
  const map = new Map<number, any>();
  for (const e of raw) {
    const pid = Number(e._proposalId);
    if (Number(e._endTime) === 0) continue;
    if (!map.has(pid)) {
      map.set(pid, {
        _by: e._by?.toLowerCase(),
        _proposalId: pid,
        _endTime: Number(e._endTime),
        blockTimestamp: Number(e.blockTimestamp),
      });
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const all = Array.from(map.values());
  const activeProposals = all
    .filter((p) => p._endTime > now)
    .sort((a, b) => b._proposalId - a._proposalId)
    .map((p, i) => ({ ...p, id: i + 1 }));
  const pastProposals = all
    .filter((p) => p._endTime <= now)
    .sort((a, b) => b._proposalId - a._proposalId)
    .map((p, i) => ({ ...p, id: i + 1 }));
  return { activeProposals, pastProposals };
}

// ── 4. Rent Status Events ──
export async function fetchRentStatusEvents() {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.RENT,
    'rentStatuses',
    '_by _propertyId _monthRent _status blockTimestamp',
  );
  const map = new Map<number, any>();
  for (const e of raw) {
    const pid = Number(e._propertyId);
    if (!map.has(pid)) {
      map.set(pid, {
        _by: e._by,
        _propertyId: pid,
        _monthRent: e._monthRent,
        _status: Number(e._status),
        blockTimestamp: Number(e.blockTimestamp),
      });
    }
  }
  return Array.from(map.values())
    .filter((e) => e._status === 0)
    .sort((a, b) => a._propertyId - b._propertyId);
}

// ── 5. Referral Count ──
export async function fetchReferralAddedEvents(address: string): Promise<number> {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'referralAddeds',
    '_by _referee',
    `_referee: "${address.toLowerCase()}"`,
  );
  return raw.length;
}

// ── 6. Commission Events (for agent) ──
export async function fetchCommissionEvents(address: string) {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'commissions',
    '_referee _referral _propertyId _sharesSold _investment _commission blockTimestamp',
    `_referee: "${address.toLowerCase()}"`,
  );
  return raw.map((e: any) => ({
    _referee: e._referee,
    _referral: e._referral,
    _propertyId: Number(e._propertyId),
    _sharesSold: Number(e._sharesSold),
    _investment: getEthFrom(e._investment),
    _commission: getEthFrom(e._commission),
    timestamp: Number(e.blockTimestamp),
  }));
}

// ── 7. Reward and Rent Events (for earnings chart) ──
export async function fetchRewardAndRentEvents(address: string, stayPrice: number) {
  const [rentEvents, boosterEvents] = await Promise.all([
    fetchAllPaginated<any>(
      SUBGRAPHS.RENT,
      'rentWithdrawns',
      '_rent blockTimestamp',
      `_by: "${address.toLowerCase()}"`,
    ),
    fetchAllPaginated<any>(
      SUBGRAPHS.BOOSTER,
      'rewardClaimeds',
      '_rewardInStay blockTimestamp',
      `_by: "${address.toLowerCase()}"`,
    ),
  ]);

  const events = [
    ...rentEvents.map((e: any) => ({
      amount: getEthFrom(e._rent),
      timestamp: Number(e.blockTimestamp),
    })),
    ...boosterEvents.map((e: any) => ({
      amount: getEthFrom(e._rewardInStay) * stayPrice,
      timestamp: Number(e.blockTimestamp),
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);

  return events;
}

// ── 8. Agent Leaderboard ──
export async function fetchAgentLeaderboardData() {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'commissions',
    '_referee _sharesSold _investment _commission',
  );
  const map = new Map<string, { user: string; share_sold: number; value: number; commission: number }>();
  for (const e of raw) {
    const agent = e._referee?.toLowerCase();
    const existing = map.get(agent) || { user: agent, share_sold: 0, value: 0, commission: 0 };
    existing.share_sold += Number(e._sharesSold);
    existing.value += getEthFrom(e._investment);
    existing.commission += getEthFrom(e._commission);
    map.set(agent, existing);
  }
  return Array.from(map.values())
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 5);
}

// ── 9. Primary Shares Bought (activity feed) ──
export async function fetchPrimarySharesBoughtEvents(propertyId?: number) {
  const where = propertyId ? `_propertyId: "${propertyId}"` : '';
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'primarySharesBoughts',
    '_buyer _sharesBought _amount blockTimestamp _propertyId',
    where,
  );
  return raw.map((e: any) => ({
    _from: 'NFsTay',
    _to: e._buyer,
    _sharesBought: Number(e._sharesBought),
    _amount: getEthFrom(e._amount),
    blockTimestamp: Number(e.blockTimestamp),
    _propertyId: Number(e._propertyId),
  }));
}

// ── 10. Secondary Shares Bought ──
export async function fetchSecondarySharesBoughtEvents(propertyId?: number) {
  const where = propertyId ? `_propertyId: "${propertyId}"` : '';
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'secondarySharesBoughts',
    '_seller _buyer _sharesBought _amount blockTimestamp _propertyId',
    where,
  );
  return raw.map((e: any) => ({
    _from: e._seller,
    _to: e._buyer,
    _sharesBought: Number(e._sharesBought),
    _amount: getEthFrom(e._amount),
    blockTimestamp: Number(e.blockTimestamp),
    _propertyId: Number(e._propertyId),
  }));
}

// ── 11. Rent Withdrawn Events (payout history) ──
export async function fetchRentWithdrawnEvents(address: string) {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.RENT,
    'rentWithdrawns',
    '_by _propertyId _rent blockTimestamp',
    `_by: "${address.toLowerCase()}"`,
  );
  return raw.map((e: any, i: number) => ({
    id: i + 1,
    propertyId: Number(e._propertyId),
    date: Number(e.blockTimestamp),
    payout: getEthFrom(e._rent),
  }));
}

// ── 12. Whitelisted Agents ──
export async function fetchWhitelistedAgents(): Promise<string[]> {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'agentWhitelistUpdateds',
    '_agent _isWhitelisted',
  );
  const map = new Map<string, boolean>();
  for (const e of raw) {
    const agent = e._agent?.toLowerCase();
    if (!map.has(agent)) {
      map.set(agent, e._isWhitelisted);
    }
  }
  return Array.from(map.entries())
    .filter(([, active]) => active)
    .map(([agent]) => agent);
}

// ── 13. Commission Events for Performance Fees ──
export async function fetchCommissionEventsForPerformanceFees(
  propertyId: number,
  year: number,
  month: number,
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const [agents, raw] = await Promise.all([
    fetchWhitelistedAgents(),
    fetchAllPaginated<any>(
      SUBGRAPHS.MARKETPLACE,
      'commissions',
      '_referee _referral _propertyId _sharesSold _investment _commission',
      `_propertyId: "${propertyId}", blockTimestamp_gte: "${startTs}", blockTimestamp_lt: "${endTs}"`,
    ),
  ]);

  const filtered = raw.filter((e: any) => agents.includes(e._referee?.toLowerCase()));
  // Summarize by agent
  const map = new Map<string, { agent: string; totalInvestment: number; totalCommission: number; salesCount: number }>();
  for (const e of filtered) {
    const agent = e._referee?.toLowerCase();
    const existing = map.get(agent) || { agent, totalInvestment: 0, totalCommission: 0, salesCount: 0 };
    existing.totalInvestment += getEthFrom(e._investment);
    existing.totalCommission += getEthFrom(e._commission);
    existing.salesCount += 1;
    map.set(agent, existing);
  }
  return Array.from(map.values());
}

// ── 14. Performance Fee Distributions ──
export async function fetchPerformanceFeeDistributions(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'performanceFeeDistributeds',
    '_recipient _propertyId _amount _monthTimestamp',
    `_monthTimestamp_gte: "${startTs}", _monthTimestamp_lte: "${endTs}"`,
  );
  return raw.map((e: any) => ({
    agent: e._recipient?.toLowerCase(),
    propertyId: Number(e._propertyId),
    amount: getEthFrom(e._amount),
    monthTimestamp: Number(e._monthTimestamp),
  }));
}

// ── 15. Performance Fee Distributions by Address ──
export async function fetchPerformanceFeeDistributionsByAddress(recipientAddress: string) {
  const raw = await fetchAllPaginated<any>(
    SUBGRAPHS.MARKETPLACE,
    'performanceFeeDistributeds',
    '_recipient _propertyId _amount _monthTimestamp',
    `_recipient: "${recipientAddress.toLowerCase()}"`,
  );
  return raw.map((e: any) => ({
    agent: e._recipient?.toLowerCase(),
    propertyId: Number(e._propertyId),
    amount: getEthFrom(e._amount),
    monthTimestamp: Number(e._monthTimestamp),
  }));
}

// ── 16. Earners Leaderboard ──
export async function fetchEarnersLeaderboard(stayPrice: number) {
  const [rentEvents, boosterEvents] = await Promise.all([
    fetchAllPaginated<any>(
      SUBGRAPHS.RENT,
      'rentWithdrawns',
      '_by _rent',
    ),
    fetchAllPaginated<any>(
      SUBGRAPHS.BOOSTER,
      'rewardClaimeds',
      '_by _rewardInStay',
    ),
  ]);

  const map = new Map<string, number>();
  for (const e of rentEvents) {
    const user = e._by?.toLowerCase();
    map.set(user, (map.get(user) || 0) + getEthFrom(e._rent));
  }
  for (const e of boosterEvents) {
    const user = e._by?.toLowerCase();
    map.set(user, (map.get(user) || 0) + getEthFrom(e._rewardInStay) * stayPrice);
  }

  return Array.from(map.entries())
    .map(([user, earnings]) => ({ user, earnings }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
}
