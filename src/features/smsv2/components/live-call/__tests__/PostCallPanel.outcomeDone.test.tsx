// PR 148 (Hugo 2026-04-29): pin the contract that Skip and Next call
// MUST stay reachable in `outcome_done`. They used to live in this
// panel's footer (postcall-skip / postcall-next-call testids).
//
// PR 155 (Hugo 2026-04-29): the duplicate Skip / Next call buttons
// were REMOVED from PostCallPanel. The InCallRoom footer's
// <SessionControlBar> now owns those handlers (testids
// `control-skip` / `control-next`). PostCallPanel is responsible for
// the outcome cards + the helper text / keyboard hints. This test
// pins the new contract:
//   - PostCallPanel does NOT render its own Skip / Next call buttons.
//   - The helper text "Pick an outcome to continue." is present.
//   - Outcome card disable state still tracks `submitted`.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

describe('PostCallPanel — Skip + Next call wiring (PR 155)', () => {
  it('does NOT render Skip / Next call buttons in stopped_waiting_outcome — those live on SessionControlBar now', () => {
    ctxState.callPhase = 'stopped_waiting_outcome';
    render(<PostCallPanel />);
    expect(screen.queryByTestId('postcall-skip')).toBeNull();
    expect(screen.queryByTestId('postcall-next-call')).toBeNull();
  });

  it('does NOT render Skip / Next call buttons in outcome_submitting', () => {
    ctxState.callPhase = 'outcome_submitting';
    render(<PostCallPanel />);
    expect(screen.queryByTestId('postcall-skip')).toBeNull();
    expect(screen.queryByTestId('postcall-next-call')).toBeNull();
  });

  it('does NOT render Skip / Next call buttons in outcome_done', () => {
    ctxState.callPhase = 'outcome_done';
    render(<PostCallPanel />);
    expect(screen.queryByTestId('postcall-skip')).toBeNull();
    expect(screen.queryByTestId('postcall-next-call')).toBeNull();
  });

  it('does NOT render Skip / Next call buttons in error_waiting_outcome', () => {
    ctxState.callPhase = 'error_waiting_outcome';
    render(<PostCallPanel />);
    expect(screen.queryByTestId('postcall-skip')).toBeNull();
    expect(screen.queryByTestId('postcall-next-call')).toBeNull();
  });

  it('still shows the keyboard helper text + outcome cards', () => {
    ctxState.callPhase = 'stopped_waiting_outcome';
    render(<PostCallPanel />);
    // Footer helper line: "Pick an outcome to continue."
    expect(screen.getByText('Pick an outcome to continue.')).toBeTruthy();
    expect(screen.getByText(/1–9 outcomes · S skip · N next call/)).toBeTruthy();
    expect(screen.getByTestId('postcall-outcome-col-new-leads')).toBeTruthy();
  });

  it('outcome cards are clickable in *_waiting_outcome (not disabled)', () => {
    ctxState.callPhase = 'stopped_waiting_outcome';
    render(<PostCallPanel />);
    expect(screen.getByTestId('postcall-outcome-col-new-leads')).not.toBeDisabled();
  });

  it('outcome cards are disabled once submitted (outcome_submitting / outcome_done)', () => {
    ctxState.callPhase = 'outcome_submitting';
    render(<PostCallPanel />);
    expect(screen.getByTestId('postcall-outcome-col-new-leads')).toBeDisabled();
  });
});
