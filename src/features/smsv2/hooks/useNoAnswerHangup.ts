// PR 138 (Hugo 2026-04-28): no-answer auto-hangup hook.
//
// Hugo (PR 129): "if it takes 30 seconds, 40 seconds, and it doesn't
// start ringing because the phone is off, you have to know — has to go
// to hang up." Threshold: 35s (Twilio rings every 3-4s → 35s ≈ 9-12
// rings, matching Hugo's "10 rings" descriptive ask).
//
// Behaviour
// ─────────
//   - Fires only when the leg is still 'queued' / 'ringing' / null
//     (no leg row yet). NEVER on 'in_progress' (real conversation).
//   - Calls endCall() — the reducer transitions to
//     stopped_waiting_outcome via CALL_ENDED. NO auto-outcome,
//     NO auto-advance (Rules 3, 4, 5).
//   - Once-only per dial cycle — the ref resets when the phase
//     leaves 'placing'.

import { useEffect, useRef } from 'react';

const NO_ANSWER_AUTO_HANGUP_SEC = 35;

export interface UseNoAnswerHangupArgs {
  /** Legacy phase ('placing' = dialing or ringing). */
  phase: 'idle' | 'placing' | 'in_call' | 'post_call';
  /** Twilio leg.status for the active leg, or null when no row yet. */
  legStatus: 'queued' | 'ringing' | 'in_progress' | string | null | undefined;
  /** Seconds the leg has been in flight. */
  elapsedSec: number;
  /** Idempotent end-call function — called when threshold hits. */
  endCall: () => Promise<void> | void;
}

export function useNoAnswerHangup({
  phase,
  legStatus,
  elapsedSec,
  endCall,
}: UseNoAnswerHangupArgs): void {
  const firedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'placing') {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    if (elapsedSec < NO_ANSWER_AUTO_HANGUP_SEC) return;
    const stillRinging =
      legStatus === 'queued' ||
      legStatus === 'ringing' ||
      legStatus == null; // null = no leg row yet — also stuck
    if (!stillRinging) return;
    firedRef.current = true;
    void Promise.resolve(endCall()).catch((e) =>
      console.warn('[useNoAnswerHangup] endCall threw', e)
    );
  }, [phase, elapsedSec, legStatus, endCall]);
}
