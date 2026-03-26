// Subgraph query helpers for nfstay admin features
// Ported from legacy/frontend/src/context/subgraphHelper.js

import { SUBGRAPHS } from '@/lib/particle';

// ── Helpers ──

function getMonthTimestamps(year: number, month: number) {
  const start = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const end = Date.UTC(year, month, 0, 23, 59, 59);
  return {
    start: Math.floor(start / 1000),
    end: Math.floor(end / 1000),
  };
}

function formatWei(wei: string): number {
  // ethers.utils.formatEther equivalent — 18 decimals
  const num = BigInt(wei);
  const whole = num / BigInt(10 ** 18);
  const frac = num % BigInt(10 ** 18);
  return parseFloat(`${whole}.${frac.toString().padStart(18, '0')}`);
}

interface CommissionEvent {
  _referee: string;
  _referral: string;
  _propertyId: string;
  _sharesSold: string;
  _investment: string;
  _commission: string;
}

export interface SummarizedAgent {
  agent: string;
  propertyId: string;
  totalSharesSold: number;
  totalInvestment: number;
  totalCommission: number;
}

function summarizeSalesByAgent(data: CommissionEvent[]): SummarizedAgent[] {
  const summaryMap = new Map<string, SummarizedAgent>();

  data.forEach((record) => {
    const key = `${record._referee}-${record._propertyId}`;
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        agent: record._referee,
        propertyId: record._propertyId,
        totalSharesSold: 0,
        totalInvestment: 0,
        totalCommission: 0,
      });
    }

    const entry = summaryMap.get(key)!;
    entry.totalSharesSold += parseInt(record._sharesSold, 10);
    entry.totalInvestment += parseInt(record._investment, 10);
    entry.totalCommission += parseInt(record._commission, 10);
  });

  return Array.from(summaryMap.values());
}

// ── Subgraph Query Helpers ──

async function subgraphPost(url: string, query: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) throw new Error(`Subgraph request failed: ${response.status}`);
  return response.json();
}

// ── Fetch whitelisted agents (from AgentWhitelistUpdated events) ──

async function fetchWhitelistedAgents(): Promise<string[]> {
  const batchSize = 100;
  let allEvents: Array<{ _agent: string; _isWhitelisted: boolean }> = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        agentWhitelistUpdateds(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc
        ) {
          _agent
          _isWhitelisted
        }
      }
    `;

    try {
      const data = await subgraphPost(SUBGRAPHS.MARKETPLACE, query);
      const batch = data?.data?.agentWhitelistUpdateds || [];
      allEvents = [...allEvents, ...batch];
      skip += batchSize;
      hasMore = batch.length === batchSize;
    } catch (err) {
      console.error('Error fetching agent whitelist events:', err);
      break;
    }
  }

  // Deduplicate: keep only latest status per agent (events sorted desc by timestamp)
  const agentMap = new Map<string, boolean>();
  for (const event of allEvents) {
    const agent = event._agent.toLowerCase();
    if (!agentMap.has(agent)) {
      agentMap.set(agent, event._isWhitelisted);
    }
  }

  return Array.from(agentMap.entries())
    .filter(([, isWhitelisted]) => isWhitelisted)
    .map(([agent]) => agent);
}

// ── Fetch commission events for performance fees ──

export async function fetchCommissionEventsForPerformanceFees(
  propertyId: number,
  year: number,
  month: number,
): Promise<SummarizedAgent[]> {
  const start = 1754006400; // 1 Aug 2025 — when the RWA contract was deployed
  const { end } = getMonthTimestamps(year, month);
  const whitelistedAgents = await fetchWhitelistedAgents();

  const batchSize = 100;
  let allEvents: CommissionEvent[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        commissions(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc,
          where: {
            _propertyId: ${propertyId},
            blockTimestamp_gte: ${start},
            blockTimestamp_lt: ${end}
          }
        ) {
          _referee
          _referral
          _propertyId
          _sharesSold
          _investment
          _commission
        }
      }
    `;

    try {
      const data = await subgraphPost(SUBGRAPHS.MARKETPLACE, query);
      const batch = data?.data?.commissions || [];
      allEvents = [...allEvents, ...batch];
      skip += batchSize;
      hasMore = batch.length === batchSize;
    } catch (err) {
      console.error('Error fetching commission events:', err);
      break;
    }
  }

  const filtered = allEvents.filter((event) =>
    whitelistedAgents.includes(event._referee.toLowerCase()),
  );

  return summarizeSalesByAgent(filtered);
}

// ── Fetch performance fee distribution history ──

export interface FeeDistributionRecord {
  agent: string;
  propertyId: number;
  amount: number;
  monthTimestamp: number;
}

export async function fetchPerformanceFeeDistributions(
  year: number,
  month: number,
): Promise<FeeDistributionRecord[]> {
  const { start, end } = getMonthTimestamps(year, month);
  const batchSize = 100;
  let allEvents: FeeDistributionRecord[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const query = `
      {
        performanceFeeDistributeds(
          first: ${batchSize},
          skip: ${skip},
          orderBy: blockTimestamp,
          orderDirection: desc,
          where: {
            _monthTimestamp_gte: ${start},
            _monthTimestamp_lte: ${end}
          }
        ) {
          _recipient
          _propertyId
          _amount
          _monthTimestamp
        }
      }
    `;

    try {
      const data = await subgraphPost(SUBGRAPHS.MARKETPLACE, query);
      const batch = data?.data?.performanceFeeDistributeds || [];
      const formatted = batch.map((event: any) => ({
        agent: event._recipient.toLowerCase(),
        propertyId: parseInt(event._propertyId, 10),
        amount: formatWei(event._amount),
        monthTimestamp: parseInt(event._monthTimestamp, 10),
      }));
      allEvents = [...allEvents, ...formatted];
      skip += batchSize;
      hasMore = batch.length === batchSize;
    } catch (err) {
      console.error('Error fetching PerformanceFeeDistributed events:', err);
      break;
    }
  }

  return allEvents;
}

// ── Prepare fee distributions for the contract call ──

export interface FeeDistribution {
  recipient: string;
  amount: string; // wei string
}

export function prepareFeeDistributions(
  summarizedAgents: SummarizedAgent[],
  totalAmountReadable: number,
  totalPropertyShares: number,
  year: number,
  month: number,
): { distributions: FeeDistribution[]; totalAmountToSend: number; monthTimestamp: number } {
  if (summarizedAgents.length === 0) {
    throw new Error('No whitelisted agents to distribute performance fees.');
  }
  if (!totalPropertyShares) {
    throw new Error('Total property shares must be greater than zero.');
  }

  const { end: monthTimestamp } = getMonthTimestamps(year, month);

  let totalAmountToSend = 0;

  const distributions: FeeDistribution[] = summarizedAgents.map(({ agent, totalSharesSold }) => {
    const shareRatio = totalSharesSold / totalPropertyShares;
    const amount = +(shareRatio * totalAmountReadable).toFixed(3);
    totalAmountToSend += amount;

    // Convert to wei (18 decimals) — manual BigInt to avoid ethers import here
    const wholePart = Math.floor(amount);
    const fracPart = Math.round((amount - wholePart) * 10 ** 18);
    const amountWei = (BigInt(wholePart) * BigInt(10 ** 18) + BigInt(fracPart)).toString();

    return {
      recipient: agent,
      amount: amountWei,
    };
  });

  return { distributions, totalAmountToSend, monthTimestamp };
}
