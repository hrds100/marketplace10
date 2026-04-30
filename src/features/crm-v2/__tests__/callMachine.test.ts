// crm-v2 callMachine — pure transition tests.
// These run with NO React, NO DOM, NO Twilio. If a transition surprises
// you here, the bug is in the reducer, not in the UI.

import { describe, it, expect } from 'vitest';
import { callMachine } from '../state/callMachine';
import { INITIAL_STATE, type ActiveCall } from '../state/callMachine.types';

const FAKE_CALL: ActiveCall = {
  contactId: 'c1',
  contactName: 'Hugo',
  phone: '+447800000001',
  startedAt: 1_700_000_000_000,
  callId: null,
  campaignId: 'camp-1',
};

describe('callMachine — START_CALL', () => {
  it('idle → dialing + open_full + clears banner', () => {
    const s = callMachine(
      { ...INITIAL_STATE, noNewLeadsBanner: { skippedAlreadyDialed: 3 } },
      { type: 'START_CALL', call: FAKE_CALL }
    );
    expect(s.callPhase).toBe('dialing');
    expect(s.roomView).toBe('open_full');
    expect(s.call).toEqual(FAKE_CALL);
    expect(s.noNewLeadsBanner).toBeNull();
  });

  it('outcome_done → dialing on next call', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_done' },
      { type: 'START_CALL', call: FAKE_CALL }
    );
    expect(s.callPhase).toBe('dialing');
  });

  it('blocked while live (dialing/ringing/in_call → no-op)', () => {
    for (const phase of ['dialing', 'ringing', 'in_call'] as const) {
      const before = { ...INITIAL_STATE, callPhase: phase, call: FAKE_CALL };
      const after = callMachine(before, { type: 'START_CALL', call: FAKE_CALL });
      expect(after).toBe(before);
    }
  });
});

describe('callMachine — CALL_ID_RESOLVED', () => {
  it('stamps callId on the in-flight call', () => {
    const dialing = callMachine(INITIAL_STATE, { type: 'START_CALL', call: FAKE_CALL });
    const resolved = callMachine(dialing, {
      type: 'CALL_ID_RESOLVED',
      callId: 'call-uuid-1',
    });
    expect(resolved.call?.callId).toBe('call-uuid-1');
    expect(resolved.callPhase).toBe('dialing');
  });

  it('idempotent on the same callId', () => {
    const s = callMachine(INITIAL_STATE, { type: 'START_CALL', call: { ...FAKE_CALL, callId: 'x' } });
    const same = callMachine(s, { type: 'CALL_ID_RESOLVED', callId: 'x' });
    expect(same).toBe(s);
  });
});

describe('callMachine — LEG_RINGING / CALL_ACCEPTED', () => {
  it('dialing → ringing on LEG_RINGING', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'dialing', call: FAKE_CALL },
      { type: 'LEG_RINGING' }
    );
    expect(s.callPhase).toBe('ringing');
  });

  it('LEG_RINGING is no-op outside dialing', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'in_call' },
      { type: 'LEG_RINGING' }
    );
    expect(s.callPhase).toBe('in_call');
  });

  it('dialing → in_call + reason=connected on CALL_ACCEPTED', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'dialing', call: FAKE_CALL },
      { type: 'CALL_ACCEPTED', startedAt: 1_700_000_001_000 }
    );
    expect(s.callPhase).toBe('in_call');
    expect(s.reason).toBe('connected');
    expect(s.call?.startedAt).toBe(1_700_000_001_000);
  });

  it('ringing → in_call on CALL_ACCEPTED', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'ringing', call: FAKE_CALL },
      { type: 'CALL_ACCEPTED', startedAt: 1 }
    );
    expect(s.callPhase).toBe('in_call');
  });

  it('CALL_ACCEPTED no-op from idle', () => {
    const s = callMachine(INITIAL_STATE, {
      type: 'CALL_ACCEPTED',
      startedAt: 1,
    });
    expect(s.callPhase).toBe('idle');
  });
});

