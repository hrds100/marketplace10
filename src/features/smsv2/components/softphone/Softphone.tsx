import { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  MicOff,
  Mic,
  Maximize2,
  Minus,
  X,
  Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DialPad from './DialPad';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import { useSpendLimit } from '../../hooks/useSpendLimit';
import { formatDuration, formatPence } from '../../data/helpers';
import LiveCallScreen from '../live-call/LiveCallScreen';
import { useCurrentAgent } from '../../hooks/useCurrentAgent';
import { useVoiceNumbers } from '../../hooks/useVoiceNumbers';
import {
  getCallerIdPreference,
  setCallerIdPreference,
} from '../../lib/callerIdPreference';

export default function Softphone() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // In-call DTMF keypad (for IVR prompts — "press 1 for…"). 2026-07-07 (Hugo):
  // workers only ever see the collapsed pill, so the keypad has to live here.
  const [showKeypad, setShowKeypad] = useState(false);
  const [dtmf, setDtmf] = useState('');
  const device = useTwilioDevice();
  const {
    phase,
    call,
    durationSec,
    fullScreen,
    setFullScreen,
    startCall,
    endCall,
    muted,
    toggleMute,
    previewContactId,
    isWorker,
    sendDigits,
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

  const sendDtmf = (digit: string) => {
    sendDigits(digit);
    setDtmf((s) => (s + digit).slice(-24));
  };

  // Reset the keypad between calls so it doesn't carry over.
  useEffect(() => {
    if (phase !== 'in_call') { setShowKeypad(false); setDtmf(''); }
  }, [phase]);

  const handleCall = (phone: string) => {
    if (spend.isLimitReached) return;
    void startCall('manual-' + Date.now(), phone, 'Direct dial');
    setOpen(false);
  };

  // Render the live call full-screen overlay if the call is active and
  // full-screen mode is on. PR 10: also render in idle-preview mode so
  // the agent can open the call room layout for a contact from the
  // inbox without dialling.
  if ((phase !== 'idle' || previewContactId !== null) && fullScreen) {
    return <LiveCallScreen />;
  }

  // Placing collapsed bar (calling but not yet answered) — black + ringing
  // dot. Hugo's call (2026-04-26): orange "felt off" for a connecting state.
  if (phase === 'placing' && !fullScreen) {
    return (
      <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[320px] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1A1A1A] text-white flex items-center gap-2">
          <span className="relative w-2 h-2 inline-flex">
            <span className="absolute inset-0 rounded-full bg-white animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-white" />
          </span>
          <span className="text-[13px] font-semibold">Calling…</span>
          {/* 2026-07-06: workers get a simple dialer — no call room. */}
          {!isWorker && (
            <button
              onClick={() => setFullScreen(true)}
              className="ml-auto p-1 hover:bg-white/20 rounded"
              title="Open full call screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
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
  if (phase === 'in_call' && !fullScreen) {
    return (
      <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[320px] overflow-hidden">
        <div className="px-4 py-2.5 bg-[#1E9A80] text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[13px] font-semibold">In call · {formatDuration(durationSec)}</span>
          {!isWorker && (
            <button
              onClick={() => setFullScreen(true)}
              className="ml-auto p-1 hover:bg-white/20 rounded"
              title="Open full call screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="text-[14px] font-semibold text-[#1A1A1A]">{call?.contactName}</div>
          <div className="text-[12px] text-[#6B7280] tabular-nums">{call?.phone}</div>
        </div>

        {/* DTMF keypad — for IVR / automated prompts ("press 1 for…"). */}
        {showKeypad && (
          <div className="px-3 pb-2 border-t border-[#E5E7EB] pt-2">
            <div className="mb-2 h-6 px-2 flex items-center justify-center text-[13px] font-medium text-[#1A1A1A] tabular-nums tracking-widest bg-[#F3F3EE] rounded-[8px]">
              {dtmf || <span className="text-[#9CA3AF] tracking-normal text-[11px]">Press a key to send tones</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  onClick={() => sendDtmf(k)}
                  className="h-9 rounded-[10px] bg-[#F3F3EE] hover:bg-[#1E9A80]/10 hover:text-[#1E9A80] text-base font-medium text-[#1A1A1A] transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-[#E5E7EB] grid grid-cols-3 gap-1">
          <CallBtn
            icon={<Grid3X3 className="w-4 h-4" />}
            label="Keypad"
            onClick={() => { setShowKeypad((v) => !v); if (!showKeypad) setDtmf(''); }}
            active={showKeypad}
          />
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

  // Post-call collapsed (rare — usually full-screen).
  // Guard: only render the orange "Pick outcome" button when there's a real
  // wk_calls.id (UUID) to apply the outcome to. Without it, wk-outcome-apply
  // can't fire and the click would be a no-op + leak fake state.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hasRealCallId = !!call?.callId && UUID_RE.test(call.callId);
  if (phase === 'post_call' && !fullScreen && hasRealCallId) {
    return (
      <button
        onClick={() => setFullScreen(true)}
        className="fixed bottom-5 right-5 z-[120] bg-[#F59E0B] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-[13px] font-semibold"
      >
        <Maximize2 className="w-4 h-4" />
        Pick outcome for {call?.contactName}
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

      <FromNumberSelect />

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

// "Calling from" picker — lets the agent choose which of our voice-enabled
// numbers shows as caller ID. Lives in its own component so the wk_numbers
// fetch only fires when the softphone panel is actually open (also keeps the
// post-call vitest, which renders Softphone closed, network-free). The
// selection persists in localStorage and is read at dial time by
// ActiveCallContext, so calls started from the inbox use it too.
function FromNumberSelect() {
  const { numbers, loading } = useVoiceNumbers();
  const [selected, setSelected] = useState<string>(() => getCallerIdPreference() ?? '');

  if (loading || numbers.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <label className="block text-[10px] font-medium text-[#6B7280] mb-1">
        Calling from
      </label>
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setCallerIdPreference(e.target.value || null);
        }}
        className="w-full px-2 py-1.5 text-[12px] bg-white border border-[#E5E5E5] rounded-[10px] text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#1E9A80]/30 focus:border-[#1E9A80]"
      >
        <option value="">Auto (default number)</option>
        {numbers.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label ? `${n.label} · ${n.e164}` : n.e164}
          </option>
        ))}
      </select>
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
