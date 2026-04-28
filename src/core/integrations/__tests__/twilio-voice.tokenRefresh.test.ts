// PR 132 (Hugo 2026-04-28, Bug 2): pins the auto-refresh contract for
// the Twilio Voice SDK.
//
// Goal: when the SDK fires error code 31005 ("Connection lost") OR
// tokenWillExpire, the device should refetch a new token from
// wk-voice-token and call device.updateToken with it. The agent never
// sees "Refresh the page" again.

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
  connect: (opts: unknown) => Promise<unknown>;
  calls: unknown[];
  // Allow tests to drive 'error' / 'tokenWillExpire' from outside.
  fire: (event: string, payload?: unknown) => void;
}

const deviceState: { current: FakeDevice | null } = { current: null };

vi.mock('@twilio/voice-sdk', () => {
  class Device implements FakeDevice {
    handlers: Record<string, Array<(p?: unknown) => void>> = {};
    on = vi.fn((event: string, cb: (p?: unknown) => void) => {
      this.handlers[event] = this.handlers[event] ?? [];
      this.handlers[event].push(cb);
    });
    register = vi.fn(() => Promise.resolve());
    unregister = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    updateToken = vi.fn(() => Promise.resolve());
    connect = vi.fn(() => Promise.resolve({}));
    calls: unknown[] = [];
    fire = (event: string, payload?: unknown) => {
      (this.handlers[event] ?? []).forEach((cb) => cb(payload));
    };
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
            token: 'next-token-' + Math.random().toString(36).slice(2),
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

describe('twilio-voice — auto token refresh on device error', () => {
  it('refetches and calls updateToken when error code 31005 fires', async () => {
    const { createDevice } = await import('../twilio-voice');
    await createDevice();
    const dev = deviceState.current!;
    expect(dev.updateToken).not.toHaveBeenCalled();

    // Simulate a 31005 ("Connection lost") signaling drop.
    dev.fire('error', { code: 31005, message: 'Connection lost' });

    // Wait a microtask — refreshDeviceToken is async (fetch + updateToken).
    await new Promise((r) => setTimeout(r, 10));

    expect(dev.updateToken).toHaveBeenCalledTimes(1);
    expect(dev.updateToken).toHaveBeenCalledWith(expect.stringContaining('next-token-'));
  });

  it('refetches on tokenWillExpire too', async () => {
    const { createDevice } = await import('../twilio-voice');
    await createDevice();
    const dev = deviceState.current!;
    expect(dev.updateToken).not.toHaveBeenCalled();

    dev.fire('tokenWillExpire');

    await new Promise((r) => setTimeout(r, 10));

    expect(dev.updateToken).toHaveBeenCalledTimes(1);
  });

  it('does NOT refetch on unrelated error codes (e.g. 31401 mic denied)', async () => {
    const { createDevice } = await import('../twilio-voice');
    await createDevice();
    const dev = deviceState.current!;

    dev.fire('error', { code: 31401, message: 'Mic denied' });
    await new Promise((r) => setTimeout(r, 10));

    expect(dev.updateToken).not.toHaveBeenCalled();
  });

  it('fires the persistent-fail listener after 3 consecutive token refresh failures', async () => {
    const { createDevice, addTokenRefreshFailListener, __test_resetTokenFailureCount } =
      await import('../twilio-voice');
    __test_resetTokenFailureCount();
    await createDevice();
    const dev = deviceState.current!;

    // Make every fetch fail.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('net err')))
    );
    const listener = vi.fn();
    addTokenRefreshFailListener(listener);

    // Three consecutive 31005 errors → three failed refreshes → one
    // listener invocation (single persistent banner, NOT a stack).
    dev.fire('error', { code: 31005 });
    await new Promise((r) => setTimeout(r, 5));
    dev.fire('error', { code: 31005 });
    await new Promise((r) => setTimeout(r, 5));
    dev.fire('error', { code: 31005 });
    await new Promise((r) => setTimeout(r, 5));

    expect(listener).toHaveBeenCalledTimes(1);
    // Listener receives a retry function — calling it should re-attempt.
    expect(typeof listener.mock.calls[0][0]).toBe('function');
  });
});
