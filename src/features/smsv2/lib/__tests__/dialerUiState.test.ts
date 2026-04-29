// PR 140 (Hugo 2026-04-28): TDD for the dialer UX rebuild.
//
// PR 138 cleaned the reducer but agents still saw an ambiguous UI: no
// distinct "Ringing", "Connected", "Failed", "No answer" badges. This
// helper turns the (callPhase, roomView, dispositionSignal, error,
// previewContactId) tuple into a single tagged DialerUiState that the
// new shell components render around.
//
// Hugo's non-negotiable: every state agents see in the call surface
// must be unambiguous. These tests pin every transition's label down.

import { describe, it, expect } from 'vitest';
import { deriveDialerUiState } from '../dialerUiState';
import { INITIAL_STATE } from '../callLifecycleReducer.types';
import type { CallLifecycleState } from '../callLifecycleReducer.types';

const baseCall = {
  contactId: 'c1',
  contactName: 'Lead 1',
  phone: '+447900000001',
  startedAt: 1_700_000_000_000,
  callId: 'call-1',
};

function st(patch: Partial<CallLifecycleState>): CallLifecycleState {
  return { ...INITIAL_STATE, ...patch };
}

describe('deriveDialerUiState', () => {
  // ─── Idle / preview ───────────────────────────────────────────────
  describe('idle and preview', () => {
    it('returns { kind: "idle" } for a fresh state', () => {
      expect(deriveDialerUiState(INITIAL_STATE)).toEqual({ kind: 'idle' });
    });

    it('returns { kind: "preview", contactId } when roomView is open with a previewContactId and no active call', () => {
      const s = st({ roomView: 'open_full', previewContactId: 'c-99' });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'preview',
        contactId: 'c-99',
      });
    });

    it('does NOT return preview if there is an active call (call wins over preview)', () => {
      const s = st({
        callPhase: 'in_call',
        roomView: 'open_full',
        previewContactId: 'c-99',
        call: baseCall,
      });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'connected' });
    });
  });

  // ─── Live phases ──────────────────────────────────────────────────
  describe('live phases', () => {
    it('callPhase=dialing → { kind: "dialing" }', () => {
      const s = st({ callPhase: 'dialing', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'dialing' });
    });

    it('callPhase=ringing → { kind: "ringing" }', () => {
      const s = st({ callPhase: 'ringing', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'ringing' });
    });

    it('callPhase=in_call → { kind: "connected" }', () => {
      const s = st({ callPhase: 'in_call', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'connected' });
    });
  });

  // ─── Wrap-up: stopped_waiting_outcome ─────────────────────────────
  describe('wrap-up reasons (stopped_waiting_outcome)', () => {
    it('signal=human_picked_up → { kind: "wrap_up", reason: "completed" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'human_picked_up',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'completed',
      });
    });

    it('signal=connected_unknown_outcome → { kind: "wrap_up", reason: "completed" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'connected_unknown_outcome',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'completed',
      });
    });

    it('signal=no_answer → { kind: "wrap_up", reason: "no_answer" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'no_answer',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'no_answer',
      });
    });

    it('signal=agent_canceled → { kind: "wrap_up", reason: "no_answer" } (agent hung up before pickup)', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'agent_canceled',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'no_answer',
      });
    });

    it('signal=voicemail_detected → { kind: "wrap_up", reason: "voicemail" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'voicemail_detected',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'voicemail',
      });
    });

    it('signal=busy → { kind: "wrap_up", reason: "busy" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'busy',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'busy',
      });
    });

    it('signal=unreachable → { kind: "wrap_up", reason: "unreachable" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'unreachable',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'unreachable',
      });
    });

    it('signal=invalid_number → { kind: "wrap_up", reason: "invalid_number" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'invalid_number',
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'invalid_number',
      });
    });

    it('signal=null → { kind: "wrap_up", reason: "unknown" }', () => {
      const s = st({
        callPhase: 'stopped_waiting_outcome',
        call: baseCall,
        dispositionSignal: null,
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'unknown',
      });
    });
  });

  // ─── Wrap-up: error_waiting_outcome ───────────────────────────────
  describe('wrap-up reasons (error_waiting_outcome)', () => {
    it('error+invalid_number signal → { kind: "wrap_up", reason: "invalid_number" }', () => {
      const s = st({
        callPhase: 'error_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'invalid_number',
        error: { code: 13224, friendlyMessage: 'Invalid number' },
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'invalid_number',
      });
    });

    it('error+unreachable signal → { kind: "wrap_up", reason: "unreachable" }', () => {
      const s = st({
        callPhase: 'error_waiting_outcome',
        call: baseCall,
        dispositionSignal: 'unreachable',
        error: { code: 31000, friendlyMessage: 'Network dropped' },
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'unreachable',
      });
    });

    it('error+other signal → { kind: "wrap_up", reason: "failed" }', () => {
      const s = st({
        callPhase: 'error_waiting_outcome',
        call: baseCall,
        dispositionSignal: null,
        error: { code: 31204, friendlyMessage: 'Auth failed' },
      });
      expect(deriveDialerUiState(s)).toEqual({
        kind: 'wrap_up',
        reason: 'failed',
      });
    });
  });

  // ─── PR 150: paused + next_resolving ──────────────────────────────
  describe('PR 150 — paused + next_resolving (new in PR 150)', () => {
    it('callPhase=paused → { kind: "paused" }', () => {
      const s = st({ callPhase: 'paused', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'paused' });
    });

    it('callPhase=outcome_done with pendingNextCall=cooling_down → { kind: "next_resolving" }', () => {
      const s = st({
        callPhase: 'outcome_done',
        call: baseCall,
        pendingNextCall: 'cooling_down',
      });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'next_resolving' });
    });

    it('callPhase=outcome_done with pendingNextCall=armed → { kind: "done" } (waiting for timer)', () => {
      const s = st({
        callPhase: 'outcome_done',
        call: baseCall,
        pendingNextCall: 'armed',
        pacingDeadlineMs: Date.now() + 5000,
      });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'done' });
    });

    it('uiStateLabel("paused") = "Session paused"', async () => {
      const { uiStateLabel } = await import('../dialerUiState');
      expect(uiStateLabel({ kind: 'paused' })).toBe('Session paused');
    });

    it('uiStateLabel("next_resolving") = "Resolving next"', async () => {
      const { uiStateLabel } = await import('../dialerUiState');
      expect(uiStateLabel({ kind: 'next_resolving' })).toBe('Resolving next');
    });

    it('uiStateTone("paused") = "neutral"; uiStateTone("next_resolving") = "info"', async () => {
      const { uiStateTone } = await import('../dialerUiState');
      expect(uiStateTone({ kind: 'paused' })).toBe('neutral');
      expect(uiStateTone({ kind: 'next_resolving' })).toBe('info');
    });

    it('uiStatePulse — paused does NOT pulse; next_resolving DOES pulse', async () => {
      const { uiStatePulse } = await import('../dialerUiState');
      expect(uiStatePulse({ kind: 'paused' })).toBe(false);
      expect(uiStatePulse({ kind: 'next_resolving' })).toBe(true);
    });
  });

  // ─── Outcome submission flow ──────────────────────────────────────
  describe('outcome submission', () => {
    it('callPhase=outcome_submitting → { kind: "submitting" }', () => {
      const s = st({ callPhase: 'outcome_submitting', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'submitting' });
    });

    it('callPhase=outcome_done → { kind: "done" }', () => {
      const s = st({ callPhase: 'outcome_done', call: baseCall });
      expect(deriveDialerUiState(s)).toEqual({ kind: 'done' });
    });
  });

  // ─── Display labels ───────────────────────────────────────────────
  describe('label and tone', () => {
    // The new pre-call/in-call shell renders label + tone from a tiny
    // map next to the state. Pin the labels here so a refactor that
    // accidentally renames "Ringing" → "Calling" gets caught.
    it('exposes a label() helper for each kind', async () => {
      const { uiStateLabel } = await import('../dialerUiState');
      expect(uiStateLabel({ kind: 'idle' })).toBe('Ready');
      expect(uiStateLabel({ kind: 'preview', contactId: 'x' })).toBe('Preview');
      expect(uiStateLabel({ kind: 'dialing' })).toBe('Dialing');
      expect(uiStateLabel({ kind: 'ringing' })).toBe('Ringing');
      expect(uiStateLabel({ kind: 'connected' })).toBe('Connected');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'completed' })).toBe('Call ended');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'no_answer' })).toBe('No answer');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'voicemail' })).toBe('Voicemail');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'busy' })).toBe('Busy');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'unreachable' })).toBe('Unreachable');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'invalid_number' })).toBe('Invalid number');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'failed' })).toBe('Call failed');
      expect(uiStateLabel({ kind: 'wrap_up', reason: 'unknown' })).toBe('Call ended');
      expect(uiStateLabel({ kind: 'submitting' })).toBe('Saving outcome');
      expect(uiStateLabel({ kind: 'done' })).toBe('Outcome saved');
    });

    it('exposes a tone() helper that maps to colour groups', async () => {
      const { uiStateTone } = await import('../dialerUiState');
      // Live = blue, connected = green, wrap-up = amber/red, done = green.
      expect(uiStateTone({ kind: 'idle' })).toBe('neutral');
      expect(uiStateTone({ kind: 'preview', contactId: 'x' })).toBe('neutral');
      expect(uiStateTone({ kind: 'dialing' })).toBe('info');
      expect(uiStateTone({ kind: 'ringing' })).toBe('info');
      expect(uiStateTone({ kind: 'connected' })).toBe('success');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'completed' })).toBe('warning');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'no_answer' })).toBe('warning');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'voicemail' })).toBe('warning');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'busy' })).toBe('warning');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'failed' })).toBe('danger');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'unreachable' })).toBe('danger');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'invalid_number' })).toBe('danger');
      expect(uiStateTone({ kind: 'wrap_up', reason: 'unknown' })).toBe('warning');
      expect(uiStateTone({ kind: 'submitting' })).toBe('info');
      expect(uiStateTone({ kind: 'done' })).toBe('success');
    });

    it('exposes a pulse() helper — only live phases pulse', async () => {
      const { uiStatePulse } = await import('../dialerUiState');
      expect(uiStatePulse({ kind: 'idle' })).toBe(false);
      expect(uiStatePulse({ kind: 'preview', contactId: 'x' })).toBe(false);
      expect(uiStatePulse({ kind: 'dialing' })).toBe(true);
      expect(uiStatePulse({ kind: 'ringing' })).toBe(true);
      expect(uiStatePulse({ kind: 'connected' })).toBe(true);
      expect(uiStatePulse({ kind: 'wrap_up', reason: 'completed' })).toBe(false);
      expect(uiStatePulse({ kind: 'submitting' })).toBe(true);
      expect(uiStatePulse({ kind: 'done' })).toBe(false);
    });
  });
});
