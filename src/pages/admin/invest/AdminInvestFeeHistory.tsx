import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  fetchPerformanceFeeDistributions,
  type FeeDistributionRecord,
} from '@/lib/subgraph';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEMS_PER_PAGE = 10;

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatMonthFromTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return MONTHS[date.getMonth()] || 'Unknown';
}

export default function AdminInvestFeeHistory() {
  const today = new Date();
  const lastMonth = today.getMonth(); // 0-based
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const [month, setMonth] = useState(lastMonth === 0 ? 12 : lastMonth);
  const [year, setYear] = useState(lastMonth === 0 ? currentYear - 1 : currentYear);
  const [data, setData] = useState<FeeDistributionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginated = data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const fetchHistory = useCallback(async (y: number, m: number) => {
    setIsLoading(true);
    setPage(1);
    try {
      const result = await fetchPerformanceFeeDistributions(y, m);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch fee history:', err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(year, month);
  }, [year, month, fetchHistory]);

  // Clamp month if user picks current year + future month
  useEffect(() => {
    if (year === currentYear && month > currentMonth) {
      setMonth(currentMonth);
    }
  }, [year, currentYear, currentMonth, month]);

  return (
    <div data-feature="ADMIN__INVEST">
      <h1 className="text-[28px] font-bold text-foreground mb-6">Fee Distribution History</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-10 w-40 px-3 rounded-md border border-input bg-background text-sm"
          >
            {MONTHS.map((m, i) => (
              <option
                key={i}
                value={i + 1}
                disabled={year === currentYear && i >= currentMonth}
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
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 w-32 px-3 rounded-md border border-input bg-background text-sm"
          >
            {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            Distributions {data.length > 0 ? `(${data.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Property ID</TableHead>
                <TableHead>Agent Address</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No distributions found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((d, i) => (
                  <TableRow key={`${d.agent}-${d.propertyId}-${i}`}>
                    <TableCell>{(page - 1) * ITEMS_PER_PAGE + i + 1}</TableCell>
                    <TableCell>{d.propertyId}</TableCell>
                    <TableCell className="font-mono text-xs" title={d.agent}>
                      {shortenAddress(d.agent)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{formatMonthFromTimestamp(d.monthTimestamp)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
