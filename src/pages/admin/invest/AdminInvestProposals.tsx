import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CONTRACTS } from '@/lib/particle';

interface Proposal {
  id: number;
  propertyId: number;
  proposer: string;
  title: string;
  votesYes: number;
  votesNo: number;
  endTime: string;
  status: 'active' | 'approved' | 'closed';
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  closed: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function AdminInvestProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ethers = await import('ethers');
        const provider = new ethers.providers.JsonRpcProvider(
          'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T'
        );
        const { VOTING_ABI } = await import('@/lib/contractAbis');
        const voting = new ethers.Contract(CONTRACTS.VOTING, VOTING_ABI, provider);

        const results: Proposal[] = [];
        for (let i = 1; i <= 20; i++) {
          try {
            const p = await voting.getProposal(i);
            // Skip empty proposals (propertyId = 0)
            if (p._propertyId.toNumber() === 0) continue;

            let title = `Proposal #${i}`;
            try {
              title = await voting.decodeString(p._description);
            } catch { /* decode failed */ }

            const endTime = new Date(p._endTime.toNumber() * 1000);
            const now = new Date();
            const statusCode = p._status; // 0=active, 1=active, 2=closed/approved
            let status: 'active' | 'approved' | 'closed' = 'active';
            if (statusCode === 2) status = 'approved';
            else if (endTime < now) status = 'closed';

            results.push({
              id: i,
              propertyId: p._propertyId.toNumber(),
              proposer: p._proposer,
              title,
              votesYes: p._votesInFavour.toNumber(),
              votesNo: p._votesInAgainst.toNumber(),
              endTime: endTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              status,
            });
          } catch {
            // No more proposals
            break;
          }
        }

        if (!cancelled) { setProposals(results); setLoading(false); }
      } catch (err: any) {
        if (!cancelled) { setError(err.message || 'Failed to load proposals'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = proposals.filter((p) => {
    if (!search) return true;
    return p.title.toLowerCase().includes(search.toLowerCase());
  });

  const totalVotes = proposals.reduce((sum, p) => sum + p.votesYes + p.votesNo, 0);
  const activeCount = proposals.filter((p) => p.status === 'active').length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div data-feature="ADMIN__INVEST">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {proposals.length} proposals &middot; {activeCount} active &middot; {approvedCount} approved &middot; {totalVotes.toLocaleString()} total votes
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm w-64"
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Proposer</TableHead>
                <TableHead className="text-right">Yes</TableHead>
                <TableHead className="text-right">No</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const totalVotes = p.votesYes + p.votesNo;
                const yesPct = totalVotes > 0 ? (p.votesYes / totalVotes) * 100 : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-muted-foreground">{p.id}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
                    <TableCell>
                      <a
                        href={`https://bscscan.com/address/${p.proposer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-primary hover:underline"
                      >
                        {p.proposer.slice(0, 6)}...{p.proposer.slice(-4)}
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">{p.votesYes.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-red-500">{p.votesNo.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress value={yesPct} className="h-2" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">{yesPct.toFixed(0)}% yes</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{p.endTime}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs capitalize', statusColors[p.status])}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No proposals found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
