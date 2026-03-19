import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractFunction {
  name: string;
  description: string;
  usedBy: string;
}

interface ContractConfig {
  name: string;
  address: string;
  functions: ContractFunction[];
}

const CONTRACTS_CONFIG: ContractConfig[] = [
  {
    name: 'RWA Token',
    address: '0xA588E7dC42a956cc6c412925dE99240cc329157b',
    functions: [
      { name: 'balanceOf(address, uint256)', description: 'Get share balance for a wallet', usedBy: 'Portfolio, Payouts' },
      { name: 'getProperty(uint256)', description: 'Get property metadata (shares, APR, IPFS URI)', usedBy: 'Marketplace' },
      { name: 'totalProperties()', description: 'Total properties on-chain', usedBy: 'Marketplace' },
    ],
  },
  {
    name: 'Marketplace',
    address: '0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128',
    functions: [
      { name: 'getPrimarySale(uint256)', description: 'Get shares sold/remaining and price', usedBy: 'Marketplace' },
      { name: 'sendPrimaryShares(...)', description: 'Transfer shares to buyer (admin only)', usedBy: 'Admin' },
    ],
  },
  {
    name: 'Rent',
    address: '0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89',
    functions: [
      { name: 'getRentDetails(uint256)', description: 'Current rent cycle: total, remaining, per-share', usedBy: 'Payouts' },
      { name: 'isEligibleForRent(uint256, address)', description: 'Can this user claim rent?', usedBy: 'Payouts' },
      { name: 'getRentHistory(address, uint256)', description: 'Total USDC ever claimed by user', usedBy: 'Portfolio, Payouts' },
      { name: 'withdrawRent(uint256)', description: 'Claim rent to wallet (WRITE)', usedBy: 'Payouts' },
    ],
  },
  {
    name: 'Voting',
    address: '0x5edd93fE27eD8A0e7242490193c996BaE01EB047',
    functions: [
      { name: 'getProposal(uint256)', description: 'Get proposal details + encoded description', usedBy: 'Proposals' },
      { name: 'decodeString(bytes)', description: 'Decode proposal description', usedBy: 'Proposals' },
      { name: 'vote(uint256, bool)', description: 'Cast vote on proposal (WRITE)', usedBy: 'Proposals' },
      { name: 'getProposalFees()', description: 'Cost to submit proposal', usedBy: 'Proposals' },
      { name: 'addProposal(uint256, bytes)', description: 'Submit new proposal (WRITE)', usedBy: 'Proposals' },
    ],
  },
  {
    name: 'Booster',
    address: '0x9d5D6EeF995d24DEC8289613D6C8F946214B320b',
    functions: [
      { name: 'isBoosted(address, uint256)', description: 'Is user boosted for property?', usedBy: 'Portfolio' },
      { name: 'getEstimatedRewards(address, uint256)', description: 'Claimable STAY rewards', usedBy: 'Portfolio' },
      { name: 'boost(uint256)', description: 'Start boosting (WRITE)', usedBy: 'Portfolio' },
      { name: 'claimRewards(uint256)', description: 'Claim boost rewards (WRITE)', usedBy: 'Portfolio' },
    ],
  },
  {
    name: 'BuyLP',
    address: '0x3e6E0791683F003E963Df5357cfaA0Aaa733786f',
    functions: [
      { name: 'buyStay(address, address, uint256)', description: 'Buy STAY tokens with USDC', usedBy: 'Payouts' },
      { name: 'buyLPToken(address, address, uint256)', description: 'Buy LP tokens with USDC', usedBy: 'Payouts' },
      { name: 'getLpEstimation(uint256)', description: 'Quote: USDC -> LP amount', usedBy: 'Payouts' },
    ],
  },
];

const RPC_URL = 'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type ContractStatus = 'checking' | 'live' | 'error';

