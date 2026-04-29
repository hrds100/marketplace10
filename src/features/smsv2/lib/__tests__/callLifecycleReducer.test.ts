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

describe('PR 149 — INITIAL_STATE defaults the new pacing/session fields', () => {
  // The new fields land WITH safe defaults so the existing reducer
  // behaviour is unchanged. PR 150 introduces the events that read /
  // write these fields. This test pins the foundation contract.
  it('INITIAL_STATE has pendingNextCall=idle, pacingDeadlineMs=null, sessionPaused=false, noNewLeadsBanner=false', () => {
    expect(INITIAL_STATE.pendingNextCall).toBe('idle');
    expect(INITIAL_STATE.pacingDeadlineMs).toBeNull();
    expect(INITIAL_STATE.sessionPaused).toBe(false);
    expect(INITIAL_STATE.noNewLeadsBanner).toBe(false);
  });
});

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

// PR 141 (Hugo 2026-04-28): regression tests for the three bugs Hugo
// reported after PR 140 deploy:
//   Bug 1: 31005 HANGUP shows "Call ended" badge instead of "Unreachable"
//   Bug 2: Open from Recent Calls is silently ignored from any wrap-up
//   Bug 3: Close from error/stopped wrap-up leaves stale state behind
describe('PR 142 — repeated error events do not loop the reducer', () => {
  it('CALL_ERROR while already in error_waiting_outcome is a no-op (no state churn)', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'Connection lost' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    const before = s;
    // Twilio fires another 31005 — repeats happen when the SDK loses
    // its WebSocket and keeps reconnecting. Reducer should NOT churn
    // state again — same reference back means React won't re-render.
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'Connection lost' },
      fatal: false,
    });
    expect(s).toBe(before);
  });

  it('CALL_ERROR while in stopped_waiting_outcome is a no-op', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.callPhase).toBe('stopped_waiting_outcome');
    const before = s;
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'Connection lost' },
      fatal: false,
    });
    expect(s).toBe(before);
  });

  it('CALL_ERROR while idle (no live call) is a no-op', () => {
    const before = INITIAL_STATE;
    const s = callLifecycleReducer(INITIAL_STATE, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'Connection lost' },
      fatal: false,
    });
    expect(s).toBe(before);
  });

  it('CALL_ERROR (fatal=true) from ringing immediately flips to error_waiting_outcome — does not stay stuck in RINGING', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'LEG_RINGING' });
    expect(s.callPhase).toBe('ringing');
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'HANGUP from gateway' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.dispositionSignal).toBe('unreachable');
  });
});

describe('PR 141 — error-then-disconnect (Bug 1)', () => {
  it('CALL_ERROR(31005, fatal=false) then CALL_ENDED → error_waiting_outcome with unreachable signal', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    // Twilio fires error first (31005 is non-fatal in mapTwilioError)
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31005, friendlyMessage: 'Connection lost (31005).' },
      fatal: false,
    });
    // Phase still in_call (error stashed only)
    expect(s.callPhase).toBe('in_call');
    expect(s.error?.code).toBe(31005);
    // Twilio then fires disconnect — historically lost the error code,
    // resulting in signal=null → label "Call ended". After the fix,
    // the reducer notices the stashed error and routes to error wrap-up.
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'twilio_disconnect' });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.dispositionSignal).toBe('unreachable');
  });

  it('CALL_ERROR(13224, non-fatal) then CALL_ENDED → invalid_number signal', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 13224, friendlyMessage: 'Number unreachable' },
      fatal: false,
    });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'twilio_disconnect' });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.dispositionSignal).toBe('invalid_number');
  });

  it('CALL_ENDED with no prior error still goes to stopped_waiting_outcome', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ACCEPTED', startedAt: 1 });
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.callPhase).toBe('stopped_waiting_outcome');
    expect(s.dispositionSignal).not.toBe('unreachable');
  });

  // PR 147 (Hugo 2026-04-29): SDK precision-flag codes 31404 NotFound
  // and 31480 TemporarilyUnavailable both reflect carrier-side
  // unreachability for our outbound dial flow. Map them to
  // 'unreachable' so the badge shows the same red wrap-up state as
  // 31000/31005/31009.
  it('CALL_ERROR(31404, fatal) flips to error_waiting_outcome with unreachable signal', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31404, friendlyMessage: 'NotFound' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.dispositionSignal).toBe('unreachable');
  });

  it('CALL_ERROR(31480, fatal) flips to error_waiting_outcome with unreachable signal', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31480, friendlyMessage: 'TemporarilyUnavailable' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.dispositionSignal).toBe('unreachable');
  });
});

