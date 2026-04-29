import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useEffect } from 'react';

// Stub supabase + Twilio device so the provider mounts in JSDOM
// without trying to register a real device.
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
  createDevice: vi.fn().mockResolvedValue({ device: null, identity: 'x', extension: null }),
  destroyDevice: vi.fn().mockResolvedValue(undefined),
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
import type { ActiveCall } from '../state/callMachine.types';

let snap: ReturnType<typeof useDialer> | null = null;
function Probe() {
  const ctx = useDialer();
  useEffect(() => {
    snap = ctx;
  });
  snap = ctx;
  return null;
}

const FAKE_CALL: ActiveCall = {
  contactId: 'c1',
  contactName: 'Hugo',
  phone: '+447800000001',
  startedAt: 1,
  callId: null,
  campaignId: 'camp-1',
};

describe('DialerProvider', () => {
  it('exposes initial state', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    expect(snap?.callPhase).toBe('idle');
    expect(snap?.roomView).toBe('closed');
    expect(snap?.session.paused).toBe(false);
    expect(snap?.session.pacing.mode).toBe('manual');
  });

  it('dispatches START_CALL → CALL_ACCEPTED → CALL_ENDED', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.dispatch({ type: 'START_CALL', call: FAKE_CALL }));
    expect(snap!.callPhase).toBe('dialing');
    expect(snap!.roomView).toBe('open_full');
    act(() => snap!.dispatch({ type: 'CALL_ACCEPTED', startedAt: 2 }));
    expect(snap!.callPhase).toBe('in_call');
    act(() => snap!.dispatch({ type: 'CALL_ENDED', reason: 'user_hangup' }));
    expect(snap!.callPhase).toBe('stopped_waiting_outcome');
  });

  it('pause() mirrors into reducer.sessionPaused', async () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    expect(snap!.session.paused).toBe(false);
    expect(snap!.state.sessionPaused).toBe(false);
    await act(async () => {
      snap!.pause();
    });
    expect(snap!.session.paused).toBe(true);
    expect(snap!.state.sessionPaused).toBe(true);
    await act(async () => {
      snap!.resume();
    });
    expect(snap!.state.sessionPaused).toBe(false);
  });

  it('setPacing updates session.pacing', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.setPacing({ mode: 'auto_next', delaySeconds: 5 }));
    expect(snap!.session.pacing).toEqual({ mode: 'auto_next', delaySeconds: 5 });
  });

  it('recordDialed adds the contact + stamps sessionId', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.recordDialed('c1'));
    expect(snap!.session.dialedThisSession.has('c1')).toBe(true);
    expect(snap!.session.sessionId).toBeTruthy();
    expect(snap!.session.startedAt).toBeGreaterThan(0);
  });

  it('clearAll resets reducer + ends session', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.dispatch({ type: 'START_CALL', call: FAKE_CALL }));
    act(() => snap!.recordDialed('c1'));
    act(() => snap!.clearAll());
    expect(snap!.callPhase).toBe('idle');
    expect(snap!.session.sessionId).toBeNull();
    expect(snap!.session.dialedThisSession.size).toBe(0);
  });

  it('CLOSE_ROOM is gated while live', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.dispatch({ type: 'START_CALL', call: FAKE_CALL }));
    act(() => snap!.dispatch({ type: 'CALL_ACCEPTED', startedAt: 2 }));
    act(() => snap!.closeCallRoom());
    expect(snap!.roomView).toBe('open_full');
    expect(snap!.callPhase).toBe('in_call');
  });

  it('OPEN_ROOM stamps previewContactId from idle', () => {
    render(
      <DialerProvider>
        <Probe />
      </DialerProvider>
    );
    act(() => snap!.openCallRoom('c-prev'));
    expect(snap!.roomView).toBe('open_full');
    expect(snap!.state.previewContactId).toBe('c-prev');
  });
});
