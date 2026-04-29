// crm-v2 InCallHeader — top bar of the InCallRoom.
//
// State badge (Dialing / Ringing / Connected / wrap-up reason) +
// contact name + phone + mute toggle + minimise + close.

import { useEffect, useState } from 'react';
import { Mic, MicOff, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialer } from '../state/DialerProvider';

interface BadgeInfo {
  label: string;
  tone: 'info' | 'warn' | 'green' | 'red' | 'gray';
  pulse: boolean;
}

function badgeFor(callPhase: string, reason: string, error: { code: number } | null): BadgeInfo {
  if (callPhase === 'dialing')
    return { label: 'Dialing', tone: 'info', pulse: true };
  if (callPhase === 'ringing')
    return { label: 'Ringing', tone: 'info', pulse: true };
  if (callPhase === 'in_call')
    return { label: 'Connected', tone: 'green', pulse: true };
  if (callPhase === 'stopped_waiting_outcome' || callPhase === 'error_waiting_outcome') {
    if (error) return { label: `Error ${error.code || ''}`.trim(), tone: 'red', pulse: false };
    if (reason === 'busy') return { label: 'Busy', tone: 'red', pulse: false };
    if (reason === 'no_answer') return { label: 'No answer', tone: 'warn', pulse: false };
    if (reason === 'voicemail') return { label: 'Voicemail', tone: 'warn', pulse: false };
    if (reason === 'failed' || reason === 'unreachable')
      return { label: 'Failed', tone: 'red', pulse: false };
    return { label: 'Wrap up', tone: 'gray', pulse: false };
  }
  if (callPhase === 'outcome_submitting')
    return { label: 'Saving outcome…', tone: 'info', pulse: true };
  if (callPhase === 'outcome_done')
    return { label: 'Outcome saved', tone: 'green', pulse: false };
  return { label: 'Idle', tone: 'gray', pulse: false };
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function InCallHeader() {
  const { callPhase, call, reason, error, muted, toggleMute, minimiseRoom, closeCallRoom } =
    useDialer();
  const badge = badgeFor(callPhase, reason, error);
  const isLive = callPhase === 'dialing' || callPhase === 'ringing' || callPhase === 'in_call';
  const showClose = !isLive;

  // 1Hz tick for the duration display while connected.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (callPhase !== 'in_call') return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [callPhase]);

  const elapsed =
    callPhase === 'in_call' && call ? formatDuration(Date.now() - call.startedAt) : null;

  return (
    <header
      className="bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-4"
      data-testid="incall-header"
    >
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wide',
          badge.tone === 'green' && 'bg-[#ECFDF5] text-[#1E9A80]',
          badge.tone === 'info' && 'bg-[#DBEAFE] text-[#1D4ED8]',
          badge.tone === 'warn' && 'bg-[#FEF3C7] text-[#B45309]',
          badge.tone === 'red' && 'bg-[#FEE2E2] text-[#B91C1C]',
          badge.tone === 'gray' && 'bg-[#F3F4F6] text-[#6B7280]'
        )}
        data-testid="incall-badge"
      >
        {badge.pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
        {badge.label}
        {elapsed && <span className="tabular-nums opacity-80 ml-1">{elapsed}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#1A1A1A] truncate">
          {call?.contactName ?? '—'}
        </div>
        <div className="text-[11px] text-[#6B7280] tabular-nums truncate">
          {call?.phone ?? ''}
        </div>
      </div>

      {callPhase === 'in_call' && (
        <button
          onClick={toggleMute}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium border',
            muted
              ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]'
              : 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:bg-[#F3F3EE]'
          )}
          data-testid="incall-mute"
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
      )}

      <button
        onClick={minimiseRoom}
        className="p-2 rounded-[8px] text-[#6B7280] hover:bg-[#F3F3EE]"
        title="Minimise"
        data-testid="incall-minimise"
      >
        <Minimize2 className="w-4 h-4" />
      </button>

      {showClose && (
        <button
          onClick={closeCallRoom}
          className="p-2 rounded-[8px] text-[#6B7280] hover:bg-[#F3F3EE]"
          title="Close"
          data-testid="incall-close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </header>
  );
}
