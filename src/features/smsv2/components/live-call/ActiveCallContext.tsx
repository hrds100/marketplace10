import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { MOCK_CONTACTS } from '../../data/mockContacts';

export type CallPhase = 'idle' | 'in_call' | 'post_call';

interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
}

interface ActiveCallCtx {
  phase: CallPhase;
  call: ActiveCall | null;
  durationSec: number;
  fullScreen: boolean;
  setFullScreen: (v: boolean) => void;
  startCall: (contactId: string, phone?: string, name?: string) => void;
  endCall: () => void;
  clearCall: () => void;
  applyOutcome: (columnId: string) => void;
}

const Ctx = createContext<ActiveCallCtx | null>(null);

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [, setTick] = useState(0);
  const [fullScreen, setFullScreen] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'in_call') {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const value = useMemo<ActiveCallCtx>(() => {
    const durationSec = call ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;
    return {
      phase,
      call,
      durationSec,
      fullScreen,
      setFullScreen,
      startCall: (contactId, phoneOverride, nameOverride) => {
        const contact = MOCK_CONTACTS.find((c) => c.id === contactId);
        setCall({
          contactId,
          contactName: contact?.name ?? nameOverride ?? 'Unknown caller',
          phone: phoneOverride ?? contact?.phone ?? '',
          startedAt: Date.now(),
        });
        setPhase('in_call');
        setFullScreen(true);
      },
      endCall: () => setPhase('post_call'),
      clearCall: () => {
        setPhase('idle');
        setCall(null);
        setFullScreen(true);
      },
      applyOutcome: (columnId) => {
        // Phase 0: console only, then advance
        console.log('[mock] outcome applied', columnId, 'for call', call?.contactId);
        setPhase('idle');
        setCall(null);
      },
    };
  }, [phase, call, fullScreen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
