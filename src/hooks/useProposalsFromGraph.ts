import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { SUBGRAPHS } from '@/lib/particle';

interface GraphProposalStatus {
  _proposalId: string;
  _by: string;
  _endTime: string;
  blockTimestamp: string;
}

interface GraphVote {
  _proposalId: string;
  _by: string;
  _inFavor: boolean;
  blockTimestamp: string;
}

export interface GraphProposal {
  id: string;
  propertyTitle: string;
  propertyImage: string;
  propertyId: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  endsAt: string;
  votesYes: number;
  votesNo: number;
  totalVotes: number;
  quorum: number;
  userVoted: 'yes' | 'no' | null;
  result: 'approved' | 'rejected' | null;
  fromGraph: boolean;
}

const QUERY = `{
  proposalStatuses(first: 100, orderBy: blockTimestamp, orderDirection: desc) {
    _proposalId
    _by
    _endTime
    blockTimestamp
  }
  voteds(first: 500, orderBy: blockTimestamp, orderDirection: desc) {
    _proposalId
    _by
    _inFavor
    blockTimestamp
  }
}`;

/**
 * Fetches governance proposals and votes from The Graph voting subgraph.
 * All 6 on-chain proposals are for blockchain property ID 1 (Pembroke Place, Supabase ID 2).
 */
export function useProposalsFromGraph() {
  const { address } = useWallet();
  const [proposals, setProposals] = useState<GraphProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(SUBGRAPHS.VOTING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY }),
        });

        if (!res.ok) throw new Error(`Graph query failed: ${res.status}`);

        const json = await res.json();
        const statuses: GraphProposalStatus[] = json.data?.proposalStatuses || [];
        const votes: GraphVote[] = json.data?.voteds || [];

        const nowSeconds = Math.floor(Date.now() / 1000);
        const walletLower = address?.toLowerCase() || '';

        const mapped: GraphProposal[] = statuses.map((s) => {
          const proposalVotes = votes.filter((v) => v._proposalId === s._proposalId);
          const yesVotes = proposalVotes.filter((v) => v._inFavor).length;
          const noVotes = proposalVotes.filter((v) => !v._inFavor).length;

          const userVote = walletLower
            ? proposalVotes.find((v) => v._by.toLowerCase() === walletLower)
            : null;

          const endTime = Number(s._endTime);
          const isActive = endTime > nowSeconds;
          const createdDate = new Date(Number(s.blockTimestamp) * 1000);
          const endDate = new Date(endTime * 1000);

          // Determine result for past proposals
          let result: 'approved' | 'rejected' | null = null;
          if (!isActive) {
            result = yesVotes > noVotes ? 'approved' : 'rejected';
          }

          return {
            id: `graph-proposal-${s._proposalId}`,
            propertyTitle: 'Pembroke Place',
            propertyImage: '/placeholder.svg',
            propertyId: 2, // Supabase ID for Pembroke Place (blockchain ID 1)
            title: `Proposal #${s._proposalId} — Pembroke Place`,
            description: `On-chain governance proposal created on ${createdDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
            type: 'General',
            createdAt: createdDate.toISOString(),
            endsAt: endDate.toISOString(),
            votesYes: yesVotes,
            votesNo: noVotes,
            totalVotes: yesVotes + noVotes,
            quorum: 10,
            userVoted: userVote ? (userVote._inFavor ? 'yes' : 'no') : null,
            result,
            fromGraph: true,
          };
        });

        if (!cancelled) {
          setProposals(mapped);
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load proposals from The Graph');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address]);

  return { proposals, loading, error };
}