describe('callMachine — CALL_ENDED / CALL_ERROR', () => {
  it('live → stopped_waiting_outcome with reason', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'in_call', call: FAKE_CALL },
      { type: 'CALL_ENDED', reason: 'user_hangup' }
    );
    expect(s.callPhase).toBe('stopped_waiting_outcome');
    expect(s.reason).toBe('user_hangup');
    expect(s.muted).toBe(false);
    expect(s.lastEndedContactId).toBe('c1');
  });

  it('CALL_ENDED with prior error → error_waiting_outcome', () => {
    const s = callMachine(
      {
        ...INITIAL_STATE,
        callPhase: 'in_call',
        call: FAKE_CALL,
        error: { code: 31486, friendlyMessage: 'Busy' },
      },
      { type: 'CALL_ENDED', reason: 'busy' }
    );
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.reason).toBe('busy');
  });

  it('CALL_ENDED is a no-op outside live phases (idempotent)', () => {
    const before = {
      ...INITIAL_STATE,
      callPhase: 'outcome_done' as const,
      call: FAKE_CALL,
    };
    const after = callMachine(before, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(after).toBe(before);
  });

  it('CALL_ERROR fatal during live → error_waiting_outcome', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'ringing', call: FAKE_CALL },
      {
        type: 'CALL_ERROR',
        error: { code: 31005, friendlyMessage: 'Connection lost' },
        fatal: true,
        reason: 'failed',
      }
    );
    expect(s.callPhase).toBe('error_waiting_outcome');
    expect(s.error?.code).toBe(31005);
    expect(s.reason).toBe('failed');
  });

  it('CALL_ERROR non-fatal stashes error without phase change', () => {
    const before = { ...INITIAL_STATE, callPhase: 'in_call' as const, call: FAKE_CALL };
    const after = callMachine(before, {
      type: 'CALL_ERROR',
      error: { code: 31002, friendlyMessage: 'Reconnecting' },
      fatal: false,
    });
    expect(after.callPhase).toBe('in_call');
    expect(after.error?.code).toBe(31002);
  });

  it('CALL_ERROR fatal outside live just stashes (no phase change)', () => {
    const before = { ...INITIAL_STATE, callPhase: 'outcome_done' as const };
    const after = callMachine(before, {
      type: 'CALL_ERROR',
      error: { code: 1, friendlyMessage: 'late error' },
      fatal: true,
    });
    expect(after.callPhase).toBe('outcome_done');
    expect(after.error?.code).toBe(1);
  });
});

describe('callMachine — outcome lifecycle', () => {
  it('OUTCOME_PICKED only from waiting_outcome', () => {
    const ok = callMachine(
      { ...INITIAL_STATE, callPhase: 'stopped_waiting_outcome', call: FAKE_CALL },
      { type: 'OUTCOME_PICKED', columnId: 'col-1' }
    );
    expect(ok.callPhase).toBe('outcome_submitting');

    const noop = callMachine(
      { ...INITIAL_STATE, callPhase: 'in_call', call: FAKE_CALL },
      { type: 'OUTCOME_PICKED', columnId: 'col-1' }
    );
    expect(noop.callPhase).toBe('in_call');
  });

  it('OUTCOME_RESOLVED → outcome_done', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_submitting', call: FAKE_CALL },
      { type: 'OUTCOME_RESOLVED' }
    );
    expect(s.callPhase).toBe('outcome_done');
  });

  it('OUTCOME_FAILED → outcome_done (no trap)', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_submitting', call: FAKE_CALL },
      { type: 'OUTCOME_FAILED', message: 'boom' }
    );
    expect(s.callPhase).toBe('outcome_done');
  });

  it('SKIP_REQUESTED from waiting_outcome → outcome_done', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'error_waiting_outcome', call: FAKE_CALL },
      { type: 'SKIP_REQUESTED' }
    );
    expect(s.callPhase).toBe('outcome_done');
  });

  it('SKIP_REQUESTED is a no-op outside waiting_outcome', () => {
    const before = { ...INITIAL_STATE, callPhase: 'idle' as const };
    const after = callMachine(before, { type: 'SKIP_REQUESTED' });
    expect(after).toBe(before);
  });
});

