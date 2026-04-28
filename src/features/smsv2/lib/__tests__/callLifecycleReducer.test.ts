// PR 138 (Hugo 2026-04-28): exhaustive transition tests for the call
// lifecycle reducer. One test per Hugo rule (Rules 2-9 are structurally
// enforced HERE — Rule 1 is a UI string change, Rule 10 is the
// existence of this file). Plus exhaustive happy-path transitions and
// telephony signal computation.

import { describe, it, expect } from 'vitest';
import {
  callLifecycleReducer,
  computeDispositionSignal,
  mapToLegacyPhase,
} from '../callLifecycleReducer';
import { INITIAL_STATE } from '../callLifecycleReducer.types';
import type {
  ActiveCall,
  CallLifecycleState,
} from '../callLifecycleReducer.types';

const SAMPLE_CALL: ActiveCall = {
  contactId: 'contact-1',
  contactName: 'Hugo',
  phone: '+447863992555',
  startedAt: 1_700_000_000_000,
  callId: 'call-uuid-1',
  campaignId: null,
};

const SECOND_CALL: ActiveCall = {
  contactId: 'contact-2',
  contactName: 'Tajul',
  phone: '+447863992556',
  startedAt: 1_700_000_100_000,
  callId: 'call-uuid-2',
  campaignId: null,
};

function dial(state: CallLifecycleState = INITIAL_STATE): CallLifecycleState {
  return callLifecycleReducer(state, { type: 'START_CALL', call: SAMPLE_CALL });
}

describe('callLifecycleReducer — happy path', () => {
  it('idle → dialing on START_CALL', () => {
    const next = dial();
    expect(next.callPhase).toBe('dialing');
    expect(next.roomView).toBe('open_full');
    expect(next.call).toEqual(SAMPLE_CALL);
  });

  it('dialing → ringing on LEG_RINGING', () => {
    const next = callLifecycleReducer(dial(), { type: 'LEG_RINGING' });
    expect(next.callPhase).toBe('ringing');
  });

  it('dialing → in_call on CALL_ACCEPTED', () => {
    const next = callLifecycleReducer(dial(), {
      type: 'CALL_ACCEPTED',
      startedAt: 1_700_000_050_000,
    });
    expect(next.callPhase).toBe('in_call');
    expect(next.call?.startedAt).toBe(1_700_000_050_000);
  });

  it('ringing → in_call on CALL_ACCEPTED', () => {
    const ringing = callLifecycleReducer(dial(), { type: 'LEG_RINGING' });
    const next = callLifecycleReducer(ringing, {
      type: 'CALL_ACCEPTED',
      startedAt: 1_700_000_060_000,
    });
    expect(next.callPhase).toBe('in_call');
  });

  it('in_call → stopped_waiting_outcome on CALL_ENDED', () => {
    const inCall = callLifecycleReducer(dial(), {
      type: 'CALL_ACCEPTED',
      startedAt: 1_700_000_050_000,
    });
    const next = callLifecycleReducer(inCall, {
      type: 'CALL_ENDED',
      reason: 'user_hangup',
    });
    expect(next.callPhase).toBe('stopped_waiting_outcome');
  });

  it('stopped_waiting_outcome → outcome_submitting on OUTCOME_PICKED', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'col-1' });
    expect(s.callPhase).toBe('outcome_submitting');
  });

  it('outcome_submitting → outcome_done on OUTCOME_RESOLVED', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'col-1' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_RESOLVED' });
    expect(s.callPhase).toBe('outcome_done');
  });

  it('outcome_done → dialing on NEXT_CALL_REQUESTED', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'col-1' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_RESOLVED' });
    s = callLifecycleReducer(s, {
      type: 'NEXT_CALL_REQUESTED',
      call: SECOND_CALL,
    });
    expect(s.callPhase).toBe('dialing');
    expect(s.call).toEqual(SECOND_CALL);
  });

  it('outcome_done → idle/closed on CLOSE_ROOM', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'col-1' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_RESOLVED' });
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.callPhase).toBe('idle');
    expect(s.roomView).toBe('closed');
    expect(s.call).toBeNull();
  });
});

