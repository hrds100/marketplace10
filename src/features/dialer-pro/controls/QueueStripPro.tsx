import { cn } from '@/lib/utils';
import type { QueueLead, DialerPhase } from '../types';

interface Props {
  queue: QueueLead[];
  phase: DialerPhase;
  currentLeadId: string | null;
}

export default function QueueStripPro({ queue, phase, currentLeadId }: Props) {
  const next5 = queue.slice(0, 5);
  const isDialing = phase === 'dialing' || phase === 'ringing' || phase === 'connected';

  if (next5.length === 0) {
    return (
      <div className="text-xs text-[#9CA3AF]">Queue empty</div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {next5.map((lead, i) => {
        const isCurrent = lead.contactId === currentLeadId;
        return (
          <div
            key={lead.queueRowId}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs',
              isCurrent
                ? 'border-[#1E9A80] bg-[#ECFDF5] text-[#1E9A80]'
                : 'border-[#E5E7EB] bg-white text-[#6B7280]'
            )}
          >
            {isCurrent && isDialing && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1E9A80] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E9A80]" />
              </span>
            )}
            <span className="font-mono text-[10px] text-[#9CA3AF]">{i + 1}.</span>
            <span className="font-medium truncate max-w-[100px]">{lead.name}</span>
            <span className="text-[#9CA3AF] truncate max-w-[90px]">{lead.phone}</span>
            {lead.attempts > 0 && (
              <span className="text-[10px] text-[#9CA3AF]">×{lead.attempts}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
