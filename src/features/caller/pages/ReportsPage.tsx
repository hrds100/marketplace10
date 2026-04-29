// ReportsPage — Phase 5 reports.
// Skeleton: 7-day rolling totals (calls / outbound msgs / spend). Charts
// + per-campaign breakdown + per-agent ROI land in a follow-up.

import { useEffect, useState } from 'react';
import { Phone, MessageSquare, PoundSterling } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ReportsPage() {
  const [calls, setCalls] = useState(0);
  const [msgs, setMsgs] = useState(0);
  const [spend, setSpend] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [callsRes, msgsRes, spendRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_calls' as any) as any)
          .select('id', { count: 'exact', head: true })
          .gte('started_at', cutoff),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_sms_messages' as any) as any)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', cutoff)
          .eq('direction', 'outbound'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('wk_voice_call_costs' as any) as any)
          .select('total_pence')
          .gte('created_at', cutoff),
      ]);
      if (cancelled) return;
      if (callsRes.error) {
        setError(callsRes.error.message);
        setLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCalls(((callsRes as any).count ?? 0) as number);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMsgs(((msgsRes as any).count ?? 0) as number);
      const total = ((spendRes.data ?? []) as { total_pence: number }[]).reduce(
        (acc, r) => acc + (r.total_pence ?? 0),
        0
      );
      setSpend(total);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">Reports</h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">Last 7 days, all agents.</p>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi icon={Phone} label="Calls (7d)" value={loading ? '…' : `${calls}`} />
        <Kpi icon={MessageSquare} label="Outbound msgs (7d)" value={loading ? '…' : `${msgs}`} />
        <Kpi icon={PoundSterling} label="Spend (7d)" value={loading ? '…' : formatPence(spend)} />
      </div>

      <div className="text-[11px] text-[#9CA3AF] italic">
        Time-series charts, campaign-level breakdown, and answer-rate distributions
        ship in a follow-up PR.
      </div>
    </div>
  );
}

function Kpi({
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
