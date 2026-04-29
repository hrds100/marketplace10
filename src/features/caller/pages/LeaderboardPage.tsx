// LeaderboardPage — Phase 5 today's leaderboard.
// Aggregates today's wk_calls per agent and joins profiles for the
// display name. Skeleton: calls + answered counts only — avg duration
// + spend + msg count land alongside the Reports refresh.

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  agentId: string;
  name: string;
  calls: number;
  answered: number;
}

const ANSWERED = new Set(['completed', 'in_progress', 'voicemail']);

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const iso = today.toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callsRes = await (supabase.from('wk_calls' as any) as any)
        .select('agent_id, status')
        .gte('started_at', iso);
      if (cancelled) return;
      if (callsRes.error) {
        setError(callsRes.error.message);
        setLoading(false);
        return;
      }
      const calls = (callsRes.data ?? []) as { agent_id: string; status: string }[];
      const map = new Map<string, { calls: number; answered: number }>();
      for (const c of calls) {
        const r = map.get(c.agent_id) ?? { calls: 0, answered: 0 };
        r.calls += 1;
        if (ANSWERED.has(c.status)) r.answered += 1;
        map.set(c.agent_id, r);
      }
      const ids = Array.from(map.keys());
      let names = new Map<string, string>();
      if (ids.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profs } = await (supabase.from('profiles' as any) as any)
          .select('id, name, email')
          .in('id', ids);
        for (const p of (profs ?? []) as { id: string; name: string | null; email: string | null }[]) {
          names.set(p.id, p.name ?? p.email ?? p.id.slice(0, 8));
        }
      }
      setRows(
        Array.from(map.entries())
          .map(([agentId, v]) => ({
            agentId,
            name: names.get(agentId) ?? agentId.slice(0, 8),
            calls: v.calls,
            answered: v.answered,
          }))
          .sort((a, b) => b.answered - a.answered || b.calls - a.calls)
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight inline-flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#F59E0B]" />
          Leaderboard
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">Today, across all agents.</p>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && rows.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
            Loading…
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
            No activity yet today.
          </div>
        )}
        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold w-10">#</th>
              <th className="text-left px-4 py-2 font-semibold">Agent</th>
              <th className="text-right px-4 py-2 font-semibold">Calls</th>
              <th className="text-right px-4 py-2 font-semibold">Answered</th>
              <th className="text-right px-4 py-2 font-semibold">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {rows.map((r, i) => (
              <tr key={r.agentId}>
                <td className="px-4 py-2 text-[12px] text-[#9CA3AF] tabular-nums">
                  {i + 1}
                </td>
                <td className="px-4 py-2 font-semibold text-[#1A1A1A]">{r.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.calls}</td>
                <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#1E9A80]">
                  {r.answered}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">
                  {r.calls > 0 ? `${Math.round((r.answered / r.calls) * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
