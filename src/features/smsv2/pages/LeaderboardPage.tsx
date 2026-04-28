// LeaderboardPage — daily agent leaderboard.
//
// Hugo 2026-04-28 (PR 107): "I want to see who's pulling their weight
// today." Source data:
//   - useReports('today').leaderboard → calls + answered + spend per agent.
//   - inline wk_sms_messages count (outbound, today, grouped by created_by)
//     for messagesSent — kept inline to avoid breaking the AgentLeaderRow
//     contract that other surfaces rely on.
//
// Sort: calls picked up (answered) DESC by default. The signed-in agent's
// own row is highlighted in green so they can see where they stand.

import { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useReports } from '../hooks/useReports';
import { useCurrentAgent } from '../hooks/useCurrentAgent';
import { formatDuration, formatPence } from '../data/helpers';

interface MessageRow {
  created_by: string | null;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function LeaderboardPage() {
  const reports = useReports('today');
  const { agent: me } = useCurrentAgent();
  const [messagesByAgent, setMessagesByAgent] = useState<Map<string, number>>(
    new Map()
  );

  // Inline message count — refreshes with the same 60s cadence as useReports.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('wk_sms_messages' as any) as any)
          .select('created_by')
          .eq('direction', 'outbound')
          .gte('created_at', startOfTodayIso());
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const r of (data ?? []) as MessageRow[]) {
          if (!r.created_by) continue;
          map.set(r.created_by, (map.get(r.created_by) ?? 0) + 1);
        }
        setMessagesByAgent(map);
      } catch {
        /* RLS — leaderboard renders with 0 messages, not a crash. */
      }
    };
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const rows = useMemo(() => {
    return [...reports.leaderboard]
      .map((r) => ({
        ...r,
        messagesSent: messagesByAgent.get(r.agentId) ?? 0,
      }))
      .sort((a, b) => b.answered - a.answered);
  }, [reports.leaderboard, messagesByAgent]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#1E9A80]" /> Leaderboard
          </h1>
          <p className="text-[13px] text-[#6B7280]">
            Today · ranked by calls picked up
          </p>
        </div>
      </header>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold w-10">#</th>
              <th className="text-left px-3 py-2.5 font-semibold">Agent</th>
              <th className="text-right px-3 py-2.5 font-semibold">Calls made</th>
              <th className="text-right px-3 py-2.5 font-semibold">Picked up</th>
              <th className="text-right px-3 py-2.5 font-semibold">Messages</th>
              <th className="text-right px-3 py-2.5 font-semibold">Avg duration</th>
              <th className="text-right px-3 py-2.5 font-semibold">Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.map((r, i) => {
              const isMe = me?.id === r.agentId;
              const initials = (r.agentName || '?')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              return (
                <tr
                  key={r.agentId}
                  className={cn(
                    'hover:bg-[#F3F3EE]/30 transition-colors',
                    isMe && 'bg-[#ECFDF5] hover:bg-[#ECFDF5]'
                  )}
                  data-testid={`leaderboard-row-${r.agentId}`}
                >
                  <td className="px-3 py-2.5 text-[#9CA3AF] tabular-nums font-semibold">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0',
                          isMe
                            ? 'bg-[#1E9A80] text-white'
                            : 'bg-[#1E9A80]/15 text-[#1E9A80]'
                        )}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1A1A1A]">
                          {r.agentName}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-wide font-semibold text-[#1E9A80]">
                              you
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.calls}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[#1E9A80]">
                    {r.answered}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.messagesSent}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#6B7280]">
                    {r.avgDurationSec > 0 ? formatDuration(r.avgDurationSec) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#6B7280]">
                    {formatPence(r.spendPence)}
                  </td>
                </tr>
              );
            })}
            {!reports.loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[#9CA3AF] italic"
                >
                  No activity today yet.
                </td>
              </tr>
            )}
            {reports.loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[#9CA3AF] italic"
                >
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
