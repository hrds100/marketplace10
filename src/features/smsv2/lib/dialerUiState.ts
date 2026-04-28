// PR 140 (Hugo 2026-04-28): UX-facing dialer state derivation.
//
// PR 138 fixed the reducer; PR 140 fixes what the agent actually SEES.
// `deriveDialerUiState(state)` collapses (callPhase, roomView,
// dispositionSignal, error, previewContactId) into a single tagged
// union the new shell components render around.
//
// Hugo's non-negotiable: "ringing", "connected", "failed", "no answer",
// "voicemail", "busy" are DISTINCT user-visible states. The reducer
// already carries enough information — this helper turns that into a
// shape the UI binds to without each component re-running its own
// switch.

import type { CallLifecycleState, TelephonySignal } from './callLifecycleReducer.types';

export type WrapUpReason =
  | 'completed'
  | 'no_answer'
  | 'voicemail'
  | 'busy'
  | 'unreachable'
  | 'invalid_number'
  | 'failed'
  | 'unknown';

export type DialerUiState =
  | { kind: 'idle' }
  | { kind: 'preview'; contactId: string }
  | { kind: 'dialing' }
  | { kind: 'ringing' }
  | { kind: 'connected' }
  | { kind: 'wrap_up'; reason: WrapUpReason }
  | { kind: 'submitting' }
  | { kind: 'done' };

export type DialerUiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

function reasonFromSignal(
  callPhase: CallLifecycleState['callPhase'],
  signal: TelephonySignal
): WrapUpReason {
  switch (signal) {
    case 'human_picked_up':
    case 'connected_unknown_outcome':
      return 'completed';
    case 'no_answer':
    case 'agent_canceled':
      return 'no_answer';
    case 'voicemail_detected':
      return 'voicemail';
    case 'busy':
      return 'busy';
    case 'unreachable':
      return 'unreachable';
    case 'invalid_number':
      return 'invalid_number';
    case null:
      // Stopped without a recognised signal — be honest about it.
      // For error_waiting_outcome, the explicit error code path is what
      // marks it 'failed'. For stopped_waiting_outcome it's 'unknown'.
      return callPhase === 'error_waiting_outcome' ? 'failed' : 'unknown';
  }
}

export function deriveDialerUiState(state: CallLifecycleState): DialerUiState {
  // Preview ALWAYS loses to a live call — the call is what the agent
  // is actually doing.
  if (state.callPhase === 'idle') {
    if (state.roomView !== 'closed' && state.previewContactId) {
      return { kind: 'preview', contactId: state.previewContactId };
    }
    return { kind: 'idle' };
  }

  if (state.callPhase === 'dialing') return { kind: 'dialing' };
  if (state.callPhase === 'ringing') return { kind: 'ringing' };
  if (state.callPhase === 'in_call') return { kind: 'connected' };

  if (
    state.callPhase === 'stopped_waiting_outcome' ||
    state.callPhase === 'error_waiting_outcome'
  ) {
    return {
      kind: 'wrap_up',
      reason: reasonFromSignal(state.callPhase, state.dispositionSignal),
    };
  }

  if (state.callPhase === 'outcome_submitting') return { kind: 'submitting' };
  return { kind: 'done' };
}

// ─── Display helpers ───────────────────────────────────────────────
// Single source of truth for the user-visible label / colour group /
// pulsing animation. New shell components import these to stay in sync.

export function uiStateLabel(s: DialerUiState): string {
  switch (s.kind) {
    case 'idle':
      return 'Ready';
    case 'preview':
      return 'Preview';
    case 'dialing':
      return 'Dialing';
    case 'ringing':
      return 'Ringing';
    case 'connected':
      return 'Connected';
    case 'wrap_up':
      switch (s.reason) {
        case 'completed':
          return 'Call ended';
        case 'no_answer':
          return 'No answer';
        case 'voicemail':
          return 'Voicemail';
        case 'busy':
          return 'Busy';
        case 'unreachable':
          return 'Unreachable';
        case 'invalid_number':
          return 'Invalid number';
        case 'failed':
          return 'Call failed';
        case 'unknown':
          return 'Call ended';
      }
    // eslint-disable-next-line no-fallthrough
    case 'submitting':
      return 'Saving outcome';
    case 'done':
      return 'Outcome saved';
  }
}

export function uiStateTone(s: DialerUiState): DialerUiTone {
  switch (s.kind) {
    case 'idle':
    case 'preview':
      return 'neutral';
    case 'dialing':
    case 'ringing':
    case 'submitting':
      return 'info';
    case 'connected':
    case 'done':
      return 'success';
    case 'wrap_up':
      switch (s.reason) {
        case 'failed':
        case 'unreachable':
        case 'invalid_number':
          return 'danger';
        default:
          return 'warning';
      }
  }
}

export function uiStatePulse(s: DialerUiState): boolean {
  // Pulses indicate "something is happening that may resolve at any
  // moment". Live call legs and outcome submission both qualify.
  return (
    s.kind === 'dialing' ||
    s.kind === 'ringing' ||
    s.kind === 'connected' ||
    s.kind === 'submitting'
  );
}

// Tailwind colour-class helpers for the shell to consume. Each tone
// maps to (text, background, ring) so the badge stays consistent.
export function toneClasses(tone: DialerUiTone): {
  text: string;
  bg: string;
  ring: string;
  dot: string;
} {
  switch (tone) {
    case 'neutral':
      return {
        text: 'text-[#1A1A1A]',
        bg: 'bg-white',
        ring: 'ring-[#E5E7EB]',
        dot: 'bg-[#9CA3AF]',
      };
    case 'info':
      return {
        text: 'text-white',
        bg: 'bg-[#0A0A0A]',
        ring: 'ring-[#0A0A0A]',
        dot: 'bg-[#1E9A80]',
      };
    case 'success':
      return {
        text: 'text-white',
        bg: 'bg-[#1E9A80]',
        ring: 'ring-[#1E9A80]',
        dot: 'bg-white',
      };
    case 'warning':
      return {
        text: 'text-white',
        bg: 'bg-[#F59E0B]',
        ring: 'ring-[#F59E0B]',
        dot: 'bg-white',
      };
    case 'danger':
      return {
        text: 'text-white',
        bg: 'bg-[#EF4444]',
        ring: 'ring-[#EF4444]',
        dot: 'bg-white',
      };
  }
}