describe("Hugo's rules — structural enforcement", () => {
  it('Rule 2/3/4: NO event flips out of stopped_waiting_outcome except OUTCOME_PICKED', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.callPhase).toBe('stopped_waiting_outcome');

    // None of these events change the phase.
    const noopEvents: Array<Parameters<typeof callLifecycleReducer>[1]> = [
      { type: 'LEG_RINGING' },
      { type: 'CALL_ACCEPTED', startedAt: 1 },
      { type: 'CALL_ENDED', reason: 'user_hangup' },
      { type: 'OUTCOME_RESOLVED' },
      {
        type: 'NEXT_CALL_REQUESTED',
        call: SECOND_CALL,
      },
    ];
    for (const ev of noopEvents) {
      const after = callLifecycleReducer(s, ev);
      expect(after.callPhase).toBe('stopped_waiting_outcome');
    }
    // ONLY OUTCOME_PICKED progresses.
    const after = callLifecycleReducer(s, {
      type: 'OUTCOME_PICKED',
      columnId: 'col-1',
    });
    expect(after.callPhase).toBe('outcome_submitting');
  });

  it('Rule 4 (no auto-outcome): error_waiting_outcome only exits via OUTCOME_PICKED', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31000, friendlyMessage: 'Call dropped' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'x' });
    expect(s.callPhase).toBe('outcome_submitting');
  });

  it('Rule 5: CALL_ENDED keeps `call` unchanged so the contact stays in the room', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    const before = s.call;
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.call).toBe(before);
    expect(s.call?.contactId).toBe(SAMPLE_CALL.contactId);
  });

  it('Rule 5: CALL_ENDED records lastEndedContactId for nav', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.lastEndedContactId).toBe(SAMPLE_CALL.contactId);
  });

  it('Rule 6: CALL_ENDED does NOT change roomView', () => {
    let s = dial();
    expect(s.roomView).toBe('open_full');
    s = callLifecycleReducer(s, { type: 'MINIMISE_ROOM' });
    expect(s.roomView).toBe('open_min');
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    // hangup did not change the minimised state
    expect(s.roomView).toBe('open_min');
  });

  it('Rule 6: cannot CLOSE_ROOM while a call is live', () => {
    let s = dial();
    expect(s.callPhase).toBe('dialing');
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.callPhase).toBe('dialing'); // no-op
    expect(s.roomView).toBe('open_full');
  });

  it('Rule 7: MINIMISE_ROOM and MAXIMISE_ROOM toggle roomView without ending the call', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'MINIMISE_ROOM' });
    expect(s.roomView).toBe('open_min');
    expect(s.callPhase).toBe('in_call');
    s = callLifecycleReducer(s, { type: 'MAXIMISE_ROOM' });
    expect(s.roomView).toBe('open_full');
    expect(s.callPhase).toBe('in_call');
  });

  it('Rule 8: OPEN_ROOM works from idle (preview mode)', () => {
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'OPEN_ROOM',
      contactId: 'contact-x',
    });
    expect(s.previewContactId).toBe('contact-x');
    expect(s.roomView).toBe('open_full');
  });

  it('Rule 8: OPEN_ROOM is a no-op while a call is live (the live room is already up)', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'OPEN_ROOM',
      contactId: 'contact-x',
    });
    // No swap to preview — live call's contact stays in `call`.
    expect(s.call?.contactId).toBe(SAMPLE_CALL.contactId);
    expect(s.previewContactId).toBeNull();
  });
});

