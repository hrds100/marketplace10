import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSmsV2 } from '../../store/SmsV2Store';

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
  /**
   * Apply a pipeline-column outcome to the just-ended call.
   * Mutates store (contact stage + activity + tags + queue) and auto-loads
   * the next lead from the dialer queue.
   *
   * Special sentinels (no automation):
   *   - 'skipped' — no outcome logged, lead stays in queue, advance to next
   *   - 'next-now' — same, "Call now" button
   */
  applyOutcome: (columnId: string, note?: string) => void;
}

const Ctx = createContext<ActiveCallCtx | null>(null);

export function ActiveCallProvider({ children }: { children: ReactNode }) {
  const store = useSmsV2();
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

    const startCall = (
      contactId: string,
      phoneOverride?: string,
      nameOverride?: string
    ) => {
      const contact = store.getContact(contactId);
      setCall({
        contactId,
        contactName: contact?.name ?? nameOverride ?? 'Unknown caller',
        phone: phoneOverride ?? contact?.phone ?? '',
        startedAt: Date.now(),
      });
      setPhase('in_call');
      setFullScreen(true);
    };

    return {
      phase,
      call,
      durationSec,
      fullScreen,
      setFullScreen,
      startCall,
      endCall: () => setPhase('post_call'),
      clearCall: () => {
        setPhase('idle');
        setCall(null);
        setFullScreen(true);
      },
      applyOutcome: (columnId, note) => {
        if (!call) {
          setPhase('idle');
          return;
        }

        // Sentinels — Skip / Call Now: no stage move, just advance
        if (columnId === 'skipped' || columnId === 'next-now') {
          const nextId = store.popNextFromQueue();
          if (nextId) {
            startCall(nextId);
          } else {
            store.pushToast('Queue is empty — no more leads', 'info');
            setPhase('idle');
            setCall(null);
          }
          return;
        }

        // Real outcome: write to store, surface toast, auto-advance
        const { nextContactId, badges, columnName } = store.applyOutcome(
          call.contactId,
          columnId,
          note
        );
        const summary =
          badges.length > 0
            ? `Moved to ${columnName} · ${badges.join(' · ')}`
            : `Moved to ${columnName}`;
        store.pushToast(summary, 'success');

        if (nextContactId) {
          // small delay for the agent to read the toast
          setTimeout(() => startCall(nextContactId), 600);
        } else {
          store.pushToast('Queue is empty — no more leads', 'info');
          setPhase('idle');
          setCall(null);
        }
      },
    };
  }, [phase, call, fullScreen, store]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveCallCtx() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useActiveCallCtx must be used inside ActiveCallProvider');
  return v;
}
