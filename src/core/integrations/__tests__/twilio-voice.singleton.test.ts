// PR 144 (Hugo 2026-04-28): pin the createDevice singleton-lock contract.
//
// Audit (Phase 1.4): the original createDevice had a TOCTOU race —
//
//   if (device && currentToken) return ...;
//   const tokenResp = await fetchVoiceToken();   // ← await yields
//   const d = new Device(...);
//   await d.register();
//   device = d;
//
// Two concurrent consumers (e.g. Softphone + DialerPage mounting in
// parallel, or React Strict-Mode double-mount in dev) could both pass
// the early-return check, both fetch a token, both `new Device(...)`,
// both register. The module-scoped `device` ends up pointing at the
// SECOND one — but the FIRST is alive in memory, registered to Twilio
// with the same identity. The gateway then evicts one with `error
// 31005 HANGUP` (the same root cause we hit in PR 143's multi-tab fix,
// but in a single tab).
//
// PR 144 wraps the body in an in-flight singleton — concurrent callers
// share the same Promise.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: {
              access_token: 'fake-jwt',
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          error: null,
        }),
    },
  },
}));

let constructorCalls = 0;
let registerCalls = 0;

vi.mock('@twilio/voice-sdk', () => {
  class Device {
    handlers: Record<string, Array<(p?: unknown) => void>> = {};
    on = vi.fn((event: string, cb: (p?: unknown) => void) => {
      this.handlers[event] = this.handlers[event] ?? [];
      this.handlers[event].push(cb);
    });
    register = vi.fn(() => {
      registerCalls++;
      return new Promise<void>((resolve) => setTimeout(resolve, 5));
    });
    unregister = vi.fn(() => Promise.resolve());
    destroy = vi.fn();
    updateToken = vi.fn(() => Promise.resolve());
    connect = vi.fn(() => Promise.resolve({}));
    calls: unknown[] = [];
    constructor(_token: string, _opts: unknown) {
      constructorCalls++;
    }
  }
  return { Device };
});

beforeEach(() => {
  constructorCalls = 0;
  registerCalls = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            token: 'fake-token',
            identity: 'user-1:session-1',
            ttl_seconds: 3600,
            extension: null,
          }),
      })
    )
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  // Reset the module so a follow-up test starts from scratch.
  vi.resetModules();
});

describe('createDevice — singleton lock (PR 144)', () => {
  it('two concurrent createDevice calls produce ONLY ONE Device instance', async () => {
    const mod = await import('../twilio-voice');
    const [a, b] = await Promise.all([mod.createDevice(), mod.createDevice()]);
    expect(constructorCalls).toBe(1);
    expect(registerCalls).toBe(1);
    expect(a.identity).toBe(b.identity);
  });

  it('concurrent callers all share the same in-flight Promise (no double fetch)', async () => {
    const mod = await import('../twilio-voice');
    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const calls = await Promise.all([
      mod.createDevice(),
      mod.createDevice(),
      mod.createDevice(),
    ]);
    // Only one wk-voice-token call should have fired.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // All three handles refer to the same identity.
    const ids = new Set(calls.map((c) => c.identity));
    expect(ids.size).toBe(1);
  });

  it('a SECOND createDevice after the first resolved still reuses the existing Device (early-return path)', async () => {
    const mod = await import('../twilio-voice');
    const a = await mod.createDevice();
    expect(constructorCalls).toBe(1);
    const b = await mod.createDevice();
    expect(constructorCalls).toBe(1); // still one
    expect(a.identity).toBe(b.identity);
  });
});
