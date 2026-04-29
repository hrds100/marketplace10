// CoachPane — dedicated streaming view for live coach events.
// Subscribes to wk_live_coach_events (status='final') for the active
// call_id and renders the most recent N as fade-in cards. Distinct from
// the unified TimelinePane (which mixes coach + transcript + sms +
// activity); CoachPane gives the AI suggestions their own visual track.

import { useEffect, useState } from 'react';
import { Bot, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CoachEvent {
  id: string;
  callId: string;
  kind: string;
  title: string | null;
  body: string;
  ts: string;
}

interface Row {
  id: string;
  call_id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  ts: string | null;
  status: string | null;
}

const KIND_ICON: Record<string, typeof Bot> = {
  objection: AlertTriangle,
  suggestion: Sparkles,
  question: HelpCircle,
  warning: AlertTriangle,
};

const KIND_TINT: Record<string, string> = {
  objection: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
  suggestion: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
  question: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  warning: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
};

export default function CoachPane({ callId }: { callId: string | null }) {
  const [events, setEvents] = useState<CoachEvent[]>([]);

  useEffect(() => {
    if (!callId) {
      setEvents([]);
      return;
    }
    let cancelled = false;

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('wk_live_coach_events' as any) as any)
        .select('id, call_id, kind, title, body, ts, status')
        .eq('call_id', callId)
        .eq('status', 'final')
        .order('ts', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setEvents(
        ((data ?? []) as Row[]).map((r) => ({
          id: r.id,
          callId: r.call_id,
          kind: r.kind ?? 'suggestion',
          title: r.title,
          body: r.body ?? '',
          ts: r.ts ?? new Date().toISOString(),
        }))
      );
    })();

    const ch = supabase
      .channel(`caller-coach-pane-${callId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wk_live_coach_events',
          filter: `call_id=eq.${callId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const r = payload.new as Row | undefined;
          if (!r || r.status !== 'final') return;
          setEvents((prev) =>
            prev.some((e) => e.id === r.id)
              ? prev
              : [
                  {
                    id: r.id,
                    callId: r.call_id,
                    kind: r.kind ?? 'suggestion',
                    title: r.title,
                    body: r.body ?? '',
                    ts: r.ts ?? new Date().toISOString(),
                  },
                  ...prev,
                ].slice(0, 20)
          );
        }
      )
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wk_live_coach_events',
          filter: `call_id=eq.${callId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const r = payload.new as Row | undefined;
          if (!r || r.status !== 'final') return;
          setEvents((prev) => {
            const existing = prev.find((e) => e.id === r.id);
            if (existing) {
              return prev.map((e) =>
                e.id === r.id ? { ...e, body: r.body ?? '', title: r.title, kind: r.kind ?? e.kind } : e
              );
            }
            return [
              {
                id: r.id,
                callId: r.call_id,
                kind: r.kind ?? 'suggestion',
                title: r.title,
                body: r.body ?? '',
                ts: r.ts ?? new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { void supabase.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [callId]);

  return (
    <div
      data-feature="CALLER__COACH_PANE"
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] uppercase tracking-wide text-[#9CA3AF] font-semibold inline-flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[#7C3AED]" />
          Live coach
        </div>
        <div className="text-[10px] text-[#9CA3AF] tabular-nums">{events.length}</div>
      </div>
      {events.length === 0 && (
        <div className="text-[12px] text-[#9CA3AF] italic py-6 text-center">
          Waiting for coach suggestions…
        </div>
      )}
      <ul className="flex-1 overflow-y-auto space-y-2">
        {events.map((e) => {
          const Icon = KIND_ICON[e.kind] ?? Bot;
          const tint = KIND_TINT[e.kind] ?? 'bg-white text-[#1A1A1A] border-[#E5E7EB]';
          return (
            <li
              key={e.id}
              className={`border rounded-[10px] px-3 py-2 text-[12px] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 ${tint}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-wide font-bold">
                  {e.title ?? e.kind}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words">{e.body}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
