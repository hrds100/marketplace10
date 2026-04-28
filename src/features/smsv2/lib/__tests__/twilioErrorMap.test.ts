// PR 138 (Hugo 2026-04-28): pin friendly messages + fatal flag for the
// Twilio error codes the dialer surfaces.

import { describe, it, expect } from 'vitest';
import { mapTwilioError } from '../twilioErrorMap';

describe('mapTwilioError', () => {
  it('31401 (mic blocked) → friendly mic message, non-fatal', () => {
    const r = mapTwilioError(31401, 'AcquisitionFailedError');
    expect(r.friendlyMessage).toMatch(/Mic blocked/i);
    expect(r.fatal).toBe(false);
  });

  it('31403 / 31486 → call refused', () => {
    expect(mapTwilioError(31403, '').friendlyMessage).toMatch(/refused/i);
    expect(mapTwilioError(31486, '').friendlyMessage).toMatch(/refused/i);
  });

  it('31005 / 31009 → connection lost, fatal (PR 142)', () => {
    // PR 142: was non-fatal — gateway HANGUP doesn't recover, so the
    // reducer must flip out of the live phase immediately. Treating it
    // as fatal is what stops the repeated-31005 loop and the
    // stuck-in-RINGING room.
    const r = mapTwilioError(31005, '');
    expect(r.friendlyMessage).toMatch(/Connection lost/i);
    expect(r.fatal).toBe(true);
    const r2 = mapTwilioError(31009, '');
    expect(r2.fatal).toBe(true);
  });

  it('31403 / 31486 → call refused, fatal (PR 142)', () => {
    expect(mapTwilioError(31403, '').fatal).toBe(true);
    expect(mapTwilioError(31486, '').fatal).toBe(true);
  });

  it('31000 → call dropped, fatal', () => {
    const r = mapTwilioError(31000, '');
    expect(r.friendlyMessage).toMatch(/Call dropped/i);
    expect(r.fatal).toBe(true);
  });

  it('13224 → invalid number, fatal (PR 138)', () => {
    const r = mapTwilioError(13224, '');
    expect(r.friendlyMessage).toMatch(/unreachable/i);
    expect(r.friendlyMessage).toMatch(/UK carrier/i);
    expect(r.fatal).toBe(true);
  });

  it('unknown code → generic fallback, non-fatal', () => {
    const r = mapTwilioError(99999, 'whatever');
    expect(r.friendlyMessage).toMatch(/Call error/);
    expect(r.fatal).toBe(false);
  });
});
