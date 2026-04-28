// RecentCallsPanel — Hugo 2026-04-28 (PR 132, Bug 5)
//
// "Below the campaign on the dialer, where you see the queue, done,
// connected, below that, you should show the history there as well with
// the option to open calling room — at least I can always go back, click
// it, then go back."
//
// What it does
//   - Lists the agent's last 10 wk_calls rows (any status), ordered by
//     started_at DESC. Refetches on the wk_calls realtime channel scoped
//     to this agent so it ticks live as calls finish.
//   - For each row: contact name + masked phone + status badge + duration
//     (if any) + "Open call room" button.
//   - Click "Open call room" → calls openCallRoom(contactId) on
//     ActiveCallContext (preview mode, no fresh dial).
//   - For ANY row whose status is in ('queued','ringing','in_progress'),
//     a red "Hang up" button calls wk-dialer-hangup-leg directly. This
//     is the always-on escape hatch the agent can reach even if the
//     call-room state is wonky.

import { useEffect, useMemo, useState } from 'react';
import { Clock, ExternalLink, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';
import { useSmsV2 } from '../../store/SmsV2Store';
import { formatDuration, formatRelativeTime } from '../../data/helpers';

interface CallRow {
  id: string;
  contact_id: string | null;
  to_e164: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
}

interface ContactRow {
  id: string;
  name: string;
  phone: string;
}

const ACTIVE_STATUSES = new Set(['queued', 'ringing', 'in_progress']);

interface HangupInvoke {
  invoke: (
    name: string,
    options: { body: Record<string, unknown> }
  ) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

/** Hide all but the last 4 digits of a phone, e.g. +44...8316. */
function maskPhone(phone: string): string {
  if (!phone) return '';
  if (phone.length <= 4) return phone;
  const tail = phone.slice(-4);
  // Keep the country prefix if present.
  if (phone.startsWith('+')) {
    const prefix = phone.slice(0, Math.min(3, phone.length - 4));
    return `${prefix}…${tail}`;
  }
  return `…${tail}`;
}

function statusBadge(status: string): {
  label: string;
  className: string;
} {
  // Map raw wk_calls.status to the human label the agent expects.
  switch (status) {
    case 'completed':
      return {
        label: 'Connected',
        className: 'bg-[#ECFDF5] text-[#1E9A80]',
      };
    case 'in_progress':
      return {
        label: 'Connected',
        className: 'bg-[#ECFDF5] text-[#1E9A80]',
      };
    case 'voicemail':
      return {
        label: 'Voicemail',
        className: 'bg-[#FEF3C7] text-[#B45309]',
      };
    case 'no_answer':
    case 'missed':
      return {
        label: 'Missed',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
    case 'busy':
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-[#FEE2E2] text-[#B91C1C]',
      };
    case 'canceled':
      return {
        label: 'Cancelled',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
    case 'queued':
    case 'ringing':
      return {
        label: 'Ringing',
        className: 'bg-[#DBEAFE] text-[#1D4ED8]',
      };
    default:
      return {
        label: status || '—',
        className: 'bg-[#F3F4F6] text-[#6B7280]',
      };
  }
}

export default function RecentCallsPanel() {
  const { openCallRoom, phase } = useActiveCallCtx();
  const { pushToast } = useSmsV2();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [rows, setRows] = useState<CallRow[]>([]);
  const [contactsById, setContactsById] = useState<Map<string, ContactRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hangingUp, setHangingUp] = useState<Set<string>>(new Set());

  // Resolve agent id once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setAgentId(data.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial fetch + realtime subscription on wk_calls for this agent.
  // We reload on every realtime event — the row count is bounded at 10
  // so cost is negligible.
  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    const reload = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_calls' as any) as any)
        .select('id, contact_id, to_e164, status, started_at, ended_at, duration_sec')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(10);
      if (cancelled) return;
      setRows((data ?? []) as CallRow[]);
      setLoading(false);
    };
    void reload();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`recent-calls:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wk_calls',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          if (!cancelled) void reload();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  }, [agentId]);

  // Resolve contact names for the visible rows.
  useEffect(() => {
    const ids = Array.from(
      new Set(rows.map((r) => r.contact_id).filter((v): v is string => !!v))
    );
    const missing = ids.filter((id) => !contactsById.has(id));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_contacts' as any) as any)
        .select('id, name, phone')
        .in('id', missing);
      if (cancelled || !data) return;
      setContactsById((prev) => {
        const next = new Map(prev);
        for (const row of data as ContactRow[]) next.set(row.id, row);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, contactsById]);

  const items = useMemo(
    () =>
      rows.map((r) => {
        const contact = r.contact_id ? contactsById.get(r.contact_id) : undefined;
        return {
          id: r.id,
          contactId: r.contact_id,
          name: contact?.name ?? 'Unknown contact',
          phone: contact?.phone ?? r.to_e164 ?? '',
          status: r.status,
          startedAt: r.started_at,
          durationSec: r.duration_sec ?? 0,
          isActive: ACTIVE_STATUSES.has(r.status) && r.ended_at === null,
        };
      }),
    [rows, contactsById]
  );

  const onHangup = async (callId: string) => {
    setHangingUp((prev) => new Set(prev).add(callId));
    try {
      const { error } = await (
        supabase.functions as unknown as HangupInvoke
      ).invoke('wk-dialer-hangup-leg', { body: { call_id: callId } });
      if (error) {
        pushToast(`Hang up failed: ${error.message}`, 'error');
      } else {
        pushToast('Leg cancelled', 'info');
      }
    } catch (e) {
      pushToast(
        `Hang up crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setHangingUp((prev) => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
          Recent calls
        </h3>
        <span className="text-[11px] text-[#6B7280]">Last 10</span>
      </div>
      <div className="divide-y divide-[#E5E7EB]" data-testid="recent-calls-panel">
        {items.map((item) => {
          const badge = statusBadge(item.status);
          const isHanging = hangingUp.has(item.id);
          // openCallRoom is a no-op while a call is live; pre-disable
          // the button so the agent gets a tooltip instead of a silent
          // click. Preview is allowed in idle / post_call / inbound modes.
          const previewBlocked = phase !== 'idle' && phase !== 'post_call';
          return (
            <div
              key={item.id}
              className="px-4 py-2.5 hover:bg-[#F3F3EE]/50 flex items-center gap-2"
              data-testid={`recent-call-row-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1A1A1A] truncate flex items-center gap-1.5">
                  {item.name}
                  <span
                    className={cn(
                      'text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded',
                      badge.className
                    )}
                    data-testid={`recent-call-status-${item.id}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="text-[11px] text-[#6B7280] tabular-nums flex items-center gap-2">
                  <span>{maskPhone(item.phone)}</span>
                  {item.durationSec > 0 && (
                    <span className="text-[#9CA3AF]">
                      · {formatDuration(item.durationSec)}
                    </span>
                  )}
                  {item.startedAt && (
                    <span className="text-[#9CA3AF]">
                      · {formatRelativeTime(item.startedAt)}
                    </span>
                  )}
                </div>
              </div>
              {item.contactId && (
                <button
                  onClick={() => openCallRoom(item.contactId!)}
                  disabled={previewBlocked}
                  className={cn(
                    'px-2 py-1.5 rounded text-[11px] font-medium border transition-colors',
                    previewBlocked
                      ? 'border-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                      : 'border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F3F3EE]'
                  )}
                  title={
                    previewBlocked
                      ? 'A call is live — close it before opening another room'
                      : 'Open call room (preview mode)'
                  }
                >
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </span>
                </button>
              )}
              {item.isActive && (
                <button
                  onClick={() => void onHangup(item.id)}
                  disabled={isHanging}
                  className="px-2 py-1.5 rounded text-[11px] font-semibold bg-[#EF4444] hover:bg-[#DC2626] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Force-cancel this leg in Twilio"
                  data-testid={`recent-call-hangup-${item.id}`}
                >
                  <span className="flex items-center gap-1">
                    <PhoneOff className="w-3 h-3" />
                    {isHanging ? 'Cancelling…' : 'Hang up'}
                  </span>
                </button>
              )}
            </div>
          );
        })}
        {!loading && items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            No calls yet today.
          </div>
        )}
        {loading && items.length === 0 && (
          <div className="px-4 py-6 text-center text-[12px] text-[#9CA3AF] italic">
            Loading recent calls…
          </div>
        )}
      </div>
    </div>
  );
}
