// Pins muteAllCalls fallback behavior. Hugo's repro (2026-04-26):
// console showed `[twilio-voice] muteAllCalls { calls: 0, senders: [] }`
// during a live call — the Twilio SDK's `device.calls` array is EMPTY for
// outbound dials placed via device.connect(). The active Call object lives
// only on the ref the caller holds. Without a fallback, muteAllCalls iterates
// nothing and the agent's mic keeps streaming. The fix: pass the active Call
// as a fallback so muteAllCalls always has at least one target.

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
  on: (event: string, cb: (arg?: unknown) => void) => void;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  destroy: () => void;
  updateToken: (t: string) => Promise<void>;
  connect: (opts: unknown) => Promise<unknown>;
  calls: unknown[];
  audio?: unknown;
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
    // Empty calls array — mirrors Twilio's actual behavior for outbound dials
    // (verified live from Hugo's prod console).
    calls: unknown[] = [];
    audio = { setAudioConstraints: vi.fn() };
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
  const mod = await import('../twilio-voice');
  await mod.destroyDevice();
  vi.resetModules();
});

interface FakeCall {
  mute: ReturnType<typeof vi.fn>;
  isMuted: ReturnType<typeof vi.fn>;
  getLocalStream: () => MediaStream | undefined;
  _mediaHandler?: { version?: { pc?: unknown } };
}

function makeFakeCall(): FakeCall {
  return {
    mute: vi.fn(),
    isMuted: vi.fn(() => false),
    getLocalStream: () => undefined,
    _mediaHandler: undefined,
  };
}

describe('muteAllCalls fallback target', () => {
  it('uses fallbackCall when device.calls is empty', async () => {
    const { createDevice, muteAllCalls } = await import('../twilio-voice');
    await createDevice();

    const fallback = makeFakeCall();

    // Twilio Device reports zero calls for outbound dials (Hugo's bug).
    // Without the fallback param, muteAllCalls would mute nothing.
    const ok = muteAllCalls(true, fallback as unknown as never);

    expect(fallback.mute).toHaveBeenCalledWith(true);
    expect(ok).toBe(true);
  });

  it('does NOT use fallback when device.calls has entries (prefers SDK list)', async () => {
    const { createDevice, muteAllCalls } = await import('../twilio-voice');
    await createDevice();

    // Push a real Call onto the device's list (simulates inbound which DOES
    // populate device.calls). The fallback should be ignored — we want to
    // mute the real list, not duplicate.
    const realOnList = makeFakeCall();
    deviceState.current!.calls.push(realOnList as unknown);

    const fallback = makeFakeCall();
    muteAllCalls(true, fallback as unknown as never);

    expect(realOnList.mute).toHaveBeenCalledWith(true);
    expect(fallback.mute).not.toHaveBeenCalled();
  });

  it('returns false and is a no-op when both list and fallback are empty', async () => {
    const { createDevice, muteAllCalls } = await import('../twilio-voice');
    await createDevice();

    const ok = muteAllCalls(true);
    expect(ok).toBe(false);
  });
});