async function checkContractHealth(contractConfig: ContractConfig): Promise<boolean> {
  try {
    const ethers = await import('ethers');
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    switch (contractConfig.name) {
      case 'RWA Token': {
        const abi = ['function totalProperties() external view returns (uint256)'];
        const contract = new ethers.Contract(contractConfig.address, abi, provider);
        await contract.totalProperties();
        return true;
      }
      case 'Marketplace': {
        // Skip — getPrimarySale reverts without data, contract existence is sufficient
        const code = await provider.getCode(contractConfig.address);
        return code !== '0x';
      }
      case 'Rent': {
        const abi = ['function getRentDetails(uint256) external view returns (uint256, uint256, uint256, uint256, uint256)'];
        const contract = new ethers.Contract(contractConfig.address, abi, provider);
        await contract.getRentDetails(1);
        return true;
      }
      case 'Voting': {
        const abi = ['function getProposalFees() external view returns (uint256)'];
        const contract = new ethers.Contract(contractConfig.address, abi, provider);
        await contract.getProposalFees();
        return true;
      }
      case 'Booster': {
        const abi = ['function isBoosted(address, uint256) external view returns (bool)'];
        const contract = new ethers.Contract(contractConfig.address, abi, provider);
        await contract.isBoosted('0x0000000000000000000000000000000000000000', 1);
        return true;
      }
      case 'BuyLP': {
        const abi = ['function getLpEstimation(uint256) external view returns (uint256)'];
        const contract = new ethers.Contract(contractConfig.address, abi, provider);
        await contract.getLpEstimation(ethers.utils.parseUnits('1', 18));
        return true;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export default function AdminEndpoints() {
  const [statuses, setStatuses] = useState<Record<string, ContractStatus>>({});
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const runHealthChecks = async () => {
    setChecking(true);
    const newStatuses: Record<string, ContractStatus> = {};

    // Set all to checking
    for (const c of CONTRACTS_CONFIG) {
      newStatuses[c.name] = 'checking';
    }
    setStatuses({ ...newStatuses });

    // Run checks in parallel
    const results = await Promise.all(
      CONTRACTS_CONFIG.map(async (c) => {
        try {
          const healthy = await checkContractHealth(c);
          return { name: c.name, status: healthy ? 'live' : 'error' } as const;
        } catch {
          return { name: c.name, status: 'error' } as const;
        }
      })
    );

    const finalStatuses: Record<string, ContractStatus> = {};
    for (const r of results) {
      finalStatuses[r.name] = r.status;
    }
    setStatuses(finalStatuses);
    setLastChecked(new Date());
    setChecking(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const toggleExpand = (name: string) => {
    setExpandedContracts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const secondsAgo = lastChecked
    ? Math.floor((Date.now() - lastChecked.getTime()) / 1000)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Smart Contract Endpoints</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All 6 smart contracts used by the investment module on BNB Chain.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-muted-foreground">
              Last checked: {secondsAgo}s ago
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={runHealthChecks}
            disabled={checking}
          >
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {CONTRACTS_CONFIG.map((contract) => {
          const status = statuses[contract.name] || 'checking';
          const isExpanded = expandedContracts.has(contract.name);
          const liveCount = contract.functions.filter((f) => !f.name.includes('WRITE')).length;

          return (
            <Card key={contract.name} className="border-border">
              <CardContent className="p-0">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(contract.name)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {status === 'checking' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : status === 'live' ? (
                      <span className="flex h-3 w-3 relative">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="inline-flex h-3 w-3 rounded-full bg-red-500" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{contract.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          status === 'live'
                            ? 'text-emerald-500 border-emerald-500/30'
                            : status === 'error'
                            ? 'text-red-500 border-red-500/30'
                            : 'text-muted-foreground border-muted'
                        )}
                      >
                        {status === 'checking' ? 'Checking...' : status === 'live' ? 'Live' : 'Error'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {truncateAddress(contract.address)}
                    </p>
                  </div>

                  {/* Functions count */}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {contract.functions.length} functions
                  </span>

                  {/* BscScan link */}
                  <a
                    href={`https://bscscan.com/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {/* Expand toggle */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded function list */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="pb-2 font-medium">Function</th>
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2 font-medium text-right">Used By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.functions.map((fn) => (
                          <tr key={fn.name} className="border-t border-border/50">
                            <td className="py-2.5 pr-4">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                {fn.name}
                              </code>
                            </td>
                            <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                              {fn.description}
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex gap-1 justify-end flex-wrap">
                                {fn.usedBy.split(', ').map((page) => (
                                  <Badge
                                    key={page}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {page}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
