// PR 153 (Hugo 2026-04-29): live session counts at the bottom of the
// overview page. Truth source: useSessionStats (realtime wk_calls
// projection scoped to agent_id=me AND started_at >= sessionStartedAt).
//
// Hugo Rule 13: if useSessionStats.error is set, every cell renders `—`
// with a tooltip "data unavailable" — never a fake zero.

import { cn } from '@/lib/utils';
import { useSessionStats } from '../../../hooks/useSessionStats';
import { useDialerSession } from '../../../hooks/useDialerSession';
import { useCurrentAgent } from '../../../hooks/useCurrentAgent';
import { useMyDialerQueue } from '../../../hooks/useMyDialerQueue';

export interface SessionFooterProps {
  campaignId: string | null;
  agentId: string | null;
}

interface CellProps {
  label: string;
  value: number | string | null;
  tone?: 'default' | 'green' | 'amber' | 'red';
  unavailable?: boolean;
}

function Cell({ label, value, tone = 'default', unavailable }: CellProps) {
  const display = unavailable || value === null ? '—' : value;
  return (
    <div
      className="bg-white rounded-lg p-2 border border-[#E5E7EB] flex flex-col"
      title={unavailable ? 'data unavailable' : undefined}
    >
      <div className="text-[9px] uppercase tracking-wide text-[#9CA3AF] font-semibold">
        {label}
      </div>
      <div
        className={cn(
          'text-[16px] font-bold tabular-nums mt-0.5',
          tone === 'green' && 'text-[#1E9A80]',
          tone === 'amber' && 'text-[#F59E0B]',
          tone === 'red' && 'text-[#EF4444]',
          tone === 'default' && 'text-[#1A1A1A]'
        )}
      >
        {display}
      </div>
    </div>
  );
}

export default function SessionFooter({
  campaignId,
  agentId,
}: SessionFooterProps) {
  const session = useDialerSession();
  const { stats, error } = useSessionStats();
  const { agent, talkRatioPercent } = useCurrentAgent();
  // useMyDialerQueue gives leads-left (queue length, no slice cap).
  const { items: queueRows, loading: queueLoading, error: queueError } =
    useMyDialerQueue(campaignId, agentId, 1000);

  const sessionStarted = !!session.startedAt;

  return (
    <div
      className="bg-[#F3F3EE]/50 border border-[#E5E7EB] rounded-2xl p-3"
      data-testid="session-footer"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <Cell
          label="Leads left"
          value={queueLoading ? null : queueRows.length}
          unavailable={!!queueError}
          tone="default"
        />
        <Cell
          label="Done"
          value={sessionStarted ? stats?.done ?? null : 0}
          unavailable={!!error}
          tone="default"
        />
        <Cell
          label="Connected"
          value={sessionStarted ? stats?.connected ?? null : 0}
          unavailable={!!error}
          tone="green"
        />
        <Cell
          label="Voicemail"
          value={sessionStarted ? stats?.voicemail ?? null : 0}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="No answer"
          value={sessionStarted ? stats?.noAnswer ?? null : 0}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="Busy"
          value={sessionStarted ? stats?.busy ?? null : 0}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="Failed"
          value={sessionStarted ? stats?.failed ?? null : 0}
          unavailable={!!error}
          tone="red"
        />
      </div>
      <div className="mt-2 px-1 text-[11px] text-[#6B7280] flex items-center gap-3">
        <span>
          Today:{' '}
          <span className="font-semibold tabular-nums text-[#1A1A1A]">
            {agent?.callsToday ?? 0}
          </span>{' '}
          calls
        </span>
        <span className="opacity-50">·</span>
        <span>
          Talk{' '}
          <span className="font-semibold tabular-nums text-[#1A1A1A]">
            {agent ? `${Math.round(talkRatioPercent)}%` : '—'}
          </span>
        </span>
        {!sessionStarted && (
          <span className="ml-auto italic">Session counters start on first dial.</span>
        )}
      </div>
    </div>
  );
}
