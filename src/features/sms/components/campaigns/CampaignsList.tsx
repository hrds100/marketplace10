import { Loader2, Megaphone, Pause, Pencil, Play, Send } from 'lucide-react';
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
  onEdit?: (campaign: SmsCampaign) => void;
  onSendNextBatch?: (campaignId: string) => void;
  onPause?: (campaignId: string) => void;
  onResume?: (campaignId: string) => void;
  isSendingBatch?: boolean;
  isPausing?: boolean;
  isResuming?: boolean;
}

function getRemainingCount(c: SmsCampaign): number {
  return Math.max(0, c.totalRecipients - c.sentCount - c.failedCount - c.skippedCount);
}

export default function CampaignsList({
  campaigns,
  onNew,
  onEdit,
  onSendNextBatch,
  onPause,
  onResume,
  isSendingBatch,
  isPausing,
  isResuming,
}: CampaignsListProps) {
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
            <TableHead className="text-[#6B7280] font-medium text-xs">Progress</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Sent</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Delivered</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Failed</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs text-right">Skipped</TableHead>
            <TableHead className="text-[#6B7280] font-medium text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => {
            const remaining = getRemainingCount(c);
            const hasPendingRecipients = remaining > 0;
            const canEdit = (c.status === 'draft' || c.status === 'paused') && onEdit;
            const canSendBatch = (c.status === 'paused' || (c.status === 'complete' && hasPendingRecipients)) && onSendNextBatch;
            const canPause = c.status === 'sending' && onPause;
            const canResume = c.status === 'paused' && onResume;
            const progressPct = c.totalRecipients > 0
              ? Math.round(((c.sentCount + c.failedCount + c.skippedCount) / c.totalRecipients) * 100)
              : 0;

            return (
              <TableRow
                key={c.id}
                className={cn(
                  'hover:bg-[#F3F3EE]/30 transition-colors',
                )}
              >
                <TableCell className="font-medium text-sm text-[#1A1A1A]">{c.name}</TableCell>
                <TableCell className="text-sm text-[#6B7280] text-right tabular-nums">
                  {c.totalRecipients.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  {c.status === 'sending' || c.status === 'paused' || (c.status === 'complete' && c.totalRecipients > 0) ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-[#F3F3EE] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1E9A80] transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#9CA3AF] tabular-nums w-8 text-right">{progressPct}%</span>
                      </div>
                      {hasPendingRecipients && c.status !== 'complete' && (
                        <p className="text-xs text-[#6B7280]">
                          Sent {c.sentCount} of {c.totalRecipients} ({remaining} remaining)
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-[#9CA3AF]">--</span>
                  )}
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
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(c)}
                        className="rounded-lg border-[#E5E7EB] h-7 text-xs px-2"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canSendBatch && (
                      <Button
                        size="sm"
                        onClick={() => onSendNextBatch(c.id)}
                        disabled={isSendingBatch}
                        className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white h-7 text-xs px-2"
                      >
                        {isSendingBatch ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Next Batch
                          </>
                        )}
                      </Button>
                    )}
                    {canPause && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPause(c.id)}
                        disabled={isPausing}
                        className="rounded-lg border-[#E5E7EB] h-7 text-xs px-2"
                      >
                        {isPausing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </>
                        )}
                      </Button>
                    )}
                    {canResume && !canSendBatch && (
                      <Button
                        size="sm"
                        onClick={() => onResume(c.id)}
                        disabled={isResuming}
                        className="rounded-lg bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white h-7 text-xs px-2"
                      >
                        {isResuming ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
