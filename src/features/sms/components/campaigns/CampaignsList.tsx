import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SmsCampaign } from '../../types';
import StatusBadge from '../shared/StatusBadge';

interface CampaignsListProps {
  campaigns: SmsCampaign[];
  onNew: () => void;
}

export default function CampaignsList({ campaigns, onNew }: CampaignsListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-[#F3F3EE] p-4 mb-4">
          <Megaphone className="h-8 w-8 text-[#9CA3AF]" />
        </div>
        <p className="text-[#1A1A1A] font-semibold mb-1">No campaigns yet</p>
        <p className="text-sm text-[#6B7280] mb-4">Create your first campaign</p>
        <Button
          size="sm"
          onClick={onNew}
          className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white"
        >
          Create Campaign
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#F3F3EE]/50">
            <TableHead className="text-[#6B7280] font-medium text-xs">Name</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Recipients</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs">Status</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Sent</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Delivered</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Failed</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Skipped</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => (
            <TableRow
              key={c.id}
              className={cn(
                'cursor-pointer hover:bg-[#F3F3EE]/30 transition-colors',
              )}
            >
              <TableCell className="font-medium text-sm text-[#1A1A1A]">{c.name}</TableCell>
              <TableCell className="text-sm text-[#6B7280] text-right tabular-nums">
                {c.totalRecipients.toLocaleString()}
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm text-[#6B7280] text-right tabular-nums">
                {c.sentCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-[#1E9A80] text-right tabular-nums">
                {c.deliveredCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-[#EF4444] text-right tabular-nums">
                {c.failedCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-sm text-[#F59E0B] text-right tabular-nums">
                {c.skippedCount.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
