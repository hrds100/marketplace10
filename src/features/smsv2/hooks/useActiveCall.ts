// STUB — Phase 0 mock active-call state machine.
// Phase 1 wires this to Twilio Device events + Supabase realtime.
import { useEffect, useRef, useState } from 'react';
import { MOCK_CONTACTS } from '../data/mockContacts';

export type ActiveCallState = 'idle' | 'ringing' | 'in_call' | 'post_call';

export interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  startedAt: number;
  durationSec: number;
}

export function useActiveCall() {
  const [state, setState] = useState<ActiveCallState>('idle');
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state === 'in_call') {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  const durationSec = call ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;

  const startCall = (contactId: string) => {
    const contact = MOCK_CONTACTS.find((c) => c.id === contactId);
    if (!contact) return;
    setCall({
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      startedAt: Date.now(),
      durationSec: 0,
    });
    setState('in_call');
  };

  const endCall = () => {
    setState('post_call');
  };

  const reset = () => {
    setCall(null);
    setState('idle');
    setTick(0);
  };

  // Use tick to keep React re-rendering for the duration display
  void tick;

  return { state, setState, call, durationSec, startCall, endCall, reset };
}
