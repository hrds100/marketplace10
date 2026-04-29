// CallsPage — Phase 4 call history.
// Lists the most recent wk_calls for the agent (or all calls if admin).
// Click-through goes to /caller/calls/:callId (PastCallScreen).
//
// Phase 4 skeleton:
//   - no recording playback inline (see PastCallScreen → Phase 5)
//   - no AI summary preview
//   - no advanced filters (agent / status / date range) — basic limit only
//   - no export

import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCalls } from '../hooks/useCalls';

export default function CallsPage() {
  const { user, isAdmin } = useAuth();
  const { calls, loading, error } = useCalls({
    agentId: !isAdmin && user ? user.id : null,
    limit: 200,
  });

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-4">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] tracking-tight">
          Call history
        </h1>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          {isAdmin ? 'All agents' : 'Your calls'} · most recent first
        </p>
      </div>

      {error && (
        <div className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-[8px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        {loading && calls.length === 0 && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            Loading calls…
          </div>
        )}

        {!loading && calls.length === 0 && !error && (
          <div className="text-[12px] text-[#9CA3AF] italic py-8 text-center">
            No calls yet.
          </div>
        )}

        <table className="w-full text-[13px]">
          <thead className="bg-[#F3F3EE]/50 text-[10px] uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">When</th>
              <th className="text-left px-4 py-2 font-semibold">Direction</th>
              <th className="text-left px-4 py-2 font-semibold">Status</th>
              <th className="text-right px-4 py-2 font-semibold">Duration</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {calls.map((c) => (
              <tr key={c.id} className="hover:bg-[#F3F3EE]/30">
                <td className="px-4 py-2 tabular-nums text-[12px] text-[#1A1A1A]">
                  {formatStamp(c.startedAt)}
                </td>
                <td className="px-4 py-2 text-[#6B7280] capitalize">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    {c.direction}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[#6B7280]">
                  {c.durationSec ? formatDuration(c.durationSec) : '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/caller/calls/${c.id}`}
                    className="text-[12px] font-semibold text-[#1E9A80] hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tint =
    status === 'completed'
      ? 'bg-[#ECFDF5] text-[#1E9A80]'
      : status === 'missed' || status === 'no_answer'
        ? 'bg-[#FEF3C7] text-[#92400E]'
        : status === 'failed'
          ? 'bg-[#FEF2F2] text-[#B91C1C]'
          : 'bg-[#F3F3EE] text-[#6B7280]';
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${tint}`}
    >
      {status}
    </span>
  );
}

function formatStamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
