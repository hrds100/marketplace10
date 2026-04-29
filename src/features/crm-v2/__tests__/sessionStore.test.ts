import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSessionStore,
  DEFAULT_PACING,
} from '../state/sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial snapshot is empty + manual pacing', () => {
    const store = createSessionStore();
    const s = store.getSnapshot();
    expect(s.sessionId).toBeNull();
    expect(s.startedAt).toBeNull();
    expect(s.paused).toBe(false);
    expect(s.pacing).toEqual(DEFAULT_PACING);
    expect(s.dialedThisSession.size).toBe(0);
    expect(s.activeCampaignId).toBeNull();
  });

  it('recordDialed stamps sessionId + startedAt on first call', () => {
    const store = createSessionStore();
    store.recordDialed('c1');
    const s = store.getSnapshot();
    expect(s.sessionId).toBeTruthy();
    expect(s.startedAt).toBe(Date.parse('2026-04-29T10:00:00Z'));
    expect(s.dialedThisSession.has('c1')).toBe(true);
  });

  it('recordDialed is idempotent on the same contactId', () => {
    const store = createSessionStore();
    store.recordDialed('c1');
    const before = store.getSnapshot();
    store.recordDialed('c1');
    const after = store.getSnapshot();
    expect(after.dialedThisSession.size).toBe(1);
    expect(after.sessionId).toBe(before.sessionId);
  });

  it('pause / resume only fires when value actually changes', () => {
    const store = createSessionStore();
    let bumps = 0;
    store.subscribe(() => bumps++);
    store.pause();
    store.pause();
    store.resume();
    store.resume();
    expect(bumps).toBe(2);
  });

  it('setPacing rejects invalid mode + clamps delay 0..60', () => {
    const store = createSessionStore();
    store.setPacing({ mode: 'auto_next', delaySeconds: -5 });
    expect(store.getSnapshot().pacing.delaySeconds).toBe(0);
    store.setPacing({ mode: 'auto_next', delaySeconds: 999 });
    expect(store.getSnapshot().pacing.delaySeconds).toBe(60);
    // Bogus mode → no-op; previous delay (60) preserved.
    store.setPacing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mode: 'turbo' as any,
      delaySeconds: 5,
    });
    expect(store.getSnapshot().pacing.mode).toBe('auto_next');
    expect(store.getSnapshot().pacing.delaySeconds).toBe(60);
  });

  it('setActiveCampaignId only fires on actual change', () => {
    const store = createSessionStore();
    let bumps = 0;
    store.subscribe(() => bumps++);
    store.setActiveCampaignId('c1');
    store.setActiveCampaignId('c1');
    store.setActiveCampaignId('c2');
    store.setActiveCampaignId(null);
    expect(bumps).toBe(3);
  });

  it('endSession clears sessionId + dialedSet + paused + pacing', () => {
    const store = createSessionStore();
    store.recordDialed('c1');
    store.recordDialed('c2');
    store.pause();
    store.setPacing({ mode: 'auto_next', delaySeconds: 10 });
    store.setActiveCampaignId('camp');
    store.endSession();
    const s = store.getSnapshot();
    expect(s.sessionId).toBeNull();
    expect(s.startedAt).toBeNull();
    expect(s.paused).toBe(false);
    expect(s.pacing).toEqual(DEFAULT_PACING);
    expect(s.dialedThisSession.size).toBe(0);
    expect(s.activeCampaignId).toBeNull();
  });

  it('subscribers receive callbacks; unsubscribe stops them', () => {
    const store = createSessionStore();
    const calls: number[] = [];
    const unsub = store.subscribe(() => calls.push(1));
    store.recordDialed('c1');
    store.recordDialed('c2');
    unsub();
    store.recordDialed('c3');
    expect(calls).toHaveLength(2);
  });
});