describe('callMachine — pacing', () => {
  it('PACING_ARMED only in outcome_done + not paused', () => {
    const ok = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_done' },
      { type: 'PACING_ARMED', deadlineMs: 1_700_000_010_000 }
    );
    expect(ok.pacingDeadlineMs).toBe(1_700_000_010_000);

    const paused = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_done', sessionPaused: true },
      { type: 'PACING_ARMED', deadlineMs: 1 }
    );
    expect(paused.pacingDeadlineMs).toBeNull();

    const wrong = callMachine(
      { ...INITIAL_STATE, callPhase: 'in_call' },
      { type: 'PACING_ARMED', deadlineMs: 1 }
    );
    expect(wrong.pacingDeadlineMs).toBeNull();
  });

  it('PAUSE_MIRROR_CHANGED true clears any armed deadline', () => {
    const armed = {
      ...INITIAL_STATE,
      callPhase: 'outcome_done' as const,
      pacingDeadlineMs: 1_700_000_010_000,
    };
    const paused = callMachine(armed, { type: 'PAUSE_MIRROR_CHANGED', paused: true });
    expect(paused.sessionPaused).toBe(true);
    expect(paused.pacingDeadlineMs).toBeNull();
  });

  it('PAUSE_MIRROR_CHANGED idempotent on same value', () => {
    const before = { ...INITIAL_STATE, sessionPaused: true };
    const after = callMachine(before, { type: 'PAUSE_MIRROR_CHANGED', paused: true });
    expect(after).toBe(before);
  });

  it('PACING_CANCELLED clears deadline', () => {
    const armed = { ...INITIAL_STATE, pacingDeadlineMs: 1 };
    const cleared = callMachine(armed, { type: 'PACING_CANCELLED' });
    expect(cleared.pacingDeadlineMs).toBeNull();
  });

  it('PACING_DEADLINE_TICK clears deadline (idempotent)', () => {
    const after = callMachine(INITIAL_STATE, { type: 'PACING_DEADLINE_TICK' });
    expect(after.pacingDeadlineMs).toBeNull();
  });
});

describe('callMachine — room visibility orthogonality', () => {
  it('CALL_ENDED does not change roomView (Rule 6)', () => {
    const before = {
      ...INITIAL_STATE,
      callPhase: 'in_call' as const,
      roomView: 'open_full' as const,
      call: FAKE_CALL,
    };
    const after = callMachine(before, { type: 'CALL_ENDED', reason: 'user_hangup' });
    expect(after.roomView).toBe('open_full');
  });

  it('MINIMISE_ROOM does not change CallPhase (Rule 7)', () => {
    const before = {
      ...INITIAL_STATE,
      callPhase: 'in_call' as const,
      roomView: 'open_full' as const,
    };
    const after = callMachine(before, { type: 'MINIMISE_ROOM' });
    expect(after.callPhase).toBe('in_call');
    expect(after.roomView).toBe('open_min');
  });

  it('MAXIMISE_ROOM no-op when room closed', () => {
    const before = { ...INITIAL_STATE };
    const after = callMachine(before, { type: 'MAXIMISE_ROOM' });
    expect(after).toBe(before);
  });

  it('CLOSE_ROOM blocked while live', () => {
    const before = {
      ...INITIAL_STATE,
      callPhase: 'in_call' as const,
      roomView: 'open_full' as const,
    };
    const after = callMachine(before, { type: 'CLOSE_ROOM' });
    expect(after).toBe(before);
  });

  it('CLOSE_ROOM from outcome_done resets to idle + closed', () => {
    const before = {
      ...INITIAL_STATE,
      callPhase: 'outcome_done' as const,
      roomView: 'open_full' as const,
      call: FAKE_CALL,
    };
    const after = callMachine(before, { type: 'CLOSE_ROOM' });
    expect(after.roomView).toBe('closed');
    expect(after.callPhase).toBe('idle');
    expect(after.call).toBeNull();
  });

  it('OPEN_ROOM from idle sets previewContactId', () => {
    const after = callMachine(INITIAL_STATE, {
      type: 'OPEN_ROOM',
      contactId: 'c-prev',
    });
    expect(after.roomView).toBe('open_full');
    expect(after.previewContactId).toBe('c-prev');
  });

  it('OPEN_ROOM blocked while live', () => {
    const before = { ...INITIAL_STATE, callPhase: 'dialing' as const };
    const after = callMachine(before, {
      type: 'OPEN_ROOM',
      contactId: 'c1',
    });
    expect(after).toBe(before);
  });
});

