import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff, SkipForward, Pause as PauseIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DialerPhase } from '../types';

interface Props {
  phase: DialerPhase;
  isMuted: boolean;
  isOnHold: boolean;
  startedAt: number | null;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onHangUp: () => void;
  onSkip: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DialControlsPro({
  phase,
  isMuted,
  isOnHold,
  startedAt,
  onMuteToggle,
  onHoldToggle,
  onHangUp,
  onSkip,
}: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || phase !== 'connected') { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, phase]);

  const isLive = phase === 'dialing' || phase === 'ringing' || phase === 'connected';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onMuteToggle}
        disabled={phase !== 'connected'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          isMuted
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-white text-[#6B7280] hover:bg-black/[0.04] border border-[#E5E7EB]',
          phase !== 'connected' && 'opacity-40 pointer-events-none'
        )}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {isMuted ? 'Unmute' : 'Mute'}
      </button>

      <button
        onClick={onHoldToggle}
        disabled={phase !== 'connected'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          isOnHold
            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            : 'bg-white text-[#6B7280] hover:bg-black/[0.04] border border-[#E5E7EB]',
          phase !== 'connected' && 'opacity-40 pointer-events-none'
        )}
      >
        <PauseIcon className="w-4 h-4" />
        {isOnHold ? 'Resume' : 'Hold'}
      </button>

      <button
        onClick={onHangUp}
        disabled={!isLive}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors',
          !isLive && 'opacity-40 pointer-events-none'
        )}
      >
        <PhoneOff className="w-4 h-4" />
        Hang up
      </button>

      <button
        onClick={onSkip}
        disabled={phase !== 'wrap_up'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-[#6B7280] hover:bg-black/[0.04] border border-[#E5E7EB] transition-colors',
          phase !== 'wrap_up' && 'opacity-40 pointer-events-none'
        )}
      >
        <SkipForward className="w-4 h-4" />
        Skip
      </button>

      {phase === 'connected' && (
        <span className="ml-2 text-sm font-mono text-[#1A1A1A] tabular-nums">
          {formatTimer(elapsed)}
        </span>
      )}
    </div>
  );
}
