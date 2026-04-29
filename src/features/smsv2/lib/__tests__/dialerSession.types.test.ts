// PR 149 (Hugo 2026-04-29): pin INITIAL_DIALER_SESSION_STATE shape so
// downstream PRs (151+) wiring the provider can rely on the defaults.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PACING,
  INITIAL_DIALER_SESSION_STATE,
} from '../dialerSession.types';

describe('dialerSession types — defaults', () => {
  it('DEFAULT_PACING is manual with 0s delay (Hugo Rule 3 — no forced auto-advance)', () => {
    expect(DEFAULT_PACING.mode).toBe('manual');
    expect(DEFAULT_PACING.delaySeconds).toBe(0);
  });

  it('initial session state has no sessionId / startedAt until first dial', () => {
    expect(INITIAL_DIALER_SESSION_STATE.sessionId).toBeNull();
    expect(INITIAL_DIALER_SESSION_STATE.startedAt).toBeNull();
  });

  it('initial session state is unpaused', () => {
    expect(INITIAL_DIALER_SESSION_STATE.paused).toBe(false);
  });

  it('initial session state has empty dialedThisSession set', () => {
    expect(INITIAL_DIALER_SESSION_STATE.dialedThisSession.size).toBe(0);
  });

  it('initial session state pacing matches DEFAULT_PACING', () => {
    expect(INITIAL_DIALER_SESSION_STATE.pacing).toEqual(DEFAULT_PACING);
  });
});
