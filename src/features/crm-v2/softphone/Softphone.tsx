// crm-v2 Softphone — floating call widget.
//
// States:
//   - closed (default while idle): green pill with phone icon.
//   - open + idle: card with DialPad.
//   - placing (dialing/ringing): collapsed bar with maximise + cancel.
//   - in_call + minimised: collapsed bar with mute + end + maximise.
//   - post_call (wrap-up / outcome_*): amber bar prompting to pick
//     outcome.
//
// When the room is open_full, the softphone is hidden (the room is
// the primary surface). When the agent minimises the room, this bar
// takes over.

import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDialer } from '../state/DialerProvider';
import DialPad from './DialPad';

export default function Softphone() {
  const {
    callPhase,
    roomView,
    call,
    muted,
    toggleMute,
    endCall,
    maximiseRoom,
    startCall,
    session,
  } = useDialer();

  const [open, setOpen] = useState(false);
  // The full InCallRoom owns the live UI when open_full.
  if (roomView === 'open_full') return null;

  const isLive = callPhase === 'dialing' || callPhase === 'ringing' || callPhase === 'in_call';
  const isPostCall =
    callPhase === 'stopped_waiting_outcome' ||
    callPhase === 'error_waiting_outcome' ||
    callPhase === 'outcome_submitting' ||
    callPhase === 'outcome_done';

  // ─── Live: collapsed bar ─────────────────────────────────────────
  if (isLive) {
    const teal = callPhase === 'in_call';
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-[150] flex items-center gap-2 px-3 py-2 rounded-[14px] shadow-[0_8px_28px_rgba(0,0,0,0.18)]',
          teal ? 'bg-[#1E9A80] text-white' : 'bg-[#1A1A1A] text-white'
        )}
        data-testid="softphone-live-bar"
        data-call-phase={callPhase}
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-[12px] font-semibold">
          {callPhase === 'in_call'
            ? 'In call'
            : callPhase === 'ringing'
              ? 'Ringing'
              : 'Calling…'}
        </span>
        <span className="text-[11px] opacity-80 truncate max-w-[140px]">
          {call?.contactName ?? call?.phone ?? ''}
        </span>
        <button
          onClick={maximiseRoom}
          className="p-1 rounded text-white/90 hover:bg-white/10"
          title="Maximise"
          data-testid="softphone-maximise"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        {callPhase === 'in_call' && (
          <button
            onClick={toggleMute}
            className="p-1 rounded text-white/90 hover:bg-white/10"
            title={muted ? 'Unmute' : 'Mute'}
            data-testid="softphone-mute"
          >
            {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          onClick={() => void endCall()}
          className="px-2 py-1 rounded bg-[#EF4444] text-white text-[11px] font-semibold hover:bg-[#DC2626]"
          title="End call"
          data-testid="softphone-end"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ─── Post-call: amber prompt bar ────────────────────────────────
  if (isPostCall) {
    return (
      <div
        className="fixed bottom-4 right-4 z-[150] flex items-center gap-2 px-3 py-2 rounded-[14px] shadow-[0_8px_28px_rgba(0,0,0,0.15)] bg-[#F59E0B] text-white"
        data-testid="softphone-postcall-bar"
      >
        <span className="text-[12px] font-semibold">
          {callPhase === 'outcome_done' ? 'Outcome saved' : 'Pick outcome'}
        </span>
        <span className="text-[11px] opacity-90 truncate max-w-[140px]">
          {call?.contactName ?? ''}
        </span>
        <button
          onClick={maximiseRoom}
          className="p-1 rounded text-white/90 hover:bg-white/10"
          title="Open call room"
          data-testid="softphone-postcall-open"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ─── Idle: launcher / DialPad ────────────────────────────────────
  return (
    <div className="fixed bottom-4 right-4 z-[150]" data-testid="softphone">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#1E9A80] text-white shadow-[0_4px_16px_rgba(30,154,128,0.35)] hover:bg-[#1E9A80]/90"
          data-testid="softphone-launcher"
        >
          <Phone className="w-4 h-4" />
          <span className="text-[12px] font-semibold">Softphone</span>
        </button>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wide text-[#9CA3AF]">
              Softphone
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded text-[#6B7280] hover:bg-[#F3F3EE]"
              data-testid="softphone-close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <DialPad
            onDial={(phone) => {
              void startCall({
                contactId: `manual-${Date.now()}`,
                contactName: phone,
                phone,
                campaignId: session.activeCampaignId,
              });
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
