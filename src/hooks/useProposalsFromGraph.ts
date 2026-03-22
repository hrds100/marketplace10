import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useInvestProperties } from '@/hooks/useInvestData';
import { CONTRACTS, SUBGRAPHS, PARTICLE_CONFIG } from '@/lib/particle';
import { VOTING_ABI } from '@/lib/contractAbis';

export interface GraphProposal {
  id: string;
  blockchainProposalId: number;
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

const RPC_URL = PARTICLE_CONFIG.rpcUrl;

/**
 * Fetches governance proposals from the Voting contract on-chain,
 * using The Graph only to discover proposal IDs and check user votes.
 */
export function useProposalsFromGraph() {
  const { address } = useWallet();
  const { data: allProperties = [] } = useInvestProperties();
  const [proposals, setProposals] = useState<GraphProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const ethers = await import('ethers').catch(() => null);
        if (!ethers) {
          setLoading(false);
          return;
        }

        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const votingContract = new ethers.Contract(CONTRACTS.VOTING, VOTING_ABI, provider);

        // 1. Get proposal IDs and vote events from The Graph
        const graphRes = await fetch(SUBGRAPHS.VOTING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{
              proposalStatuses(first: 100, orderBy: _proposalId, orderDirection: asc) { _proposalId }
              voteds(first: 500) { _proposalId _by _inFavor blockTimestamp }
            }`,
          }),
        });

        if (!graphRes.ok) throw new Error(`Graph query failed: ${graphRes.status}`);

        const graphData = await graphRes.json();
        const statusEntries: { _proposalId: string }[] = graphData.data?.proposalStatuses || [];
        const voteEntries: { _proposalId: string; _by: string; _inFavor: boolean; blockTimestamp: string }[] =
          graphData.data?.voteds || [];

        // Get unique proposal IDs
        const proposalIds = [...new Set(statusEntries.map((p) => Number(p._proposalId)))];

        if (proposalIds.length === 0) {
          if (!cancelled) {
            setProposals([]);
            fetchedRef.current = true;
            setLoading(false);
          }
          return;
        }

        const walletLower = address?.toLowerCase() || '';
        const nowSeconds = Math.floor(Date.now() / 1000);

        // 2. Fetch each proposal from the contract
        const results = await Promise.all(
          proposalIds.map(async (id) => {
            try {
              const p = await votingContract.getProposal(id);
              const fullDesc: string = await votingContract.decodeString(p._description);

              // Parse title from description: first line, strip emoji prefix
              const lines = fullDesc.split('\n');
              const titleLine = lines[0].replace(/^[^\w]*/, '').trim();
              const bodyText = lines.slice(2).join('\n').trim(); // Skip blank line after title

              // Map blockchain property ID to Supabase property
              const blockchainPropId = p._propertyId.toNumber();
              const prop = (allProperties as any[]).find(
                (ap: any) => ap.blockchain_property_id === blockchainPropId
              );

              // Check if user voted via Graph data
              const userVote = walletLower
                ? voteEntries.find(
                    (v) =>
                      Number(v._proposalId) === id && v._by.toLowerCase() === walletLower
                  )
                : null;

              const endTime = p._endTime.toNumber();
              const isActive = endTime > nowSeconds;
              const contractStatus = p._status; // 0=Active, 1=Active, 2=Closed/Approved

              const votesYes = p._votesInFavour.toNumber();
              const votesNo = p._votesInAgainst.toNumber();

              let result: 'approved' | 'rejected' | null = null;
              if (!isActive) {
                // Status 2 = closed/approved (verified from blockchain — all proposals passed unanimously)
                // Only mark rejected if votesNo > votesYes
                result = votesNo > votesYes ? 'rejected' : 'approved';
              }

              return {
                id: `graph-proposal-${id}`,
                blockchainProposalId: id,
                propertyTitle: prop?.title || 'Pembroke Place',
                propertyImage: prop?.image || '',
                propertyId: prop?.id || blockchainPropId,
                title: titleLine,
                description: bodyText,
                type: 'General',
                createdAt: new Date((endTime - 30 * 24 * 60 * 60) * 1000).toISOString(),
                endsAt: new Date(endTime * 1000).toISOString(),
                votesYes,
                votesNo,
                totalVotes: votesYes + votesNo,
                quorum: 10,
                userVoted: userVote ? (userVote._inFavor ? 'yes' : 'no') : null,
                result,
                fromGraph: true,
              } as GraphProposal;
            } catch (err) {
              console.error(`[ProposalsFromGraph] Failed to fetch proposal ${id}:`, err);
              return null;
            }
          })
        );

        if (!cancelled) {
          setProposals(results.filter((r): r is GraphProposal => r !== null));
          fetchedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ProposalsFromGraph] Error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load proposals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-fetch when address or properties change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, allProperties.length]);

  return { proposals, loading, error };
}
