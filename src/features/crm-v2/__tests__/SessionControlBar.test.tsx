import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

vi.mock('@/core/integrations/twilio-voice', () => ({
  addIncomingCallListener: () => () => {},
  addTokenRefreshFailListener: () => () => {},
  createDevice: vi.fn().mockResolvedValue({}),
  destroyDevice: vi.fn(),
  dial: vi.fn(),
  disconnectAllCalls: vi.fn(),
  disconnectAllCallsAndWait: vi.fn().mockResolvedValue(undefined),
  getDevice: () => null,
  getDeviceCalls: () => [],
  muteAllCalls: vi.fn(),
  fetchVoiceToken: vi.fn(),
}));

vi.mock('@/features/smsv2/hooks/useTwilioDevice', () => ({
  useTwilioDevice: () => ({
    status: 'ready',
    error: null,
    muted: false,
    setMuted: vi.fn(),
    dial: vi.fn(),
    hangup: vi.fn().mockResolvedValue(undefined),
    sendDigits: vi.fn(),
    activeCall: null,
    waitUntilReady: vi.fn().mockResolvedValue(true),
  }),
}));

import { DialerProvider, useDialer } from '../state/DialerProvider';
import SessionControlBar from '../dialer/SessionControlBar';

let snap: ReturnType<typeof useDialer> | null = null;
function Probe() {
  const ctx = useDialer();
  useEffect(() => {
    snap = ctx;
  });
  snap = ctx;
  return null;
}

describe('SessionControlBar — visibility from idle', () => {
  it('renders Pause / Skip / Next from idle (no Hang up, no Resume)', () => {
    render(
      <DialerProvider>
        <Probe />
        <SessionControlBar headLeadId="c1" secondLeadId="c2" onDial={() => {}} />
      </DialerProvider>
    );
    expect(screen.queryByTestId('control-hangup')).toBeNull();
    expect(screen.getByTestId('control-pause')).toBeTruthy();
    expect(screen.queryByTestId('control-resume')).toBeNull();
    expect(screen.getByTestId('control-skip')).toBeTruthy();
    expect(screen.getByTestId('control-next')).toBeTruthy();
  });

  it('Pause click sets session.paused → switches to Resume button', () => {
    render(
      <DialerProvider>
        <Probe />
        <SessionControlBar headLeadId="c1" onDial={() => {}} />
      </DialerProvider>
    );
    fireEvent.click(screen.getByTestId('control-pause'));
    expect(snap!.session.paused).toBe(true);
    expect(screen.queryByTestId('control-pause')).toBeNull();
    expect(screen.getByTestId('control-resume')).toBeTruthy();
  });

  it('Resume click clears session.paused', () => {
    render(
      <DialerProvider>
        <Probe />
        <SessionControlBar headLeadId="c1" onDial={() => {}} />
      </DialerProvider>
    );
    fireEvent.click(screen.getByTestId('control-pause'));
    fireEvent.click(screen.getByTestId('control-resume'));
    expect(snap!.session.paused).toBe(false);
  });

  it('Next from idle calls onDial(headLeadId)', () => {
    const onDial = vi.fn();
    render(
      <DialerProvider>
        <SessionControlBar headLeadId="c-head" secondLeadId="c-2" onDial={onDial} />
      </DialerProvider>
    );
    fireEvent.click(screen.getByTestId('control-next'));
    expect(onDial).toHaveBeenCalledWith('c-head');
  });

  it('Skip from idle calls onDial(secondLeadId), falling back to head', () => {
    const onDial = vi.fn();
    render(
      <DialerProvider>
        <SessionControlBar headLeadId="c-head" secondLeadId="c-2" onDial={onDial} />
      </DialerProvider>
    );
    fireEvent.click(screen.getByTestId('control-skip'));
    expect(onDial).toHaveBeenCalledWith('c-2');
  });

  it('Skip from idle with no second falls back to head', () => {
    const onDial = vi.fn();
    render(
      <DialerProvider>
        <SessionControlBar headLeadId="c-head" onDial={onDial} />
      </DialerProvider>
    );
    fireEvent.click(screen.getByTestId('control-skip'));
    expect(onDial).toHaveBeenCalledWith('c-head');
  });
});

describe('SessionControlBar — visibility in wrap-up', () => {
  it('shows Skip + Next, not Hang up, in stopped_waiting_outcome', () => {
    function ForceWrapUp() {
      const ctx = useDialer();
      useEffect(() => {
        ctx.dispatch({
          type: 'START_CALL',
          call: {
            contactId: 'c',
            contactName: 'X',
            phone: '+1',
            startedAt: 1,
            callId: null,
            campaignId: 'camp',
          },
        });
        ctx.dispatch({ type: 'CALL_ACCEPTED', startedAt: 2 });
        ctx.dispatch({ type: 'CALL_ENDED', reason: 'user_hangup' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    render(
      <DialerProvider>
        <ForceWrapUp />
        <SessionControlBar onDial={() => {}} />
      </DialerProvider>
    );
    expect(screen.queryByTestId('control-hangup')).toBeNull();
    expect(screen.getByTestId('control-skip')).toBeTruthy();
    expect(screen.getByTestId('control-next')).toBeTruthy();
  });
});
