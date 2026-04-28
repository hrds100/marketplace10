// PR 138 (Hugo 2026-04-28): rewritten to assert against the new
// reducer-driven state shape.
//
// Pins the post-call minimised pill:
//   - shows "Pick outcome for <name>" while callPhase ∈
//     {stopped_waiting_outcome, error_waiting_outcome} AND roomView='open_min'.
//   - shows "Outcome saved · <name>" while callPhase==='outcome_done'
//     AND roomView='open_min'.
//   - hidden when roomView='open_full' (the full-screen room is up).
//
// The old UUID-gate (PR 132) was removed in PR 138 — Hugo's call: the
// pill must always be reachable, even when the wk_calls row hasn't
// landed yet.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mocks must hoist; module factory pattern returns the API and the
// call ref.
const ctxState = {
  phase: 'post_call' as 'idle' | 'placing' | 'in_call' | 'post_call',
  callPhase: 'stopped_waiting_outcome' as
    | 'idle'
    | 'dialing'
    | 'ringing'
    | 'in_call'
    | 'stopped_waiting_outcome'
    | 'error_waiting_outcome'
    | 'outcome_submitting'
    | 'outcome_done',
  roomView: 'open_min' as 'closed' | 'open_full' | 'open_min',
  call: null as null | {
    contactId: string;
    contactName: string;
    phone: string;
    startedAt: number;
    callId?: string | null;
  },
  durationSec: 0,
  fullScreen: false,
};

vi.mock('../../live-call/ActiveCallContext', () => ({
  useActiveCallCtx: () => ({
    ...ctxState,
    setFullScreen: vi.fn(),
    startCall: vi.fn(),
    endCall: vi.fn(),
    clearCall: vi.fn(),
    applyOutcome: vi.fn(),
    resumeFromBroadcast: vi.fn(),
    minimiseRoom: vi.fn(),
    maximiseRoom: vi.fn(),
    closeCallRoom: vi.fn(),
    openCallRoom: vi.fn(),
    error: null,
    dispositionSignal: null,
    previewContactId: null,
    lastEndedContactId: null,
    openPreviousCall: vi.fn(),
    enterDialingPlaceholder: vi.fn(),
    muted: false,
    toggleMute: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useTwilioDevice', () => ({
  useTwilioDevice: () => ({
    status: 'ready',
    error: null,
    muted: false,
    setMuted: vi.fn(),
    dial: vi.fn(),
    hangup: vi.fn(),
    sendDigits: vi.fn(),
    activeCall: null,
  }),
}));

vi.mock('../../../hooks/useSpendLimit', () => ({
  useSpendLimit: () => ({
    spendPence: 0,
    limitPence: 1000,
    isAdmin: false,
    isLimitReached: false,
    percentUsed: 0,
    blocked: false,
    reason: null,
    loading: false,
  }),
}));

vi.mock('../../../hooks/useCurrentAgent', () => ({
  useCurrentAgent: () => ({
    agent: { id: 'u1', name: 'Hugo', email: 'hugo@nfstay.com' },
    firstName: 'Hugo',
    talkRatioPercent: 0,
    loading: false,
  }),
}));

vi.mock('../../live-call/LiveCallScreen', () => ({
  default: () => <div data-testid="live-call-screen" />,
}));

import Softphone from '../Softphone';
import { SmsV2Provider } from '../../../store/SmsV2Store';

function Wrap({ children }: { children: ReactNode }) {
  return <SmsV2Provider>{children}</SmsV2Provider>;
}

describe('Softphone post-call minimised pill (PR 138)', () => {
  it('shows "Pick outcome for <name>" while stopped_waiting_outcome + minimised', () => {
    ctxState.phase = 'post_call';
    ctxState.callPhase = 'stopped_waiting_outcome';
    ctxState.roomView = 'open_min';
    ctxState.fullScreen = false;
    ctxState.call = {
      contactId: 'c1',
      contactName: 'Sarah',
      phone: '+447700900111',
      startedAt: Date.now(),
      callId: null,
    };

    const { queryByText } = render(<Wrap><Softphone /></Wrap>);
    expect(queryByText(/Pick outcome for Sarah/i)).not.toBeNull();
  });

  it('shows "Pick outcome" even when callId is missing — no UUID gate (PR 138)', () => {
    ctxState.phase = 'post_call';
    ctxState.callPhase = 'error_waiting_outcome';
    ctxState.roomView = 'open_min';
    ctxState.fullScreen = false;
    ctxState.call = {
      contactId: 'c1',
      contactName: 'Sarah',
      phone: '+447700900111',
      startedAt: Date.now(),
      callId: 'manual-1714567890000',
    };

    const { queryByText } = render(<Wrap><Softphone /></Wrap>);
    expect(queryByText(/Pick outcome for Sarah/i)).not.toBeNull();
  });

  it('shows "Outcome saved" pill once outcome_done', () => {
    ctxState.phase = 'post_call';
    ctxState.callPhase = 'outcome_done';
    ctxState.roomView = 'open_min';
    ctxState.fullScreen = false;
    ctxState.call = {
      contactId: 'c1',
      contactName: 'Sarah',
      phone: '+447700900111',
      startedAt: Date.now(),
      callId: '22222222-2222-2222-2222-222222222222',
    };

    const { queryByText } = render(<Wrap><Softphone /></Wrap>);
    expect(queryByText(/Outcome saved · Sarah/i)).not.toBeNull();
  });

  it('hides the pill when roomView is open_full (live room is up)', () => {
    ctxState.phase = 'post_call';
    ctxState.callPhase = 'stopped_waiting_outcome';
    ctxState.roomView = 'open_full';
    ctxState.fullScreen = true;
    ctxState.call = {
      contactId: 'c1',
      contactName: 'Sarah',
      phone: '+447700900111',
      startedAt: Date.now(),
      callId: '22222222-2222-2222-2222-222222222222',
    };

    const { queryByText } = render(<Wrap><Softphone /></Wrap>);
    expect(queryByText(/Pick outcome/i)).toBeNull();
  });
});
