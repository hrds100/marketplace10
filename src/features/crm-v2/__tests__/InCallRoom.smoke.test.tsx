import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            then: (cb: (v: { data: unknown[]; error: null }) => unknown) =>
              cb({ data: [], error: null }),
          }),
        }),
        order: () => ({
          then: (cb: (v: { data: unknown[]; error: null }) => unknown) =>
            cb({ data: [], error: null }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel: () => ({ on: function (this: any) { return this; }, subscribe: function (this: any) { return this; } }),
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
    hangup: vi.fn(),
    sendDigits: vi.fn(),
    activeCall: null,
    waitUntilReady: vi.fn().mockResolvedValue(true),
  }),
}));

import { DialerProvider, useDialer } from '../state/DialerProvider';
import InCallRoom from '../live-call/InCallRoom';
import { useEffect } from 'react';

let snap: ReturnType<typeof useDialer> | null = null;
function Probe() {
  const ctx = useDialer();
  useEffect(() => {
    snap = ctx;
  });
  snap = ctx;
  return null;
}

describe('InCallRoom — smoke', () => {
  it('does NOT render when roomView=closed', () => {
    render(
      <DialerProvider skipDevice>
        <InCallRoom />
      </DialerProvider>
    );
    expect(screen.queryByTestId('incall-room')).toBeNull();
  });

  it('renders header + transcript pane + footer when a call dispatches START_CALL', () => {
    render(
      <DialerProvider skipDevice>
        <Probe />
        <InCallRoom />
      </DialerProvider>
    );
    act(() => {
      snap!.dispatch({
        type: 'START_CALL',
        call: {
          contactId: 'c1',
          contactName: 'Test Lead',
          phone: '+44',
          startedAt: 1,
          callId: null,
          campaignId: 'camp',
        },
      });
    });
    expect(screen.getByTestId('incall-room')).toBeTruthy();
    expect(screen.getByTestId('incall-header')).toBeTruthy();
    expect(screen.getByTestId('incall-footer')).toBeTruthy();
    expect(screen.getByTestId('incall-contact-pane')).toBeTruthy();
    expect(screen.getByTestId('incall-script-pane')).toBeTruthy();
    expect(screen.getByTestId('incall-terminology-pane')).toBeTruthy();
    // transcript pane visible while live (not wrap-up)
    expect(screen.getByTestId('incall-transcript-pane')).toBeTruthy();
  });

  it('swaps transcript → outcome pane in wrap-up', () => {
    render(
      <DialerProvider skipDevice>
        <Probe />
        <InCallRoom />
      </DialerProvider>
    );
    act(() => {
      snap!.dispatch({
        type: 'START_CALL',
        call: {
          contactId: 'c1',
          contactName: 'Test Lead',
          phone: '+44',
          startedAt: 1,
          callId: 'call-1',
          campaignId: 'camp',
        },
      });
      snap!.dispatch({ type: 'CALL_ACCEPTED', startedAt: 2 });
      snap!.dispatch({ type: 'CALL_ENDED', reason: 'user_hangup' });
    });
    expect(screen.queryByTestId('incall-transcript-pane')).toBeNull();
    expect(screen.getByTestId('incall-postcall-pane')).toBeTruthy();
  });
});
