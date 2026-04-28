// PR 132 (Hugo 2026-04-28, Bug 1): pins the pre-dial cleanup contract.
//
// Symptom: stack of toasts saying "Dial failed: A Call is already
// active" when dialing the next contact in a campaign. Root cause: the
// previous Twilio Voice SDK Call object hasn't been disconnected before
// device.connect() is invoked again.
//
// The fix: disconnectAllCallsAndWait disconnects every Call AND awaits
// each Call's 'disconnect' event (or a timeout). This test pins:
//   - Every Call in device.calls has .disconnect() invoked.
//   - The promise resolves only after each Call fires 'disconnect'.
//   - The 1500ms timeout fallback keeps us from hanging forever if a
//     Call never fires its 'disconnect' event (defensive).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

interface FakeDevice {
  on: ReturnType<typeof vi.fn>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  destroy: () => void;
  updateToken: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnectAll: ReturnType<typeof vi.fn>;
  calls: unknown[];
}

const deviceState: { current: FakeDevice | null } = { current: null };

vi.mock('@twilio/voice-sdk', () => {
  class Device implements FakeDevice {
    on = vi.fn();
    register = vi.fn(() => Promise.resolve());
    unregister = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    updateToken = vi.fn(() => Promise.resolve());
    connect = vi.fn(() => Promise.resolve({}));
    disconnectAll = vi.fn();
    calls: unknown[] = [];
    constructor(_token: string, _opts: unknown) {
      deviceState.current = this;
    }
  }
  return { Device };
});

beforeEach(() => {
  deviceState.current = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            token: 'tok',
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
  const mod = await import('../twilio-voice');
  await mod.destroyDevice();
  vi.resetModules();
});

interface FakeCall {
  on: (event: string, cb: () => void) => void;
  fire: (event: string) => void;
  disconnect: ReturnType<typeof vi.fn>;
}

function makeFakeCall(): FakeCall {
  const handlers: Record<string, Array<() => void>> = {};
  const obj: FakeCall = {
    on(event, cb) {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    },
    fire(event) {
      (handlers[event] ?? []).forEach((cb) => cb());
    },
    disconnect: vi.fn(),
  };
  return obj;
}

describe('disconnectAllCallsAndWait — pre-dial cleanup', () => {
  it('disconnects every Call on the Device and awaits their disconnect events', async () => {
    const { createDevice, disconnectAllCallsAndWait } = await import('../twilio-voice');
    await createDevice();

    const callA = makeFakeCall();
    const callB = makeFakeCall();
    deviceState.current!.calls.push(callA, callB);

    let resolved = false;
    const promise = disconnectAllCallsAndWait(2000).then(() => {
      resolved = true;
    });

    // Calls' .disconnect() were invoked, but no 'disconnect' event yet.
    expect(callA.disconnect).toHaveBeenCalled();
    expect(callB.disconnect).toHaveBeenCalled();
    // Promise still pending — waiting for events.
    await new Promise((r) => setTimeout(r, 5));
    expect(resolved).toBe(false);

    // Fire disconnect on both — promise should resolve.
    callA.fire('disconnect');
    callB.fire('disconnect');
    await promise;
    expect(resolved).toBe(true);
  });

  it('resolves via timeout if a Call never fires disconnect (defensive)', async () => {
    const { createDevice, disconnectAllCallsAndWait } = await import('../twilio-voice');
    await createDevice();

    const stuckCall = makeFakeCall();
    deviceState.current!.calls.push(stuckCall);

    const start = Date.now();
    await disconnectAllCallsAndWait(150);
    const elapsed = Date.now() - start;

    expect(stuckCall.disconnect).toHaveBeenCalled();
    // Should have resolved at ~150ms (give or take scheduler jitter), not
    // waited indefinitely.
    expect(elapsed).toBeLessThan(500);
  });

  it('returns immediately when the device has no calls', async () => {
    const { createDevice, disconnectAllCallsAndWait } = await import('../twilio-voice');
    await createDevice();
    // No calls pushed.
    const start = Date.now();
    await disconnectAllCallsAndWait(2000);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
