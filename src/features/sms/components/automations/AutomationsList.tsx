import { useNavigate } from 'react-router-dom';
import { Workflow, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SmsAutomation } from '../../types';

interface AutomationsListProps {
  automations: SmsAutomation[];
  leadCountMap: Record<string, number>;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTriggerSummary(automation: SmsAutomation): string {
  const { triggerType, triggerConfig } = automation;
  if (triggerType === 'keyword' && triggerConfig.keywords?.length) {
    return triggerConfig.keywords.join(', ');
  }
  if (triggerType === 'time_based' && triggerConfig.timeRange) {
    return `${triggerConfig.timeRange.start} - ${triggerConfig.timeRange.end}`;
  }
  if (triggerType === 'new_message') {
    return 'Any new message';
  }
  return 'Not configured';
}

const TRIGGER_COLOURS: Record<string, string> = {
  new_message: '#1E9A80',
  keyword: '#F59E0B',
  time_based: '#6B7280',
};

export default function AutomationsList({
  automations,
  leadCountMap,
  onToggle,
  onDelete,
  onNew,
}: AutomationsListProps) {
  const navigate = useNavigate();

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#F3F3EE] flex items-center justify-center mb-4">
          <Workflow className="w-6 h-6 text-[#9CA3AF]" />
        </div>
        <h3 className="text-base font-semibold text-[#1A1A1A] mb-1">No automations yet</h3>
        <p className="text-sm text-[#6B7280] mb-6">Create your first flow</p>
        <Button
          onClick={onNew}
          className="bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white rounded-xl"
        >
          + New Flow
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#E5E7EB] hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-[#6B7280]">Name</TableHead>
            <TableHead className="text-xs font-semibold text-[#6B7280]">Trigger</TableHead>
            <TableHead className="text-xs font-semibold text-[#6B7280]">Status</TableHead>
            <TableHead className="text-xs font-semibold text-[#6B7280] text-right">Leads</TableHead>
            <TableHead className="text-xs font-semibold text-[#6B7280]">Last Run</TableHead>
            <TableHead className="text-xs font-semibold text-[#6B7280] text-right">Run Count</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {automations.map((auto) => {
            const triggerColour = TRIGGER_COLOURS[auto.triggerType] || '#6B7280';
            return (
              <TableRow
                key={auto.id}
                className="border-b border-[#E5E7EB] cursor-pointer hover:bg-[#F3F3EE]/50 transition-colors"
                onClick={() => navigate(`/sms/automations/${auto.id}`)}
              >
                <TableCell className="font-medium text-sm text-[#1A1A1A]">
                  {auto.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: triggerColour,
                        background: `${triggerColour}15`,
                      }}
                    >
                      {auto.triggerType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[#6B7280] truncate max-w-[160px]">
                      {getTriggerSummary(auto)}
                    </span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={auto.isActive}
                    onCheckedChange={(checked) => onToggle(auto.id, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Users className="w-3 h-3 text-[#9CA3AF]" />
                    <span className="text-xs text-[#6B7280] tabular-nums">
                      {(leadCountMap[auto.id] ?? 0).toLocaleString()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-[#6B7280]">
                  {formatRelativeTime(auto.lastRunAt)}
                </TableCell>
                <TableCell className="text-xs text-[#6B7280] text-right tabular-nums">
                  {auto.runCount.toLocaleString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDelete(auto.id)}
                    className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
