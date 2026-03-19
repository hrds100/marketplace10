import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useProposals } from '@/hooks/useInvestData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Search, XCircle, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Proposal {
  id: string;
  property: string;
  title: string;
  type: 'renovation' | 'policy' | 'distribution' | 'management' | 'expansion';
  proposer: string;
  votesYes: number;
  votesNo: number;
  quorum: number;
  status: 'active' | 'approved' | 'rejected';
  created: string;
  ends: string;
}

const typeColors: Record<string, string> = {
  renovation: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  policy: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  distribution: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  management: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  expansion: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  approved: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  rejected: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};


export default function AdminInvestProposals() {
  const qc = useQueryClient();
  const { data: realProposals = [] } = useProposals();

  const [propertyFilter, setPropertyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Map real Supabase proposals to Proposal display shape
  const proposals: Proposal[] = useMemo(() => {
    return (realProposals as any[])
      .filter((p) => p.result !== 'removed')
      .map((p) => {
        let status: Proposal['status'] = 'active';
        if (p.result === 'approved') status = 'approved';
        else if (p.result === 'rejected') status = 'rejected';
        else if (p.result) status = 'rejected';
        return {
          id: p.id,
          property: p.inv_properties?.title || `Property #${p.property_id}`,
          title: p.title || '(no title)',
          type: (p.type?.toLowerCase() || 'management') as Proposal['type'],
          proposer: p.created_by?.slice(0, 8) || '—',
          votesYes: Number(p.votes_yes || 0),
          votesNo: Number(p.votes_no || 0),
          quorum: Number(p.quorum || 51),
          status,
          created: p.created_at?.slice(0, 10) || '',
          ends: p.ends_at?.slice(0, 10) || '',
        };
      });
  }, [realProposals]);

  const propertyOptions = useMemo(() => {
    const titles = Array.from(new Set(proposals.map((p) => p.property)));
    return ['All', ...titles];
  }, [proposals]);

  const filtered = proposals.filter((p) => {
    if (propertyFilter !== 'All' && p.property !== propertyFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase()) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.proposer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCloseEarly = async (id: string) => {
    const p = proposals.find((x) => x.id === id);
    if (!p) return;
    const result = p.votesYes >= p.votesNo ? 'approved' : 'rejected';
    try {
      const { error } = await (supabase.from('inv_proposals') as any)
        .update({ result, closed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['inv_proposals'] });
      toast.success(`Proposal closed — marked as ${result}`);
    } catch {
      toast.error('Failed to close proposal');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await (supabase.from('inv_proposals') as any)
        .update({ result: 'removed' })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['inv_proposals'] });
      toast.success('Proposal removed');
    } catch {
      toast.error('Failed to remove proposal');
    }
  };

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground mb-6">Proposals</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
        >
          {propertyOptions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option>Active</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
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
                <TableHead>Property</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Proposer</TableHead>
                <TableHead className="text-center">Votes</TableHead>
                <TableHead className="text-right">Quorum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const totalVotes = p.votesYes + p.votesNo;
                const yesPct = totalVotes > 0 ? Math.round((p.votesYes / totalVotes) * 100) : 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium max-w-[140px] truncate">{p.property}</TableCell>
                    <TableCell className="text-sm max-w-[200px]">{p.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs capitalize', typeColors[p.type])}>
                        {p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.proposer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1">
                          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${yesPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.votesYes}Y / {p.votesNo}N
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.quorum}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {p.status === 'active' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                        <Badge variant="outline" className={cn('text-xs capitalize', statusColors[p.status])}>
                          {p.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.created}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.ends}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'active' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleCloseEarly(p.id)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Close Early
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(p.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
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
