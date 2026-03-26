import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBlockchain } from '@/hooks/useBlockchain';
import {
  fetchCommissionEventsForPerformanceFees,
  prepareFeeDistributions,
  type SummarizedAgent,
} from '@/lib/subgraph';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatWeiDisplay(wei: number): string {
  // wei here is raw integer from subgraph (18 decimals)
  const value = wei / 1e18;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminInvestPerformanceFees() {
  const currentMonth = new Date().getMonth(); // 0-based
  const currentYear = new Date().getFullYear();

  const [propertyId, setPropertyId] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [distributionAmount, setDistributionAmount] = useState('');
  const [agents, setAgents] = useState<SummarizedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  const { adminDistributePerformanceFees, adminGetTotalPropertyShares } = useBlockchain();

  const canFetch = propertyId && month && year;
  const canDistribute = agents.length > 0 && Number(distributionAmount) > 0 && !isDistributing;

  const handleFetch = async () => {
    if (!canFetch) return;
    setIsLoading(true);
    setAgents([]);
    try {
      const data = await fetchCommissionEventsForPerformanceFees(
        Number(propertyId),
        Number(year),
        Number(month),
      );
      setAgents(data);
      if (data.length === 0) {
        toast.info('No commission events found for the selected filters.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch commission data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!canDistribute) return;
    setIsDistributing(true);
    try {
      const totalShares = await adminGetTotalPropertyShares(Number(propertyId));
      if (totalShares === 0) {
        toast.error('Could not get total property shares from contract.');
        return;
      }

      const { distributions, totalAmountToSend, monthTimestamp } = prepareFeeDistributions(
        agents,
        Number(distributionAmount),
        totalShares,
        Number(year),
        Number(month),
      );

      await adminDistributePerformanceFees(distributions, Number(propertyId), monthTimestamp, totalAmountToSend);
      toast.success('Performance fees distributed successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Distribution failed');
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Distribute Performance Fees</h1>

      {/* Filters */}
      <Card className="border-border mb-6">
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-4 items-end mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Property ID</label>
              <input
                type="number"
                placeholder="1"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={isDistributing}
                className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={isDistributing}
                className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Month</option>
                {MONTHS.map((m, i) => (
                  <option
                    key={i}
                    value={i + 1}
                    disabled={Number(year) === currentYear && i >= currentMonth}
                  >
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isDistributing}
                className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select Year</option>
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleFetch}
              disabled={!canFetch || isLoading}
              variant="outline"
              className="h-10"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Fetch Data
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Distribution Amount ($)</label>
              <input
                type="number"
                placeholder="120"
                value={distributionAmount}
                onChange={(e) => setDistributionAmount(e.target.value)}
                disabled={isDistributing}
                className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>

            <Button
              onClick={handleDistribute}
              disabled={!canDistribute}
              className="h-10 bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
            >
              {isDistributing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Distribute
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            Agent Commissions {agents.length > 0 ? `(${agents.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Property ID</TableHead>
                <TableHead>Agent Address</TableHead>
                <TableHead className="text-right">Shares Sold</TableHead>
                <TableHead className="text-right">Total Investment</TableHead>
                <TableHead className="text-right">Total Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No data found. Select filters and click "Fetch Data".
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((a, i) => (
                  <TableRow key={`${a.agent}-${a.propertyId}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{a.propertyId}</TableCell>
                    <TableCell className="font-mono text-xs" title={a.agent}>
                      {shortenAddress(a.agent)}
                    </TableCell>
                    <TableCell className="text-right">{a.totalSharesSold}</TableCell>
                    <TableCell className="text-right">{formatWeiDisplay(a.totalInvestment)}</TableCell>
                    <TableCell className="text-right">{formatWeiDisplay(a.totalCommission)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
