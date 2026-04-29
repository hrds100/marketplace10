// PR 148 (Hugo 2026-04-29): pin the contract that Skip and Next call
// MUST stay clickable in `outcome_done`. They were `disabled={submitted}`
// where `submitted = outcome_submitting || outcome_done`, which trapped
// the agent on the "OUTCOME SAVED" screen whenever the auto-advance
// requestNextCall came back empty.
//
// New rule: only block clicks while the outcome write is in flight
// (`outcome_submitting`). After it lands (`outcome_done`), the agent
// must be able to retry advancement.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const ctxState: {
  phase: 'idle' | 'placing' | 'in_call' | 'post_call';
  callPhase:
    | 'idle'
    | 'dialing'
    | 'ringing'
    | 'in_call'
    | 'stopped_waiting_outcome'
    | 'error_waiting_outcome'
    | 'outcome_submitting'
    | 'outcome_done';
  call: { contactId: string; contactName: string; phone: string; startedAt: number } | null;
} = {
  phase: 'post_call',
  callPhase: 'stopped_waiting_outcome',
  call: {
    contactId: 'c1',
    contactName: 'Hugo',
    phone: '+447863992555',
    startedAt: Date.now(),
  },
};

vi.mock('../ActiveCallContext', () => ({
  useActiveCallCtx: () => ({
    phase: ctxState.phase,
    callPhase: ctxState.callPhase,
    call: ctxState.call,
    durationSec: 0,
    applyOutcome: vi.fn(),
    endCall: vi.fn().mockResolvedValue(undefined),
    requestNextCall: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../../store/SmsV2Store', () => ({
  useSmsV2: () => ({
    columns: [
      {
        id: 'col-new-leads',
        name: 'New Leads',
        position: 1,
        colour: '#1E9A80',
        icon: 'Sparkles',
        requiresFollowup: false,
      },
    ],
    contacts: [],
    getContact: () => undefined,
  }),
}));

vi.mock('../../followups/FollowupPromptModal', () => ({
  default: () => null,
}));

import PostCallPanel from '../PostCallPanel';

const renderPanel = (children?: ReactNode) =>
  render(<>{children ?? <PostCallPanel />}</>);

describe('PostCallPanel — Skip + Next call wiring (PR 148)', () => {
  it('Skip and Next call are ENABLED while waiting for outcome (callPhase=stopped_waiting_outcome)', () => {
    ctxState.callPhase = 'stopped_waiting_outcome';
    renderPanel();
    expect(screen.getByTestId('postcall-skip')).not.toBeDisabled();
    expect(screen.getByTestId('postcall-next-call')).not.toBeDisabled();
  });

  it('Skip and Next call are DISABLED while the outcome is being submitted (callPhase=outcome_submitting)', () => {
    ctxState.callPhase = 'outcome_submitting';
    renderPanel();
    expect(screen.getByTestId('postcall-skip')).toBeDisabled();
    expect(screen.getByTestId('postcall-next-call')).toBeDisabled();
  });

  it('Skip and Next call are ENABLED in callPhase=outcome_done so the agent can retry advancement (PR 148 fix for the "OUTCOME SAVED trap")', () => {
    ctxState.callPhase = 'outcome_done';
    renderPanel();
    expect(screen.getByTestId('postcall-skip')).not.toBeDisabled();
    expect(screen.getByTestId('postcall-next-call')).not.toBeDisabled();
  });

  it('Skip and Next call are ENABLED in error_waiting_outcome (post-error wrap-up)', () => {
    ctxState.callPhase = 'error_waiting_outcome';
    renderPanel();
    expect(screen.getByTestId('postcall-skip')).not.toBeDisabled();
    expect(screen.getByTestId('postcall-next-call')).not.toBeDisabled();
  });
});
