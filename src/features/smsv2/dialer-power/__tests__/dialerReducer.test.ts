// dialerReducer — pure transitions, no React, no DOM, no Twilio.
// Mechanism cloned from src/features/caller/pages/DialerPage.tsx
// (the working caller dialer Hugo asked us to model on).
//
// Phases: idle → dialing → ringing → connected → wrap_up → idle (loop)
//   plus paused as a side-quest.

import { describe, it, expect } from 'vitest';
import { dialerReducer, INITIAL_STATE, type Lead } from '../dialerReducer';

const FAKE_LEAD: Lead = {
  id: 'c1',
  name: 'Hugo',
  phone: '+447800000001',
  queueId: 'q1',
  pipelineColumnId: null,
};

describe('dialerReducer — DIAL_START', () => {
  it('idle → dialing + records lead + flips sessionStarted=true + clears errors', () => {
    const s = dialerReducer(INITIAL_STATE, { type: 'DIAL_START', lead: FAKE_LEAD });
    expect(s.phase).toBe('dialing');
    expect(s.lead).toEqual(FAKE_LEAD);
    expect(s.callId).toBeNull();
    expect(s.sessionStarted).toBe(true);
    expect(s.error).toBeNull();
    expect(s.endReason).toBeNull();
    expect(s.pacingDeadlineMs).toBeNull();
  });

  it('wrap_up → dialing on the next lead (clears prior error)', () => {
    const wrapped = dialerReducer(
      { ...INITIAL_STATE, phase: 'wrap_up', error: 'busy', endReason: 'busy' },
      { type: 'DIAL_START', lead: FAKE_LEAD }
    );
    expect(wrapped.phase).toBe('dialing');
    expect(wrapped.error).toBeNull();
    expect(wrapped.endReason).toBeNull();
  });
});

describe('dialerReducer — RINGING + CONNECTED', () => {
  it('dialing → ringing on RINGING; no-op outside dialing', () => {
    const s1 = dialerReducer(
      { ...INITIAL_STATE, phase: 'dialing', lead: FAKE_LEAD },
      { type: 'RINGING' }
    );
    expect(s1.phase).toBe('ringing');

    const s2 = dialerReducer(
      { ...INITIAL_STATE, phase: 'connected' },
      { type: 'RINGING' }
    );
    expect(s2.phase).toBe('connected');
  });

  it('CONNECTED from dialing OR ringing flips to connected + stamps startedAt', () => {
    const s1 = dialerReducer(
      { ...INITIAL_STATE, phase: 'dialing', lead: FAKE_LEAD },
      { type: 'CONNECTED' }
    );
    expect(s1.phase).toBe('connected');
    expect(s1.startedAt).not.toBeNull();
    expect((s1.startedAt as number) > 0).toBe(true);

    const s2 = dialerReducer(
      { ...INITIAL_STATE, phase: 'ringing', lead: FAKE_LEAD },
      { type: 'CONNECTED' }
    );
    expect(s2.phase).toBe('connected');
  });

  it('CONNECTED is no-op from idle / wrap_up / paused', () => {
    for (const phase of ['idle', 'wrap_up', 'paused'] as const) {
      const s = dialerReducer(
        { ...INITIAL_STATE, phase },
        { type: 'CONNECTED' }
      );
      expect(s.phase).toBe(phase);
    }
  });
});

describe('dialerReducer — CALL_ENDED', () => {
  it('dialing/ringing/connected → wrap_up + stamps reason', () => {
    for (const phase of ['dialing', 'ringing', 'connected'] as const) {
      const s = dialerReducer(
        { ...INITIAL_STATE, phase, lead: FAKE_LEAD },
        { type: 'CALL_ENDED', reason: 'hangup' }
      );
      expect(s.phase).toBe('wrap_up');
      expect(s.endReason).toBe('hangup');
    }
  });

  it('CALL_ENDED with error stamps both', () => {
    const s = dialerReducer(
      { ...INITIAL_STATE, phase: 'connected', lead: FAKE_LEAD },
      { type: 'CALL_ENDED', reason: 'error', error: 'Twilio 31486' }
    );
    expect(s.phase).toBe('wrap_up');
    expect(s.error).toBe('Twilio 31486');
  });

  it('CALL_ENDED is no-op from idle / wrap_up / paused (idempotent)', () => {
    for (const phase of ['idle', 'wrap_up', 'paused'] as const) {
      const before = { ...INITIAL_STATE, phase };
      const after = dialerReducer(before, { type: 'CALL_ENDED', reason: 'hangup' });
      expect(after).toBe(before);
    }
  });
});

describe('dialerReducer — OUTCOME_DONE', () => {
  it('wrap_up → idle (this transition triggers the auto-pacing effect)', () => {
    const s = dialerReducer(
      { ...INITIAL_STATE, phase: 'wrap_up', sessionStarted: true, error: 'x' },
      { type: 'OUTCOME_DONE' }
    );
    expect(s.phase).toBe('idle');
    expect(s.error).toBeNull();
    expect(s.endReason).toBeNull();
    // sessionStarted MUST stay true — the auto-pacing effect uses it
    // to know we're in an active session.
    expect(s.sessionStarted).toBe(true);
  });

  it('OUTCOME_DONE from idle is a no-op', () => {
    const before = { ...INITIAL_STATE, sessionStarted: true };
    const after = dialerReducer(before, { type: 'OUTCOME_DONE' });
    expect(after).toBe(before);
  });
});

describe('dialerReducer — PACING', () => {
  it('PACING_ARMED stamps deadlineMs', () => {
    const s = dialerReducer(INITIAL_STATE, {
      type: 'PACING_ARMED',
      deadlineMs: 1_700_000_000_000,
    });
    expect(s.pacingDeadlineMs).toBe(1_700_000_000_000);
  });

  it('PACING_CLEARED zeros deadlineMs', () => {
    const armed = { ...INITIAL_STATE, pacingDeadlineMs: 1 };
    const s = dialerReducer(armed, { type: 'PACING_CLEARED' });
    expect(s.pacingDeadlineMs).toBeNull();
  });
});

describe('dialerReducer — PAUSE / RESUME / STOP', () => {
  it('PAUSE flips to paused + clears pacing deadline', () => {
    const s = dialerReducer(
      { ...INITIAL_STATE, phase: 'idle', sessionStarted: true, pacingDeadlineMs: 1 },
      { type: 'PAUSE' }
    );
    expect(s.phase).toBe('paused');
    expect(s.pacingDeadlineMs).toBeNull();
  });

  it('RESUME flips paused → idle (the auto-pacing effect picks it up)', () => {
    const s = dialerReducer(
      { ...INITIAL_STATE, phase: 'paused', sessionStarted: true },
      { type: 'RESUME' }
    );
    expect(s.phase).toBe('idle');
    expect(s.sessionStarted).toBe(true);
  });

  it('STOP fully resets to INITIAL_STATE', () => {
    const s = dialerReducer(
      {
        ...INITIAL_STATE,
        phase: 'connected',
        lead: FAKE_LEAD,
        callId: 'cid',
        startedAt: 1,
        sessionStarted: true,
      },
      { type: 'STOP' }
    );
    expect(s).toEqual(INITIAL_STATE);
  });
});
