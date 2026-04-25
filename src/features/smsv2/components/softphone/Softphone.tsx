import { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  MicOff,
  Mic,
  Pause,
  PhoneForwarded,
  Maximize2,
  Minus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DialPad from './DialPad';
import { useActiveCallCtx } from '../live-call/ActiveCallContext';
import { useTwilioDevice } from '../../hooks/useTwilioDevice';
import { useSpendLimit } from '../../hooks/useSpendLimit';
import { useSmsV2 } from '../../store/SmsV2Store';
import { formatDuration, formatPence } from '../../data/helpers';
import LiveCallScreen from '../live-call/LiveCallScreen';
import { CURRENT_AGENT } from '../../data/mockAgents';

export default function Softphone() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const device = useTwilioDevice();
  const { phase, call, durationSec, fullScreen, setFullScreen, startCall, endCall } =
    useActiveCallCtx();
  const spend = useSpendLimit();
  const store = useSmsV2();

  // Bridge: UI call state machine ↔ Twilio Voice SDK.
  //
  // - The context's `startCall` sets `phase='in_call'` + a fresh `startedAt`.
  //   We watch `startedAt` and kick the SDK dial on every new session, so all
  //   call origins (manual dial pad, dialer "Call Now", auto-advance after
  //   outcome) place a real Twilio leg.
  // - When the UI leaves `in_call` (End button, post-call screen, queue
  //   exhausted), we hang up the SDK leg.
  // - When the SDK leg disconnects on its own (callee hangs up, network drop)
  //   we trigger `endCall()` so the post-call outcome panel appears.
  const lastDialedForRef = useRef<number | null>(null);
  const sdkActiveRef = useRef(false);

  useEffect(() => {
    // (1) Outbound dial: phase entered in_call with a brand-new session.
    if (
      phase === 'in_call' &&
      call &&
      call.phone &&
      device.status === 'ready' &&
      lastDialedForRef.current !== call.startedAt
    ) {
      lastDialedForRef.current = call.startedAt;
      void device.dial(call.phone).catch((e) => {
        const msg = e instanceof Error ? e.message : 'unknown error';
        store.pushToast(`Dial failed: ${msg}`, 'error');
        lastDialedForRef.current = null;
        // Bail back to post_call so the agent can pick "no pickup" or skip.
        endCall();
      });
    }
    // (2) UI ended the call — drop the SDK leg.
    if (phase !== 'in_call' && device.activeCall) {
      device.hangup();
    }
    // (3) Reset dial marker on full idle so a redial of the same number works.
    if (phase === 'idle') {
      lastDialedForRef.current = null;
    }
  }, [phase, call, device.status, device.activeCall, device.dial, device.hangup, endCall, store]);

  // Natural-end detection: SDK call went non-null → null while UI still says
  // in_call. That means the far end disconnected; flip UI to post_call.
  useEffect(() => {
    const isActive = device.activeCall !== null;
    if (sdkActiveRef.current && !isActive && phase === 'in_call') {
      endCall();
    }
    sdkActiveRef.current = isActive;
  }, [device.activeCall, phase, endCall]);

  const handleCall = (phone: string) => {
    if (spend.isLimitReached) return;
    if (device.status !== 'ready') {
      store.pushToast(
        device.status === 'error'
          ? `Softphone error: ${device.error ?? 'unknown'}`
          : 'Softphone is still connecting — try again in a moment.',
        'error'
      );
      return;
    }
    // Trigger the SDK via the context state change; the bridge effect above
    // picks up the new `call.startedAt` and calls `device.dial(phone)`.
    startCall('manual-' + Date.now(), phone, 'Direct dial');
    setOpen(false);
  };

  // Render the live call full-screen overlay if the call is active and full-screen mode is on
  if (phase !== 'idle' && fullScreen) {
    return <LiveCallScreen />;
  }

  // Mid-call collapsed bar
  if (phase === 'in_call' && !fullScreen) {
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
        <div className="px-3 py-2 border-t border-[#E5E7EB] grid grid-cols-4 gap-1">
          <CallBtn icon={<MicOff className="w-4 h-4" />} label="Mute" />
          <CallBtn icon={<Pause className="w-4 h-4" />} label="Hold" />
          <CallBtn icon={<PhoneForwarded className="w-4 h-4" />} label="Xfer" />
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

  // Post-call collapsed (rare — usually full-screen)
  if (phase === 'post_call' && !fullScreen) {
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
          <div className="text-[10px] text-[#6B7280]">
            {device.status === 'ready' ? 'Connected' : 'Offline'}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[120] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-[280px] overflow-hidden">
      <div className="px-3 py-2 bg-[#F3F3EE] border-b border-[#E5E7EB] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#1E9A80]" />
        <span className="text-[12px] font-semibold text-[#1A1A1A]">{CURRENT_AGENT.name}</span>
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

      <div className="px-3 py-2 text-[11px] text-[#6B7280] flex items-center justify-between">
        <span>Spend today</span>
        <span className="tabular-nums font-medium text-[#1A1A1A]">
          {formatPence(spend.spendPence)}
          <span className="text-[#9CA3AF]">
            {' / '}
            {spend.isAdmin ? '∞' : formatPence(spend.limitPence)}
          </span>
        </span>
      </div>

      {spend.isLimitReached && (
        <div className="mx-3 mb-2 p-2 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-[11px] text-[#B91C1C]">
          Daily limit reached. Ask admin to raise.
        </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
        danger
          ? 'bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FCA5A5]/40'
          : 'text-[#6B7280] hover:bg-[#F3F3EE]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
