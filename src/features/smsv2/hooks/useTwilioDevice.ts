// useTwilioDevice — thin React adapter over core/integrations/twilio-voice.
//
// The Voice SDK lives in core; this hook is the only feature-side wrapper.
// It owns: device lifecycle (register on mount, destroy on unmount of the
// last consumer), the active-call ref, and mute/dtmf relays for the UI.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Call as TwilioCall } from '@twilio/voice-sdk';
import {
  createDevice,
  destroyDevice,
  dial as voiceDial,
  disconnectAllCallsAndWait,
  getDevice,
  getDeviceCalls,
} from '@/core/integrations/twilio-voice';

export type DeviceStatus = 'idle' | 'registering' | 'ready' | 'error';

let consumerCount = 0;

export function useTwilioDevice(): {
  status: DeviceStatus;
  error: string | null;
  muted: boolean;
  setMuted: (m: boolean) => void;
  dial: (phone: string, extraParams?: Record<string, string>) => Promise<TwilioCall>;
  hangup: () => Promise<void>;
  sendDigits: (digits: string) => void;
  activeCall: TwilioCall | null;
  /** PR 132 (Hugo 2026-04-28, Bug 4): wait until the SDK Device reports
   *  'registered'. Resolves to true on ready, false on timeout. */
  waitUntilReady: (timeoutMs?: number) => Promise<boolean>;
} {
  const [status, setStatus] = useState<DeviceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const callRef = useRef<TwilioCall | null>(null);
  const [activeCall, setActiveCall] = useState<TwilioCall | null>(null);

  // Register Twilio device once per page (refcounted across hook consumers).
  useEffect(() => {
    consumerCount++;
    let cancelled = false;
    (async () => {
      if (getDevice()) {
        // PR 132 (Hugo 2026-04-28, Bug 4): a stale Call from a prior tab
        // session can still be in device.calls when we re-mount. If we
        // don't evict it now, the first dial will throw "A Call is already
        // active" before the user has a chance to press anything.
        if (getDeviceCalls().length > 0) {
          await disconnectAllCallsAndWait(800).catch(() => undefined);
        }
        if (!cancelled) setStatus('ready');
        return;
      }
      setStatus('registering');
      try {
        await createDevice();
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e instanceof Error ? e.message : 'device init failed');
        }
      }
    })();
    return () => {
      cancelled = true;
      consumerCount = Math.max(0, consumerCount - 1);
      if (consumerCount === 0) void destroyDevice();
    };
  }, []);

  const dial = useCallback(async (phone: string, extraParams?: Record<string, string>) => {
    setError(null);
    // PR 132 (Hugo 2026-04-28, Bug 1): "Dial failed: A Call is already
    // active". Symptom: stack of toasts when dialing the next contact in
    // a campaign. Root cause: a prior Twilio Call object still in
    // device.calls when device.connect() runs. Before EVERY dial:
    //   1. Check device.calls AND callRef for in-flight Calls.
    //   2. Disconnect each AND wait until 'disconnect' fires (or 1500ms).
    //   3. Only then call device.connect().
    // Single source of truth: disconnectAllCallsAndWait covers both
    // (it iterates device.calls), but callRef may hold a Call that the
    // SDK never put in device.calls (outbound dials per the muteAllCalls
    // comment), so we disconnect that one explicitly too.
    if (callRef.current) {
      try { callRef.current.disconnect(); } catch { /* already gone */ }
      callRef.current = null;
      setActiveCall(null);
    }
    if (getDeviceCalls().length > 0) {
      await disconnectAllCallsAndWait(1500).catch((e) =>
        console.warn('[useTwilioDevice] pre-dial flush threw', e)
      );
    }
    try {
      const call = await voiceDial({ to: phone, extraParams });
      callRef.current = call;
      setActiveCall(call);
      call.on('disconnect', () => {
        callRef.current = null;
        setActiveCall(null);
      });
      call.on('cancel', () => {
        callRef.current = null;
        setActiveCall(null);
      });
      call.on('reject', () => {
        callRef.current = null;
        setActiveCall(null);
      });
      return call;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'dial failed');
      throw e;
    }
  }, []);

  // PR 132 (Hugo 2026-04-28, Bug 1): hangup is now async. The auto-hangup
  // and manual End must AWAIT it before firing the next leg, otherwise
  // device.connect() races with the prior Call's 'disconnect' event and
  // we hit "A Call is already active" again.
  const hangup = useCallback(async (): Promise<void> => {
    const c = callRef.current;
    if (!c) return;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      try {
        c.on('disconnect', finish);
        c.on('cancel', finish);
        c.on('reject', finish);
      } catch { /* ignore */ }
      try { c.disconnect(); } catch { finish(); return; }
      window.setTimeout(finish, 1500);
    });
    callRef.current = null;
    setActiveCall(null);
  }, []);

  // PR 132 (Hugo 2026-04-28, Bug 4): "the first number that rings is
  // always staying silent". Root cause hypothesis: handleStart fires
  // wk-dialer-start while the Twilio Device is still 'registering', so
  // the agent's WebRTC leg can't bridge. waitUntilReady polls the hook's
  // own status state (which becomes 'ready' once createDevice resolves)
  // for up to timeoutMs.
  const waitUntilReady = useCallback(async (timeoutMs = 3000): Promise<boolean> => {
    if (status === 'ready') return true;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      // Polling getDevice() is the safest signal — it reflects the module-
      // level state regardless of React batching of setStatus.
      if (getDevice()) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return getDevice() !== null;
  }, [status]);

  const sendDigits = useCallback((digits: string) => {
    try { callRef.current?.sendDigits(digits); } catch { /* ignore */ }
  }, []);

  const setMuted = useCallback((m: boolean) => {
    try { callRef.current?.mute(m); } catch { /* ignore */ }
    setMutedState(m);
  }, []);

  return { status, error, muted, setMuted, dial, hangup, sendDigits, activeCall, waitUntilReady };
}
