// PR 151 (Hugo 2026-04-29): pin the contract for useDialerSession.
// The provider owns paused, pacing, dialedThisSession, sessionId,
// startedAt — and exposes pause/resume/setPacing/recordDialed/endSession
// as the only mutation surface.

import { describe, it, expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import {
  DialerSessionProvider,
  useDialerSession,
  type DialerSessionApi,
} from '../useDialerSession';

let snap: DialerSessionApi | null = null;

function Probe() {
  const ctx = useDialerSession();
  useEffect(() => {
    snap = ctx;
  });
  snap = ctx;
  return null;
}

function renderProvider() {
  return render(
    <DialerSessionProvider>
      <Probe />
    </DialerSessionProvider>
  );
}

describe('useDialerSession — initial state', () => {
  it('initial sessionId, startedAt are null until first dial', () => {
    snap = null;
    renderProvider();
    expect(snap!.sessionId).toBeNull();
    expect(snap!.startedAt).toBeNull();
  });

  it('initial paused is false; pacing defaults to manual / 0s', () => {
    snap = null;
    renderProvider();
    expect(snap!.paused).toBe(false);
    expect(snap!.pacing.mode).toBe('manual');
    expect(snap!.pacing.delaySeconds).toBe(0);
  });

  it('initial dialedThisSession is empty', () => {
    snap = null;
    renderProvider();
    expect(snap!.dialedThisSession.size).toBe(0);
  });
});

describe('useDialerSession — recordDialed', () => {
  it('first recordDialed stamps a sessionId and startedAt', () => {
    snap = null;
    renderProvider();
    expect(snap!.sessionId).toBeNull();
    act(() => snap!.recordDialed('contact-1'));
    expect(snap!.sessionId).not.toBeNull();
    expect(snap!.startedAt).not.toBeNull();
    expect(snap!.dialedThisSession.has('contact-1')).toBe(true);
  });

  it('subsequent recordDialed reuses the same sessionId', () => {
    snap = null;
    renderProvider();
    act(() => snap!.recordDialed('contact-1'));
    const id1 = snap!.sessionId;
    act(() => snap!.recordDialed('contact-2'));
    expect(snap!.sessionId).toBe(id1);
    expect(snap!.dialedThisSession.size).toBe(2);
  });

  it('recordDialed is idempotent for the same contactId', () => {
    snap = null;
    renderProvider();
    act(() => snap!.recordDialed('contact-1'));
    const before = snap!.dialedThisSession;
    act(() => snap!.recordDialed('contact-1'));
    expect(snap!.dialedThisSession).toBe(before);
  });
});

describe('useDialerSession — pause / resume', () => {
  it('pause() sets paused=true; resume() clears it', () => {
    snap = null;
    renderProvider();
    expect(snap!.paused).toBe(false);
    act(() => snap!.pause());
    expect(snap!.paused).toBe(true);
    act(() => snap!.resume());
    expect(snap!.paused).toBe(false);
  });

  it('pause() is idempotent', () => {
    snap = null;
    renderProvider();
    act(() => snap!.pause());
    const ref = snap;
    act(() => snap!.pause());
    expect(snap!.paused).toBe(ref!.paused);
  });
});

describe('useDialerSession — setPacing', () => {
  it('setPacing replaces mode + delaySeconds', () => {
    snap = null;
    renderProvider();
    act(() => snap!.setPacing({ mode: 'auto_next', delaySeconds: 5 }));
    expect(snap!.pacing).toEqual({ mode: 'auto_next', delaySeconds: 5 });
  });

  it('setPacing rejects negative delaySeconds (validation)', () => {
    snap = null;
    renderProvider();
    const before = snap!.pacing;
    act(() => snap!.setPacing({ mode: 'auto_next', delaySeconds: -1 }));
    expect(snap!.pacing).toEqual(before);
  });

  it('setPacing rejects unknown mode (validation)', () => {
    snap = null;
    renderProvider();
    const before = snap!.pacing;
    act(() =>
      snap!.setPacing({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mode: 'predictive' as any,
        delaySeconds: 5,
      })
    );
    expect(snap!.pacing).toEqual(before);
  });
});

describe('useDialerSession — endSession', () => {
  it('endSession wipes everything back to defaults', () => {
    snap = null;
    renderProvider();
    act(() => snap!.recordDialed('contact-1'));
    act(() => snap!.pause());
    act(() => snap!.setPacing({ mode: 'auto_next', delaySeconds: 10 }));
    expect(snap!.sessionId).not.toBeNull();
    expect(snap!.paused).toBe(true);
    expect(snap!.pacing.mode).toBe('auto_next');
    expect(snap!.dialedThisSession.size).toBe(1);

    act(() => snap!.endSession());
    expect(snap!.sessionId).toBeNull();
    expect(snap!.startedAt).toBeNull();
    expect(snap!.paused).toBe(false);
    expect(snap!.pacing.mode).toBe('manual');
    expect(snap!.pacing.delaySeconds).toBe(0);
    expect(snap!.dialedThisSession.size).toBe(0);
  });
});

describe('useDialerSession — guard', () => {
  it('throws if used outside DialerSessionProvider', () => {
    function NoProviderProbe() {
      useDialerSession();
      return null;
    }
    expect(() => render(<NoProviderProbe />)).toThrow(/DialerSessionProvider/);
  });
});