describe('callMachine — ADVANCE flow (PR C.5)', () => {
  it('ADVANCE_REQUESTED from idle sets advanceIntent=pending', () => {
    const s = callMachine(INITIAL_STATE, { type: 'ADVANCE_REQUESTED' });
    expect(s.advanceIntent).toBe('pending');
    expect(s.callPhase).toBe('idle');
  });

  it('ADVANCE_REQUESTED from outcome_done sets pending; phase unchanged', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_done' },
      { type: 'ADVANCE_REQUESTED' }
    );
    expect(s.advanceIntent).toBe('pending');
    expect(s.callPhase).toBe('outcome_done');
  });

  it('ADVANCE_REQUESTED from stopped_waiting_outcome flips ATOMICALLY through outcome_done + pending', () => {
    const s = callMachine(
      {
        ...INITIAL_STATE,
        callPhase: 'stopped_waiting_outcome',
        call: FAKE_CALL,
      },
      { type: 'ADVANCE_REQUESTED' }
    );
    expect(s.callPhase).toBe('outcome_done');
    expect(s.advanceIntent).toBe('pending');
  });

  it('ADVANCE_REQUESTED from error_waiting_outcome flips through outcome_done + pending', () => {
    const s = callMachine(
      {
        ...INITIAL_STATE,
        callPhase: 'error_waiting_outcome',
        call: FAKE_CALL,
      },
      { type: 'ADVANCE_REQUESTED' }
    );
    expect(s.callPhase).toBe('outcome_done');
    expect(s.advanceIntent).toBe('pending');
  });

  it('ADVANCE_REQUESTED is a no-op while live', () => {
    for (const phase of ['dialing', 'ringing', 'in_call'] as const) {
      const before = { ...INITIAL_STATE, callPhase: phase, call: FAKE_CALL };
      const after = callMachine(before, { type: 'ADVANCE_REQUESTED' });
      expect(after).toBe(before);
    }
  });

  it('ADVANCE_FETCHING flips intent pending → fetching', () => {
    const s = callMachine(
      { ...INITIAL_STATE, advanceIntent: 'pending' },
      { type: 'ADVANCE_FETCHING' }
    );
    expect(s.advanceIntent).toBe('fetching');
  });

  it('ADVANCE_RESOLVED clears intent', () => {
    const s = callMachine(
      { ...INITIAL_STATE, advanceIntent: 'fetching' },
      { type: 'ADVANCE_RESOLVED' }
    );
    expect(s.advanceIntent).toBe('idle');
  });

  it('NEXT_CALL_EMPTY clears advanceIntent and sets banner', () => {
    const s = callMachine(
      { ...INITIAL_STATE, advanceIntent: 'fetching' },
      { type: 'NEXT_CALL_EMPTY', skippedAlreadyDialed: 2 }
    );
    expect(s.advanceIntent).toBe('idle');
    expect(s.noNewLeadsBanner).toEqual({ skippedAlreadyDialed: 2 });
  });

  it('START_CALL clears advanceIntent (intent fulfilled)', () => {
    const s = callMachine(
      { ...INITIAL_STATE, advanceIntent: 'fetching' },
      { type: 'START_CALL', call: FAKE_CALL }
    );
    expect(s.advanceIntent).toBe('idle');
    expect(s.callPhase).toBe('dialing');
  });
});

describe('callMachine — misc', () => {
  it('NEXT_CALL_EMPTY sets banner + clears deadline', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'outcome_done', pacingDeadlineMs: 1 },
      { type: 'NEXT_CALL_EMPTY', skippedAlreadyDialed: 3 }
    );
    expect(s.noNewLeadsBanner).toEqual({ skippedAlreadyDialed: 3 });
    expect(s.pacingDeadlineMs).toBeNull();
  });

  it('MUTE_CHANGED toggles + idempotent', () => {
    const a = callMachine(INITIAL_STATE, { type: 'MUTE_CHANGED', muted: true });
    expect(a.muted).toBe(true);
    const b = callMachine(a, { type: 'MUTE_CHANGED', muted: true });
    expect(b).toBe(a);
  });

  it('CLEAR returns INITIAL_STATE', () => {
    const s = callMachine(
      { ...INITIAL_STATE, callPhase: 'in_call', call: FAKE_CALL },
      { type: 'CLEAR' }
    );
    expect(s).toEqual(INITIAL_STATE);
  });
});
