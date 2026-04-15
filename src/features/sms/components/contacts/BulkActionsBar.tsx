import { useState } from 'react';
import { Loader2, Megaphone, Tag, GitBranch, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SmsLabel, SmsPipelineStage } from '../../types';

interface BulkActionsBarProps {
  selectedCount: number;
  labels: SmsLabel[];
  stages: SmsPipelineStage[];
  onAssignStage: (stageId: string | null) => Promise<void>;
  onAssignLabel: (labelId: string) => Promise<void>;
  onPushToCampaign: () => void;
  onDelete: () => Promise<void>;
  onClear: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  labels,
  stages,
  onAssignStage,
  onAssignLabel,
  onPushToCampaign,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function handleStage(stageId: string) {
    setBusy('stage');
    try {
      await onAssignStage(stageId === 'none' ? null : stageId);
    } finally {
      setBusy(null);
    }
  }

  async function handleLabel(labelId: string) {
    setBusy('label');
    try {
      await onAssignLabel(labelId);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy('delete');
    try {
      await onDelete();
    } finally {
      setBusy(null);
    }
  }

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border border-[#1E9A80]/20 bg-[#ECFDF5]">
      <span className="text-sm font-medium text-[#1A1A1A] mr-1">
        {selectedCount} selected
      </span>

      {/* Assign Stage */}
      <Select onValueChange={handleStage} disabled={!!busy}>
        <SelectTrigger className="w-auto h-8 rounded-lg border-[#E5E7EB] bg-white text-xs gap-1 px-2">
          {busy === 'stage' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <GitBranch className="h-3 w-3" />
          )}
          <SelectValue placeholder="Set Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Stage</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colour }} />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assign Label */}
      <Select onValueChange={handleLabel} disabled={!!busy}>
        <SelectTrigger className="w-auto h-8 rounded-lg border-[#E5E7EB] bg-white text-xs gap-1 px-2">
          {busy === 'label' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Tag className="h-3 w-3" />
          )}
          <SelectValue placeholder="Add Label" />
        </SelectTrigger>
        <SelectContent>
          {labels.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.colour }} />
                {l.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Push to Campaign */}
      <Button
        size="sm"
        variant="outline"
        onClick={onPushToCampaign}
        disabled={!!busy}
        className="h-8 rounded-lg border-[#E5E7EB] bg-white text-xs px-2"
      >
        <Megaphone className="h-3 w-3 mr-1" />
        Push to Campaign
      </Button>

      {/* Delete */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleDelete}
        disabled={!!busy}
        className="h-8 rounded-lg border-[#E5E7EB] bg-white text-xs px-2 text-[#EF4444] hover:text-[#EF4444] hover:bg-red-50"
      >
        {busy === 'delete' ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Trash2 className="h-3 w-3 mr-1" />
        )}
        Delete
      </Button>

      {/* Clear selection */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-8 rounded-lg text-xs px-2 text-[#6B7280] ml-auto"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
