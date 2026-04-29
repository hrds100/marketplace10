// crm-v2 SessionStats — live counts at the TOP of the overview page.
//
// Hugo Rule 13: every cell renders server truth or `—`. Never a fake
// zero.

import { cn } from '@/lib/utils';
import { useDialer } from '../../state/DialerProvider';
import { useSessionStats } from '../../hooks/useSessionStats';
import { useAgentToday } from '../../hooks/useAgentToday';

export interface SessionStatsProps {
  agentId: string | null;
  /** Cached queue length so "Leads left" doesn't double-fetch. */
  leadsLeft: number | null;
  /** True if the source query failed; the cell renders `—`. */
  leadsLeftError?: boolean;
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

export default function SessionStats({
  agentId,
  leadsLeft,
  leadsLeftError,
}: SessionStatsProps) {
  const { session } = useDialer();
  const { stats, error, ready } = useSessionStats({
    agentId,
    sessionStartedAt: session.startedAt,
  });
  const { stats: today } = useAgentToday(agentId);

  const sessionStarted = !!session.startedAt;
  const cellValue = (n: number) =>
    !sessionStarted ? 0 : ready && !error ? n : null;

  return (
    <div
      className="bg-[#F3F3EE]/60 border border-[#E5E7EB] rounded-2xl p-3"
      data-testid="session-stats"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <Cell
          label="Leads left"
          value={leadsLeft}
          unavailable={!!leadsLeftError}
        />
        <Cell label="Done" value={cellValue(stats.done)} unavailable={!!error} />
        <Cell
          label="Connected"
          value={cellValue(stats.connected)}
          unavailable={!!error}
          tone="green"
        />
        <Cell
          label="Voicemail"
          value={cellValue(stats.voicemail)}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="No answer"
          value={cellValue(stats.noAnswer)}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="Busy"
          value={cellValue(stats.busy)}
          unavailable={!!error}
          tone="amber"
        />
        <Cell
          label="Failed"
          value={cellValue(stats.failed)}
          unavailable={!!error}
          tone="red"
        />
      </div>
      <div className="mt-2 px-1 text-[11px] text-[#6B7280] flex items-center gap-3">
        <span>
          Today:{' '}
          <span className="font-semibold tabular-nums text-[#1A1A1A]">
            {today.callsToday}
          </span>{' '}
          calls
        </span>
        <span className="opacity-50">·</span>
        <span>
          Talk{' '}
          <span className="font-semibold tabular-nums text-[#1A1A1A]">
            {today.callsToday > 0 ? `${today.talkRatioPercent}%` : '—'}
          </span>
        </span>
        {!sessionStarted && (
          <span className="ml-auto italic">Session counters start on first dial.</span>
        )}
      </div>
    </div>
  );
}