describe('callLifecycleReducer — error handling', () => {
  it('non-fatal error stashes the error but keeps phase', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31401, friendlyMessage: 'Mic blocked' },
      fatal: false,
    });
    expect(s.callPhase).toBe('in_call');
    expect(s.error?.code).toBe(31401);
  });

  it('fatal error transitions to error_waiting_outcome', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31000, friendlyMessage: 'Call dropped' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.error?.code).toBe(31000);
  });
});

describe('callLifecycleReducer — inbound + winner', () => {
  it('INBOUND_ANSWERED jumps straight to in_call', () => {
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'INBOUND_ANSWERED',
      call: SAMPLE_CALL,
    });
    expect(s.callPhase).toBe('in_call');
    expect(s.roomView).toBe('open_full');
  });

  it('WINNER_BROADCAST jumps to in_call', () => {
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'WINNER_BROADCAST',
      call: SAMPLE_CALL,
    });
    expect(s.callPhase).toBe('in_call');
  });
});

describe('callLifecycleReducer — mute', () => {
  it('MUTE_CHANGED updates muted flag', () => {
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'MUTE_CHANGED',
      muted: true,
    });
    expect(s.muted).toBe(true);
  });

  it('MUTE_CHANGED is no-op when value matches', () => {
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'MUTE_CHANGED',
      muted: false,
    });
    expect(s).toBe(INITIAL_STATE);
  });
});

describe('mapToLegacyPhase', () => {
  it('maps each fine-grained phase to the legacy 4-state phase', () => {
    expect(mapToLegacyPhase('idle')).toBe('idle');
    expect(mapToLegacyPhase('dialing')).toBe('placing');
    expect(mapToLegacyPhase('ringing')).toBe('placing');
    expect(mapToLegacyPhase('in_call')).toBe('in_call');
    expect(mapToLegacyPhase('stopped_waiting_outcome')).toBe('post_call');
    expect(mapToLegacyPhase('error_waiting_outcome')).toBe('post_call');
    expect(mapToLegacyPhase('outcome_submitting')).toBe('post_call');
    expect(mapToLegacyPhase('outcome_done')).toBe('post_call');
  });
});

describe('computeDispositionSignal', () => {
  it('returns agent_canceled when userCanceled is true', () => {
    expect(computeDispositionSignal({ userCanceled: true })).toBe(
      'agent_canceled'
    );
  });

  it('returns invalid_number for errorCode 13224', () => {
    expect(computeDispositionSignal({ errorCode: 13224 })).toBe(
      'invalid_number'
    );
  });

  it('returns unreachable for transport error codes', () => {
    expect(computeDispositionSignal({ errorCode: 31000 })).toBe('unreachable');
    expect(computeDispositionSignal({ errorCode: 31005 })).toBe('unreachable');
    expect(computeDispositionSignal({ errorCode: 31009 })).toBe('unreachable');
  });

  it('returns busy / no_answer from twilioStatus', () => {
    expect(computeDispositionSignal({ twilioStatus: 'busy' })).toBe('busy');
    expect(computeDispositionSignal({ twilioStatus: 'no-answer' })).toBe(
      'no_answer'
    );
  });

  it('returns voicemail_detected on AMD machine result', () => {
    expect(
      computeDispositionSignal({ amdResult: 'machine_start' })
    ).toBe('voicemail_detected');
    expect(
      computeDispositionSignal({ amdResult: 'fax' })
    ).toBe('voicemail_detected');
  });

  it('returns human_picked_up for completed calls of >=5s with no AMD machine', () => {
    expect(
      computeDispositionSignal({
        twilioStatus: 'completed',
        durationSec: 12,
      })
    ).toBe('human_picked_up');
  });

  it('returns connected_unknown_outcome for short non-machine calls', () => {
    expect(
      computeDispositionSignal({
        twilioStatus: 'completed',
        durationSec: 2,
      })
    ).toBe('connected_unknown_outcome');
  });

  it('returns null when no inputs are available', () => {
    expect(computeDispositionSignal({})).toBe(null);
  });
});
