import { useState } from 'react';
import { Bot, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpendLimit } from '../hooks/useSpendLimit';
import { useKillSwitch } from '../hooks/useKillSwitch';
import { useAgentPresence } from '../hooks/useAgentPresence';
import { CURRENT_AGENT } from '../data/mockAgents';
import { formatPence } from '../data/helpers';

const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  available: { label: 'Available', colour: '#1E9A80' },
  busy: { label: 'In call', colour: '#1E9A80' },
  idle: { label: 'Idle', colour: '#F59E0B' },
  offline: { label: 'Offline', colour: '#9CA3AF' },
};

export default function Smsv2StatusBar() {
  const spend = useSpendLimit();
  const ks = useKillSwitch();
  const presence = useAgentPresence();
  const [open, setOpen] = useState(false);
  const status = STATUS_LABELS[presence.status] ?? STATUS_LABELS.available;

  return (
    <div className="flex items-center gap-3 px-3 py-1 bg-[#F3F3EE]/60 rounded-full border border-[#E5E7EB]">
      {/* Spend pill */}
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-[#6B7280] font-medium">Spend today</div>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                spend.percentUsed > 80 ? 'bg-[#EF4444]' : 'bg-[#1E9A80]'
              )}
              style={{ width: `${spend.percentUsed}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-[#1A1A1A] font-semibold">
            {formatPence(spend.spendPence)}
            <span className="text-[#9CA3AF] font-normal">
              {' / '}
              {spend.isAdmin ? '∞' : formatPence(spend.limitPence)}
            </span>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[#E5E7EB]" />

      {/* AI coach toggle */}
      <button
        onClick={() => ks.toggle('aiCoach')}
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors',
          ks.aiCoach
            ? 'bg-[#9CA3AF]/20 text-[#6B7280]'
            : 'bg-[#ECFDF5] text-[#1E9A80] hover:bg-[#1E9A80]/15'
        )}
        title={ks.aiCoach ? 'AI Coach disabled (kill switch active)' : 'AI Coach enabled'}
      >
        <Bot className="w-3 h-3" strokeWidth={2} />
        Coach: {ks.aiCoach ? 'OFF' : 'ON'}
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-[#E5E7EB]" />

      {/* Presence pill */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#1A1A1A] hover:bg-black/[0.04] px-2 py-0.5 rounded-full transition-colors"
        >
          <Circle className="w-2.5 h-2.5" fill={status.colour} stroke={status.colour} />
          {CURRENT_AGENT.name.split(' ')[0]} · {status.label}
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-1 z-50 w-32">
            {(['available', 'idle', 'offline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  presence.setStatus(s);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] text-left rounded-lg hover:bg-[#F3F3EE]"
              >
                <Circle
                  className="w-2.5 h-2.5"
                  fill={STATUS_LABELS[s].colour}
                  stroke={STATUS_LABELS[s].colour}
                />
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
