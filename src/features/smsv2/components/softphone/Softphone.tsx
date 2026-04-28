import { useState } from 'react';
import {
  Phone,
  PhoneOff,
  MicOff,
  Mic,
  Maximize2,
  Minus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DialPad from './DialPad';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import { useSpendLimit } from '../../hooks/useSpendLimit';
import { formatDuration, formatPence } from '../../data/helpers';
// PR 140 (Hugo 2026-04-28): the in-call full-screen overlay is now
// InCallRoom (state-badge-driven shell). LiveCallScreen is retained
// in the codebase only for the existing reducer/context tests; new
// product surfaces render InCallRoom.
import InCallRoom from '../dialer/v2/InCallRoom';
import { useCurrentAgent } from '../../hooks/useCurrentAgent';

export default function Softphone() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const device = useTwilioDevice();
  const {
    phase,
    callPhase,
    call,
    durationSec,
    roomView,
    setFullScreen,
    startCall,
    endCall,
    muted,
    toggleMute,
  } = useActiveCallCtx();
  const spend = useSpendLimit();
  const { agent: me } = useCurrentAgent();

  // Drop recovery now lives inside ActiveCallContext (call.on('disconnect')).
  // The launcher status reflects the unified phase + the Twilio device
  // registration state.
  const launcherStatus =
    phase === 'in_call' || phase === 'placing'
      ? phase === 'in_call' ? 'On call' : 'Calling…'
      : device.status === 'ready'
        ? 'Ready'
        : device.status === 'registering'
          ? 'Connecting…'
          : 'Offline';

  const handleCall = (phone: string) => {
    if (spend.isLimitReached) return;
    void startCall('manual-' + Date.now(), phone, 'Direct dial');
    setOpen(false);
  };

  // PR 138 (Hugo 2026-04-28): roomView is now the single source of
  // truth for "is the live-call overlay visible?". The reducer flips
  // it independently from callPhase, so hang-up no longer closes the
  // room (Rule 6) and minimise/maximise don't end the call (Rule 7).
  if (roomView === 'open_full') {
    return <InCallRoom />;
  }

  // Placing collapsed bar (calling but not yet answered) — black + ringing
  // dot. Hugo's call (2026-04-26): orange "felt off" for a connecting state.
  // PR 138: roomView gates visibility, not the legacy fullScreen boolean.
  if (phase === 'placing' && roomView === 'open_min') {
    return (
      <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[320px] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1A1A1A] text-white flex items-center gap-2">
          <span className="relative w-2 h-2 inline-flex">
            <span className="absolute inset-0 rounded-full bg-white animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-white" />
          </span>
          <span className="text-[13px] font-semibold">Calling…</span>
          <button
            onClick={() => setFullScreen(true)}
            className="ml-auto p-1 hover:bg-white/20 rounded"
            title="Open full call screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="text-[14px] font-semibold text-[#1A1A1A]">{call?.contactName}</div>
          <div className="text-[12px] text-[#6B7280] tabular-nums">{call?.phone}</div>
        </div>
        <div className="px-3 py-2 border-t border-[#E5E7EB]">
          <CallBtn
            icon={<PhoneOff className="w-4 h-4" />}
            label="Cancel"
            onClick={endCall}
            danger
          />
        </div>
      </div>
    );
  }

  // Mid-call collapsed bar
  // PR 138: roomView gates visibility, not the legacy fullScreen boolean.
  if (phase === 'in_call' && roomView === 'open_min') {
    return (
      <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[320px] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1E9A80] text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[13px] font-semibold">In call · {formatDuration(durationSec)}</span>
          <button
            onClick={() => setFullScreen(true)}
            className="ml-auto p-1 hover:bg-white/20 rounded"
            title="Open full call screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="text-[14px] font-semibold text-[#1A1A1A]">{call?.contactName}</div>
          <div className="text-[12px] text-[#6B7280] tabular-nums">{call?.phone}</div>
        </div>
        <div className="px-3 py-2 border-t border-[#E5E7EB] grid grid-cols-2 gap-1">
          {/* PR 110 (Hugo 2026-04-28): Hold + Xfer were rendered with no
              onClick — pure dead UI. PR 89 removed them from
              LiveCallScreen for the same reason. Removed here too. */}
          <CallBtn
            icon={muted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            label={muted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
            active={muted}
          />
          <CallBtn
            icon={<PhoneOff className="w-4 h-4" />}
            label="End"
            onClick={endCall}
            danger
          />
        </div>
      </div>
    );
  }

  // PR 138 (Hugo 2026-04-28): post-call minimised pill. Shows when
  // roomView='open_min' AND we're in any of the post-call sub-phases
  // (stopped_waiting_outcome, error_waiting_outcome, outcome_done).
  // Replaces the old hasRealCallId UUID regex — pill text rules are
  // explicit now: any of those phases means the agent still owes a
  // pick, so the label calls that out by contact name.
  const isPostCallSubPhase =
    callPhase === 'stopped_waiting_outcome' ||
    callPhase === 'error_waiting_outcome' ||
    callPhase === 'outcome_done';
  if (isPostCallSubPhase && roomView === 'open_min') {
    return (
      <button
        onClick={() => setFullScreen(true)}
        className="fixed bottom-5 right-5 z-[120] bg-[#F59E0B] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-[13px] font-semibold"
        data-testid="softphone-postcall-maximize"
      >
        <Maximize2 className="w-4 h-4" />
        {callPhase === 'outcome_done'
          ? `Outcome saved · ${call?.contactName ?? 'caller'}`
          : `Pick outcome for ${call?.contactName ?? 'caller'}`}
      </button>
    );
  }

  // Idle: floating launcher bottom-right
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-5 right-5 z-[120] bg-[#1E9A80] hover:bg-[#1E9A80]/90 text-white w-12 h-12 rounded-full shadow-[0_8px_24px_rgba(30,154,128,0.35)] flex items-center justify-center"
        title="Open softphone"
      >
        <Phone className="w-5 h-5" strokeWidth={2.2} />
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        // PR 132 (Hugo 2026-04-28, Bug 4): expose the Twilio Device status
        // so Playwright can assert readiness ('ready' / 'registering' /
        // 'error' / 'idle') before pressing Start. Used by the dialer
        // page e2e test that verifies the first call rings.
        data-device-status={device.status}
        data-testid="softphone-launcher"
        className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.1)] pl-2 pr-4 py-2 flex items-center gap-2 hover:shadow-[0_6px_24px_rgba(0,0,0,0.12)] transition-all"
      >
        <span className="w-8 h-8 rounded-full bg-[#1E9A80] text-white flex items-center justify-center">
          <Phone className="w-4 h-4" strokeWidth={2.2} />
        </span>
        <div className="text-left">
          <div className="text-[12px] font-semibold text-[#1A1A1A]">Softphone</div>
          <div className="text-[10px] text-[#6B7280]">{launcherStatus}</div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[280px] overflow-hidden">
      <div className="px-3 py-2 bg-[#F3F3EE] border-b border-[#E5E7EB] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
        <span className="text-[12px] font-semibold text-[#1A1A1A]">{me?.name ?? 'Agent'}</span>
        <span className="text-[11px] text-[#6B7280]">· Available</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-[#6B7280] hover:bg-black/[0.05] rounded"
            title="Minimise"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-[#6B7280] hover:bg-black/[0.05] rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PR 109 (Hugo 2026-04-28): hide spend numbers + the limit-reached
          banner from non-admins. The internal spend.isLimitReached gate
          on Start (line 54) still blocks the call — only the display
          changes per role. */}
      {spend.isAdmin && (
        <>
          <div className="px-3 py-2 text-[11px] text-[#6B7280] flex items-center justify-between">
            <span>Spend today</span>
            <span className="tabular-nums font-medium text-[#1A1A1A]">
              {formatPence(spend.spendPence)}
              <span className="text-[#9CA3AF]">
                {' / '}∞
              </span>
            </span>
          </div>

          {spend.isLimitReached && (
            <div className="mx-3 mb-2 p-2 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-[11px] text-[#B91C1C]">
              Daily limit reached. Ask admin to raise.
            </div>
          )}
        </>
      )}

      <div className="px-3 pb-3">
        <DialPad onCall={handleCall} />
      </div>

      <div className="px-3 py-2 border-t border-[#E5E7EB] text-[10px] text-[#9CA3AF] space-y-0.5">
        <div className="flex justify-between">
          <span>Mic</span>
          <span className="text-[#6B7280]">Built-in microphone</span>
        </div>
        <div className="flex justify-between">
          <span>Output</span>
          <span className="text-[#6B7280]">Headphones</span>
        </div>
      </div>
    </div>
  );
}

function CallBtn({
  icon,
  label,
  onClick,
  danger,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
        active && 'bg-[#1E9A80] text-white',
        !active && danger && 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FCA5A5]/40',
        !active && !danger && 'text-[#6B7280] hover:bg-[#F3F3EE]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
