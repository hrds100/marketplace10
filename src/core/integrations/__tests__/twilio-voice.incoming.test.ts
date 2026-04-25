// Pins the incoming-call wiring inside core/integrations/twilio-voice.ts.
// We can't run the real Twilio SDK in jsdom, so we model the SDK as a fake
// Device whose `.on('incoming', cb)` fires when we manually invoke the
// captured handler.
//
// Contract:
//   1. createDevice() registers a Device.on('incoming') handler.
//   2. When the SDK delivers an incoming call, the handler:
//        a. calls call.accept() so the agent's audio is connected
//        b. notifies any addIncomingCallListener subscribers with the call

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase + voice token fetch — we never want real network in tests.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: 'fake-jwt' } },
          error: null,
        }),
    },
  },
}));

// Capture the latest fake Device created so tests can drive its events.
const deviceState: {
  current: FakeDevice | null;
  handlers: Record<string, Array<(arg?: unknown) => void>>;
} = { current: null, handlers: {} };

interface FakeDevice {
  on: (event: string, cb: (arg?: unknown) => void) => void;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  destroy: () => void;
  updateToken: (t: string) => Promise<void>;
  connect: (opts: unknown) => Promise<unknown>;
}

vi.mock('@twilio/voice-sdk', () => {
  class Device implements FakeDevice {
    on(event: string, cb: (arg?: unknown) => void): void {
      deviceState.handlers[event] = deviceState.handlers[event] ?? [];
      deviceState.handlers[event].push(cb);
    }
    register = vi.fn(() => Promise.resolve());
    unregister = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    updateToken = vi.fn(() => Promise.resolve());
    connect = vi.fn(() => Promise.resolve({}));
    constructor(_token: string, _opts: unknown) {
      deviceState.current = this;
    }
  }
  return { Device };
});

// Mock the global fetch so fetchVoiceToken doesn't need a network.
beforeEach(() => {
  deviceState.current = null;
  deviceState.handlers = {};
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            token: 'twiml-token',
            identity: 'user-1',
            ttl_seconds: 3600,
            extension: '100',
          }),
      })
    )
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  // Tear the module down to reset the singleton device between tests.
  const mod = await import('../twilio-voice');
  await mod.destroyDevice();
  vi.resetModules();
});

describe('twilio-voice incoming call wiring', () => {
  it('createDevice() registers an "incoming" handler on the Device', async () => {
    const { createDevice } = await import('../twilio-voice');
    await createDevice();
    expect(deviceState.handlers.incoming).toBeDefined();
    expect(deviceState.handlers.incoming.length).toBeGreaterThan(0);
  });

  it('on incoming, the handler calls call.accept() and notifies subscribers', async () => {
    const { createDevice, addIncomingCallListener } = await import('../twilio-voice');
    await createDevice();

    const listener = vi.fn();
    addIncomingCallListener(listener);

    const fakeCall = {
      accept: vi.fn(),
      on: vi.fn(),
      parameters: new Map([['CallSid', 'CA-123']]),
    };
    // Simulate Twilio SDK firing the incoming event.
    deviceState.handlers.incoming.forEach((cb) => cb(fakeCall));

    expect(fakeCall.accept).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(fakeCall);
  });

  it('addIncomingCallListener returns an unsubscribe function', async () => {
    const { createDevice, addIncomingCallListener } = await import('../twilio-voice');
    await createDevice();

    const listener = vi.fn();
    const unsubscribe = addIncomingCallListener(listener);
    unsubscribe();

    const fakeCall = { accept: vi.fn(), on: vi.fn(), parameters: new Map() };
    deviceState.handlers.incoming.forEach((cb) => cb(fakeCall));

    // accept still fires (auto-answer is still on), listener does NOT
    expect(fakeCall.accept).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
