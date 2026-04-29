// DashboardPage — Phase 5 admin overview (admin-only via AdminOnlyRoute).
// Phase 5 skeleton: today's call count, today's spend (across all
// agents), and a glance at active campaigns. Detailed analytics ship
// in ReportsPage.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageSquare, PoundSterling, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDialerCampaigns } from '../hooks/useDialerCampaigns';

interface AgentStat {
  agentId: string;
  callsToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AgentStat[]>([]);
  const [smsToday, setSmsToday] = useState(0);
  const [spendToday, setSpendToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const { campaigns } = useDialerCampaigns({ includeInactive: false });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const iso = today.toISOString();

      const [callsRes, smsRes, spendRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_calls' as any) as any)
          .select('agent_id')
          .gte('started_at', iso),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_sms_messages' as any) as any)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', iso)
          .eq('direction', 'outbound'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_voice_call_costs' as any) as any)
          .select('total_pence, created_at')
          .gte('created_at', iso),
      ]);
      if (cancelled) return;

      const agentMap = new Map<string, number>();
      for (const r of (callsRes.data ?? []) as { agent_id: string }[]) {
        agentMap.set(r.agent_id, (agentMap.get(r.agent_id) ?? 0) + 1);
      }
      setStats(
        Array.from(agentMap.entries()).map(([agentId, callsToday]) => ({
          agentId,
          callsToday,
        }))
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSmsToday(((smsRes as any).count ?? 0) as number);
      const total = ((spendRes.data ?? []) as { total_pence: number }[]).reduce(
        (acc, r) => acc + (r.total_pence ?? 0),
        0
      );
      setSpendToday(total);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCalls = stats.reduce((acc, s) => acc + s.callsToday, 0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Dashboard</h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">Today across all agents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard icon={Phone} label="Calls today" value={loading ? '…' : `${totalCalls}`} />
        <KpiCard icon={MessageSquare} label="Outbound msgs today" value={loading ? '…' : `${smsToday}`} />
        <KpiCard icon={PoundSterling} label="Spend today" value={loading ? '…' : formatPence(spendToday)} />
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold mb-3 inline-flex items-center gap-2">
          <Radio className="w-3.5 h-3.5" />
          Active campaigns ({campaigns.length})
        </div>
        {campaigns.length === 0 ? (
          <div className="text-[12px] text-[#9CA3AF] italic">
            No active campaigns. Activate one in Settings.
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {campaigns.map((c) => (
              <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-[#1A1A1A]">{c.name}</span>
                <span className="text-[11px] text-[#6B7280] tabular-nums">
                  {c.pendingLeads} pending · {c.connectedLeads} connected · {c.doneLeads} done
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-[11px] text-[#9CA3AF] italic">
        Per-agent breakdown lives at{' '}
        <Link to="/caller/leaderboard" className="text-[#1E9A80] hover:underline">
          /caller/leaderboard
        </Link>
        . Time-windowed reports land in{' '}
        <Link to="/caller/reports" className="text-[#1E9A80] hover:underline">
          /caller/reports
        </Link>
        .
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-wide text-[#9CA3AF] font-semibold inline-flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-[24px] font-bold text-[#1A1A1A] tabular-nums mt-1">{value}</div>
    </div>
  );
}

function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pounds);
}