describe('PR 141 — Open from any wrap-up (Bug 2)', () => {
  it('OPEN_ROOM from stopped_waiting_outcome switches to preview of new contact', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.callPhase).toBe('stopped_waiting_outcome');
    s = callLifecycleReducer(s, {
      type: 'OPEN_ROOM',
      contactId: 'different-contact',
    });
    expect(s.previewContactId).toBe('different-contact');
    expect(s.roomView).toBe('open_full');
    expect(s.callPhase).toBe('idle');
    expect(s.call).toBeNull();
    expect(s.error).toBeNull();
    expect(s.dispositionSignal).toBeNull();
  });

  it('OPEN_ROOM from error_waiting_outcome clears error and switches to preview', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31000, friendlyMessage: 'Dropped' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    s = callLifecycleReducer(s, {
      type: 'OPEN_ROOM',
      contactId: 'recovery-contact',
    });
    expect(s.previewContactId).toBe('recovery-contact');
    expect(s.callPhase).toBe('idle');
    expect(s.error).toBeNull();
  });

  it('OPEN_ROOM from outcome_done switches to preview cleanly', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_PICKED', columnId: 'col-1' });
    s = callLifecycleReducer(s, { type: 'OUTCOME_RESOLVED' });
    expect(s.callPhase).toBe('outcome_done');
    s = callLifecycleReducer(s, {
      type: 'OPEN_ROOM',
      contactId: 'next-preview',
    });
    expect(s.previewContactId).toBe('next-preview');
    expect(s.callPhase).toBe('idle');
    expect(s.call).toBeNull();
  });

  it('OPEN_ROOM is still a no-op while a call is live', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'OPEN_ROOM',
      contactId: 'should-not-replace',
    });
    expect(s.call?.contactId).toBe(SAMPLE_CALL.contactId);
    expect(s.previewContactId).toBeNull();
  });
});

describe('PR 141 — Close from any wrap-up fully resets (Bug 3)', () => {
  it('CLOSE_ROOM from error_waiting_outcome clears call + error + disposition', () => {
    let s = dial();
    s = callLifecycleReducer(s, {
      type: 'CALL_ERROR',
      error: { code: 31000, friendlyMessage: 'Dropped' },
      fatal: true,
    });
    expect(s.callPhase).toBe('error_waiting_outcome');
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.callPhase).toBe('idle');
    expect(s.roomView).toBe('closed');
    expect(s.call).toBeNull();
    expect(s.error).toBeNull();
    expect(s.dispositionSignal).toBeNull();
    expect(s.previewContactId).toBeNull();
  });

  it('CLOSE_ROOM from stopped_waiting_outcome clears call', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(s.callPhase).toBe('stopped_waiting_outcome');
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.callPhase).toBe('idle');
    expect(s.roomView).toBe('closed');
    expect(s.call).toBeNull();
  });

  it('CLOSE_ROOM from outcome_done still works as before (Hugo Rule preserved)', () => {
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

  it('CLOSE_ROOM is still gated while a call is live (Rule 6 preserved)', () => {
    let s = dial();
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.callPhase).toBe('dialing');
    expect(s.roomView).toBe('open_full');
  });

  it('CLOSE_ROOM from preview clears the preview', () => {
    let s = callLifecycleReducer(INITIAL_STATE, {
      type: 'OPEN_ROOM',
      contactId: 'preview-contact',
    });
    expect(s.previewContactId).toBe('preview-contact');
    s = callLifecycleReducer(s, { type: 'CLOSE_ROOM' });
    expect(s.previewContactId).toBeNull();
    expect(s.roomView).toBe('closed');
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
