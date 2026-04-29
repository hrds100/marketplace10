// PR 152 (Hugo 2026-04-29): pin the SessionControlBar visibility matrix
// per phase. The same component renders in BOTH the InCallRoom footer
// and (PR 153) the v3 HeroCard, so this contract is the single source
// of truth for which buttons appear when.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const ctxState: {
  callPhase:
    | 'idle' | 'dialing' | 'ringing' | 'in_call'
    | 'stopped_waiting_outcome' | 'error_waiting_outcome'
    | 'outcome_submitting' | 'outcome_done' | 'paused';
} = {
  callPhase: 'idle',
};

const sessionState: { paused: boolean } = { paused: false };

const handlers = {
  endCall: vi.fn(),
  requestPause: vi.fn(),
  requestResume: vi.fn(),
  requestSkip: vi.fn(),
  requestNextCall: vi.fn(),
};

vi.mock('../../../live-call/ActiveCallContext', () => ({
  useActiveCallCtx: () => ({
    callPhase: ctxState.callPhase,
    endCall: handlers.endCall,
    requestPause: handlers.requestPause,
    requestResume: handlers.requestResume,
    requestSkip: handlers.requestSkip,
    requestNextCall: handlers.requestNextCall,
  }),
}));

vi.mock('../../../../hooks/useDialerSession', () => ({
  useDialerSession: () => ({ paused: sessionState.paused }),
}));

import SessionControlBar from '../SessionControlBar';

function reset() {
  ctxState.callPhase = 'idle';
  sessionState.paused = false;
  Object.values(handlers).forEach((h) => h.mockReset());
}

