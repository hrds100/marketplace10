import { useCallback, useEffect, useState } from 'react';
import { Check, Sparkles, Clock, PhoneMissed, X, Voicemail, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineColumnRow } from '@/features/smsv2/caller-pad/hooks/usePipelineColumns';
import type { DialerPhase } from '../types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  clock: Clock,
  'phone-missed': PhoneMissed,
  x: X,
  voicemail: Voicemail,
  ban: Ban,
};

interface Props {
  phase: DialerPhase;
  columns: PipelineColumnRow[];
  applying: boolean;
  onOutcome: (columnId: string) => void;
}

export default function OutcomeBarPro({ phase, columns, applying, onOutcome }: Props) {
  const isActive = phase === 'wrap_up';
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'wrap_up') setPickedId(null);
  }, [phase]);

  const handlePick = useCallback(
    (colId: string) => {
      if (!isActive || applying || pickedId) return;
      setPickedId(colId);
      onOutcome(colId);
    },
    [isActive, applying, pickedId, onOutcome]
  );

  // Keyboard shortcuts 1-9
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && num <= columns.length) {
        handlePick(columns[num - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, columns, handlePick]);

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 flex-wrap',
        !isActive && 'opacity-40 pointer-events-none'
      )}
    >
      {columns.map((col, i) => {
        const Icon = col.icon ? ICON_MAP[col.icon] : null;
        const isPicked = pickedId === col.id;
        const isDimmed = pickedId !== null && !isPicked;

        return (
          <button
            key={col.id}
            onClick={() => handlePick(col.id)}
            disabled={!isActive || applying || !!pickedId}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              isPicked
                ? 'border-[#1E9A80] border-2 bg-[#ECFDF5] text-[#1E9A80]'
                : 'border-[#E5E7EB] bg-white text-[#1A1A1A] hover:border-[#1E9A80] hover:shadow-sm',
              isDimmed && 'opacity-25 grayscale pointer-events-none'
            )}
          >
            <span className="text-[10px] text-[#9CA3AF] font-mono">{i + 1}</span>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{col.name}</span>
            {isPicked && <Check className="w-3.5 h-3.5 text-[#1E9A80]" />}
          </button>
        );
      })}
    </div>
  );
}
