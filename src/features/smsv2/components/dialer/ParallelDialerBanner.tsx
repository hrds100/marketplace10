// ParallelDialerBanner — dark, compact, full-width banner showing every
// ringing leg of the parallel dialer. Sits at the top of /crm/dialer.
//
// PR 119 (Hugo 2026-04-28): Hugo's brief was "3 lines together, all on
// the top black banner with timing, three next, and non-answers go to
// No pickup column". This is the banner half. The "Next 3" panel and
// the No-pickup routing live in DialerPage + the strike-losers RPC.
//
// Visual: black background, white text, one tile per active leg (max
// 5 because the dialer caps lines at 5). Each tile shows L#, masked
// phone, status badge, ticking elapsed-seconds, and a hang-up button.
// When there are no active legs the banner renders nothing — the page
// already shows "Press Start" elsewhere.

import { useEffect, useState } from 'react';
import { Phone, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveDialerLegs, type DialerLegStatus } from '../../hooks/useActiveDialerLegs';
import { useRingbackTone } from '../../hooks/useRingbackTone';
import { supabase } from '@/integrations/supabase/client';
import { useSmsV2 } from '../../store/SmsV2Store';

const STATUS_LABEL: Record<DialerLegStatus, string> = {
  queued: 'Dialing',
  ringing: 'Ringing',
  in_progress: 'Connected',
  completed: 'Done',
  busy: 'Busy',
  no_answer: 'No answer',
  failed: 'Failed',
  canceled: 'Cancelled',
  missed: 'Missed',
  voicemail: 'Voicemail',
};

const STATUS_DOT: Record<DialerLegStatus, string> = {
  queued: 'bg-[#3B82F6]',
  ringing: 'bg-[#F59E0B]',
  in_progress: 'bg-[#10B981]',
  completed: 'bg-[#9CA3AF]',
  busy: 'bg-[#EF4444]',
  no_answer: 'bg-[#EF4444]',
  failed: 'bg-[#EF4444]',
  canceled: 'bg-[#6B7280]',
  missed: 'bg-[#EF4444]',
  voicemail: 'bg-[#9CA3AF]',
};

export default function ParallelDialerBanner() {
  const { legs } = useActiveDialerLegs();
  const { pushToast } = useSmsV2();
  const [hangingUp, setHangingUp] = useState<string | null>(null);

  // 1Hz tick so elapsed seconds refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (legs.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [legs.length]);

  // PR 120 (Hugo 2026-04-28): synthetic UK ringback tone while at least
  // one leg is still ringing. Stops the moment any leg connects (real
  // call audio takes over) or all legs end. Browser autoplay policy is
  // satisfied because the agent clicked Start moments earlier — that
  // gesture lets the AudioContext run.
  const isRinging =
    legs.length > 0 &&
    legs.every((l) => l.status === 'queued' || l.status === 'ringing');
  useRingbackTone(isRinging);

  if (legs.length === 0) return null;

  const hangUp = async (callId: string) => {
    setHangingUp(callId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.functions as any).invoke('wk-dialer-hangup-leg', {
        body: { call_id: callId },
      });
      if (error || data?.error) {
        pushToast(
          `Hang up failed: ${error?.message ?? data?.error ?? 'unknown'}`,
          'error'
        );
      } else {
        pushToast('Leg cancelled', 'success');
      }
    } catch (e) {
      pushToast(
        `Hang up crashed: ${e instanceof Error ? e.message : 'unknown'}`,
        'error'
      );
    } finally {
      setHangingUp(null);
    }
  };

  return (
    <div className="bg-[#0A0A0A] text-white rounded-2xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <div className="flex items-center gap-2 mb-2.5">
        <PhoneCall className="w-4 h-4 text-[#1E9A80]" />
        <span className="text-[12px] font-semibold tracking-wide">
          Calling {legs.length} {legs.length === 1 ? 'line' : 'lines'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#1E9A80] animate-pulse" />
        <span className="text-[11px] text-[#9CA3AF] ml-auto">
          first answer wins · others auto-hang
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {legs.map((leg, idx) => {
          const elapsed = Math.max(0, Math.floor((Date.now() - leg.startedAt) / 1000));
          const mm = Math.floor(elapsed / 60);
          const ss = (elapsed % 60).toString().padStart(2, '0');
          return (
            <div
              key={leg.id}
              className="bg-[#1F1F1F] border border-[#2A2A2A] rounded-xl px-3 py-2 flex items-center gap-2"
            >
              <span className="w-7 h-7 rounded-lg bg-[#0A0A0A] text-[10px] font-bold text-[#9CA3AF] flex items-center justify-center flex-shrink-0">
                L{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold tabular-nums truncate">
                  {leg.phone || '—'}
                </div>
                <div className="text-[10px] text-[#9CA3AF] flex items-center gap-1.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[leg.status])} />
                  {STATUS_LABEL[leg.status]}
                  <span className="text-[#6B7280] tabular-nums">
                    · {mm}:{ss}
                  </span>
                </div>
              </div>
              <button
                title="Hang up this leg"
                disabled={hangingUp === leg.id}
                onClick={() => void hangUp(leg.id)}
                data-testid={`dialer-banner-hangup-${leg.id}`}
                className="p-1 text-[#EF4444] hover:bg-[#2A2A2A] rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone className="w-3 h-3 rotate-[135deg]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