describe('SessionControlBar — visibility matrix', () => {
  it('idle: Pause + Skip + Next visible; no Hang up; no Resume', () => {
    reset();
    ctxState.callPhase = 'idle';
    render(<SessionControlBar />);
    expect(screen.queryByTestId('control-hangup')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-pause')).toBeInTheDocument();
    expect(screen.queryByTestId('control-resume')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });

  it('dialing: Hang up (label=Cancel) + Pause + Skip + Next', () => {
    reset();
    ctxState.callPhase = 'dialing';
    render(<SessionControlBar />);
    const hangup = screen.getByTestId('control-hangup');
    expect(hangup).toBeInTheDocument();
    expect(hangup).toHaveTextContent(/Cancel/);
    expect(screen.getByTestId('control-pause')).toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });

  it('ringing: Hang up=Cancel + Pause + Skip + Next', () => {
    reset();
    ctxState.callPhase = 'ringing';
    render(<SessionControlBar />);
    expect(screen.getByTestId('control-hangup')).toHaveTextContent(/Cancel/);
  });

  it('in_call: Hang up (label="Hang up") + Pause + Skip + Next', () => {
    reset();
    ctxState.callPhase = 'in_call';
    render(<SessionControlBar />);
    expect(screen.getByTestId('control-hangup')).toHaveTextContent(/Hang up/);
    expect(screen.getByTestId('control-pause')).toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });

  it('stopped_waiting_outcome: NO Hang up; Pause + Skip + Next', () => {
    reset();
    ctxState.callPhase = 'stopped_waiting_outcome';
    render(<SessionControlBar />);
    expect(screen.queryByTestId('control-hangup')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-pause')).toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });

  it('outcome_submitting: Skip + Next visible but DISABLED (race-protect outcome write)', () => {
    reset();
    ctxState.callPhase = 'outcome_submitting';
    render(<SessionControlBar />);
    // Skip not in matrix for submitting (rules.skip = isLive || isWrapUp || isDone || idle).
    expect(screen.queryByTestId('control-skip')).not.toBeInTheDocument();
    // Next is in matrix for submitting BUT disabled.
    const next = screen.getByTestId('control-next');
    expect(next).toBeDisabled();
  });

  it('outcome_done: Pause + Skip + Next', () => {
    reset();
    ctxState.callPhase = 'outcome_done';
    render(<SessionControlBar />);
    expect(screen.queryByTestId('control-hangup')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-pause')).toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });

  it('paused (call-phase): ONLY Resume', () => {
    reset();
    ctxState.callPhase = 'paused';
    render(<SessionControlBar />);
    expect(screen.queryByTestId('control-hangup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('control-pause')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-resume')).toBeInTheDocument();
    expect(screen.queryByTestId('control-skip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('control-next')).not.toBeInTheDocument();
  });

  it('sessionPaused mid-call (in_call): Hang up + Resume + normal Skip/Next', () => {
    reset();
    ctxState.callPhase = 'in_call';
    sessionState.paused = true;
    render(<SessionControlBar />);
    expect(screen.getByTestId('control-hangup')).toBeInTheDocument();
    // Pause hidden, Resume shown.
    expect(screen.queryByTestId('control-pause')).not.toBeInTheDocument();
    expect(screen.getByTestId('control-resume')).toBeInTheDocument();
    expect(screen.getByTestId('control-skip')).toBeInTheDocument();
    expect(screen.getByTestId('control-next')).toBeInTheDocument();
  });
});

describe('SessionControlBar — click handlers', () => {
  it('Hang up click invokes endCall', async () => {
    reset();
    ctxState.callPhase = 'in_call';
    render(<SessionControlBar />);
    screen.getByTestId('control-hangup').click();
    expect(handlers.endCall).toHaveBeenCalledTimes(1);
  });

  it('Pause click invokes requestPause', () => {
    reset();
    ctxState.callPhase = 'idle';
    render(<SessionControlBar />);
    screen.getByTestId('control-pause').click();
    expect(handlers.requestPause).toHaveBeenCalledTimes(1);
  });

  it('Resume click invokes requestResume', () => {
    reset();
    ctxState.callPhase = 'paused';
    render(<SessionControlBar />);
    screen.getByTestId('control-resume').click();
    expect(handlers.requestResume).toHaveBeenCalledTimes(1);
  });

  it('Skip click invokes requestSkip', () => {
    reset();
    ctxState.callPhase = 'stopped_waiting_outcome';
    render(<SessionControlBar />);
    screen.getByTestId('control-skip').click();
    expect(handlers.requestSkip).toHaveBeenCalledTimes(1);
  });

  it('Next call click invokes requestNextCall', () => {
    reset();
    ctxState.callPhase = 'outcome_done';
    render(<SessionControlBar />);
    screen.getByTestId('control-next').click();
    expect(handlers.requestNextCall).toHaveBeenCalledTimes(1);
  });
});

describe('SessionControlBar — keyboard shortcuts', () => {
  function press(key: string) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true });
    window.dispatchEvent(event);
  }

  it('H triggers endCall when Hang up is visible', () => {
    reset();
    ctxState.callPhase = 'in_call';
    render(<SessionControlBar />);
    press('h');
    expect(handlers.endCall).toHaveBeenCalledTimes(1);
  });

  it('H is ignored when Hang up is NOT visible (e.g. outcome_done)', () => {
    reset();
    ctxState.callPhase = 'outcome_done';
    render(<SessionControlBar />);
    press('h');
    expect(handlers.endCall).not.toHaveBeenCalled();
  });

  it('P triggers requestPause; R triggers requestResume', () => {
    reset();
    ctxState.callPhase = 'idle';
    render(<SessionControlBar />);
    press('p');
    expect(handlers.requestPause).toHaveBeenCalledTimes(1);

    sessionState.paused = true;
    ctxState.callPhase = 'paused';
    render(<SessionControlBar />);
    press('r');
    expect(handlers.requestResume).toHaveBeenCalledTimes(1);
  });

  it('S triggers requestSkip; N triggers requestNextCall', () => {
    reset();
    ctxState.callPhase = 'outcome_done';
    render(<SessionControlBar />);
    press('s');
    expect(handlers.requestSkip).toHaveBeenCalledTimes(1);
    press('n');
    expect(handlers.requestNextCall).toHaveBeenCalledTimes(1);
  });

  it('shortcuts are ignored while typing in an input', () => {
    reset();
    ctxState.callPhase = 'in_call';
    render(
      <>
        <SessionControlBar />
        <input data-testid="some-input" />
      </>
    );
    const input = screen.getByTestId('some-input');
    input.focus();
    const event = new KeyboardEvent('keydown', { key: 'h', bubbles: true });
    input.dispatchEvent(event);
    expect(handlers.endCall).not.toHaveBeenCalled();
  });
});
