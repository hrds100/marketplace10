// useRingbackTone — synthetic UK ringback tone in the agent's browser
// while the parallel dialer's legs are still ringing.
//
// PR 120 (Hugo 2026-04-28): when the agent fires 3 parallel lines, the
// browser softphone is silent until one leg connects (Twilio is dialing
// the contacts, not the agent). Hugo's brief: "ringing of the lines that
// are ringing all together" — agents need audio feedback so the dialer
// feels live. We synthesise a UK ring (two-burst pattern at 400+450 Hz)
// via the Web Audio API. No asset, no file, no network — just maths.
//
// Usage:
//   useRingbackTone(legs.some(l => l.status === 'queued' || l.status === 'ringing'));
//
// Stops automatically when `active` flips to false (a leg connected,
// the agent hung up, or the dialer went idle). Browser autoplay rules
// are satisfied because the agent clicked Start before this fires —
// that user gesture keeps the AudioContext alive.

import { useEffect, useRef } from 'react';

// UK ringback: two bursts of 400+450 Hz at 0.4s each, 0.2s gap between
// them, then 2.0s of silence. Total cycle = 3.0s. (US pattern is one
// 2s burst at 440+480 Hz then 4s silence — UK feels more familiar to
// Hugo's UK property leads.)
const RING_FREQS = [400, 450];
const PATTERN_MS: Array<{ on: boolean; ms: number }> = [
  { on: true, ms: 400 },
  { on: false, ms: 200 },
  { on: true, ms: 400 },
  { on: false, ms: 2000 },
];

// Volume — kept low so the tone sits below speech and doesn't blow out
// the agent's headset on the moment the call bridges.
const RING_GAIN = 0.04;

export function useRingbackTone(active: boolean): void {
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }

    // Some test environments (jsdom) don't expose AudioContext. Bail
    // silently rather than crash — the rest of the dialer still works.
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    // Newer browsers start the context in 'suspended' until a user
    // gesture. The agent clicked Start moments ago, so resume() is
    // allowed to succeed.
    void ctx.resume().catch(() => {
      /* ignore — autoplay policy may block, the tone just won't play */
    });

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const oscs = RING_FREQS.map((freq) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(gain);
      o.start();
      return o;
    });

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let phase = 0;

    const step = () => {
      if (cancelled) return;
      const cur = PATTERN_MS[phase % PATTERN_MS.length];
      // setTargetAtTime gives a ~10ms ramp so the tone fades in/out
      // smoothly instead of clicking on each pattern boundary.
      gain.gain.setTargetAtTime(cur.on ? RING_GAIN : 0, ctx.currentTime, 0.01);
      timeoutId = setTimeout(() => {
        phase += 1;
        step();
      }, cur.ms);
    };
    step();

    stopRef.current = () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      // Quick fade-out so we don't clip when the call bridges.
      try {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      } catch {
        /* ignore — context may already be closed */
      }
      // Tear down after the fade so the user doesn't hear a click.
      setTimeout(() => {
        for (const o of oscs) {
          try {
            o.stop();
          } catch {
            /* already stopped */
          }
          try {
            o.disconnect();
          } catch {
            /* already disconnected */
          }
        }
        try {
          gain.disconnect();
        } catch {
          /* already disconnected */
        }
        try {
          void ctx.close();
        } catch {
          /* already closed */
        }
      }, 120);
    };

    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [active]);
}
