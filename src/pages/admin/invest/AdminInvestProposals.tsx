import { useState } from 'react';
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

const initialProposals: Proposal[] = [
  {
    id: 'prop-1', property: 'Seseh Beachfront Villa', title: 'Pool renovation and infinity edge upgrade',
    type: 'renovation', proposer: 'Hugo Souza', votesYes: 28, votesNo: 4, quorum: 51,
    status: 'active', created: '2026-03-15', ends: '2026-03-29',
  },
  {
    id: 'prop-2', property: 'KAEC Waterfront Residence', title: 'Increase monthly rent distribution to 85%',
    type: 'distribution', proposer: 'Ahmed Ali', votesYes: 15, votesNo: 8, quorum: 51,
    status: 'active', created: '2026-03-16', ends: '2026-03-30',
  },
  {
    id: 'prop-3', property: 'Marina Gate Apartment', title: 'Switch property manager to Premium Stays LLC',
    type: 'management', proposer: 'John Smith', votesYes: 42, votesNo: 3, quorum: 51,
    status: 'approved', created: '2026-02-20', ends: '2026-03-06',
  },
  {
    id: 'prop-4', property: 'Seseh Beachfront Villa', title: 'Add guest parking policy for Airbnb stays',
    type: 'policy', proposer: 'Sarah Chen', votesYes: 12, votesNo: 31, quorum: 51,
    status: 'rejected', created: '2026-02-10', ends: '2026-02-24',
  },
  {
    id: 'prop-5', property: 'Marina Gate Apartment', title: 'Acquire adjacent unit for portfolio expansion',
    type: 'expansion', proposer: 'David Park', votesYes: 38, votesNo: 7, quorum: 51,
    status: 'approved', created: '2026-01-28', ends: '2026-02-11',
  },
];

const propertyOptions = ['All', 'Seseh Beachfront Villa', 'Marina Gate Apartment', 'KAEC Waterfront Residence'];

export default function AdminInvestProposals() {
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = proposals.filter((p) => {
    if (propertyFilter !== 'All' && p.property !== propertyFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter.toLowerCase()) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.proposer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCloseEarly = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const newStatus = p.votesYes > p.votesNo ? 'approved' : 'rejected';
        return { ...p, status: newStatus as Proposal['status'], ends: '2026-03-18' };
      })
    );
  };

  const handleRemove = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
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
