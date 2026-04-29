// PR 149 (Hugo 2026-04-29): pin the structured-log helper contract.
// Future call sites must produce a single `[dialer]` line per event
// with a typed payload. Tests assert the shape so log-aggregator
// consumers (later PRs) have a stable contract.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dialerLog } from '../dialerLog';

let infoSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dialerLog', () => {
  it('emits a single info line tagged [dialer] with ts + ev + ctx', () => {
    dialerLog('start', {
      callId: 'call-1',
      contactId: 'contact-1',
      agentId: 'agent-1',
      campaignId: 'camp-1',
    });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [tag, payload] = infoSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(tag).toBe('[dialer]');
    expect(payload.ev).toBe('start');
    expect(typeof payload.ts).toBe('number');
    expect(payload.callId).toBe('call-1');
    expect(payload.contactId).toBe('contact-1');
    expect(payload.agentId).toBe('agent-1');
    expect(payload.campaignId).toBe('camp-1');
  });

  it('strips undefined fields from the payload (no noise)', () => {
    dialerLog('ringing', { callId: 'call-2', contactId: undefined });
    const [, payload] = infoSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect('contactId' in payload).toBe(false);
    expect(payload.callId).toBe('call-2');
  });

  it('routes warn level through console.warn', () => {
    dialerLog('error', { callId: 'c' }, 'warn');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('routes error level through console.error', () => {
    dialerLog('error', { callId: 'c' }, 'error');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('default level is info', () => {
    dialerLog('connected', { callId: 'c' });
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('every event line carries an epoch ts', () => {
    const before = Date.now();
    dialerLog('start');
    const after = Date.now();
    const [, payload] = infoSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.ts).toBeGreaterThanOrEqual(before);
    expect(payload.ts).toBeLessThanOrEqual(after);
  });

  it('accepts state-transition fields fromPhase / toPhase / source', () => {
    dialerLog('ended', {
      callId: 'c',
      fromPhase: 'in_call',
      toPhase: 'stopped_waiting_outcome',
      source: 'twilio.disconnect',
    });
    const [, payload] = infoSpy.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.fromPhase).toBe('in_call');
    expect(payload.toPhase).toBe('stopped_waiting_outcome');
    expect(payload.source).toBe('twilio.disconnect');
  });
});
