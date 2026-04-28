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

  it('31403 → call refused (Client forbidden, permission issue)', () => {
    expect(mapTwilioError(31403, '').friendlyMessage).toMatch(/refused/i);
    expect(mapTwilioError(31403, '').fatal).toBe(true);
  });

  it('31486 → destination busy, NOT refused (PR 146)', () => {
    // PR 146 (Hugo 2026-04-28): verified against Twilio Events for
    // call CAa0bf687d8be56e87fd62a25af65c3b1e — dial_call_status was
    // "busy" for a real UK destination. The previous "Call refused
    // by Twilio" toast misled Hugo into thinking the app was rejecting
    // the call. New copy makes the carrier-side cause clear.
    const r = mapTwilioError(31486, '');
    expect(r.friendlyMessage).toMatch(/busy/i);
    expect(r.friendlyMessage).not.toMatch(/refused/i);
    expect(r.fatal).toBe(true);
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

  // PR 146: 31403 / 31486 fatal-flag test consolidated into the new
  // per-code tests above. Each one now also pins the friendly copy.

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

  // PR 144 (Hugo 2026-04-28): the Voice JS SDK collapses
  // ConnectionDeclined / InvalidJWTToken / JWTTokenExpired into 31005
  // when `enableImprovedSignalingErrorPrecision: false`. PR 144 enables
  // that flag — the precise codes now surface and need their own
  // friendly messages.
  it('31002 (ConnectionDeclined) → call declined message, fatal (PR 144)', () => {
    const r = mapTwilioError(31002, 'Call declined');
    expect(r.friendlyMessage).toMatch(/declined|unreachable/i);
    expect(r.fatal).toBe(true);
  });

  it('31204 (InvalidJWTToken) → auth error, fatal (PR 144)', () => {
    const r = mapTwilioError(31204, 'JWT validation error');
    expect(r.friendlyMessage).toMatch(/auth|token/i);
    expect(r.fatal).toBe(true);
  });

  it('31205 (JWTTokenExpired) → token expired, fatal (PR 144)', () => {
    const r = mapTwilioError(31205, 'JWT expired');
    expect(r.friendlyMessage).toMatch(/expired/i);
    expect(r.fatal).toBe(true);
  });

  it('unknown code → generic fallback, non-fatal', () => {
    const r = mapTwilioError(99999, 'whatever');
    expect(r.friendlyMessage).toMatch(/Call error/);
    expect(r.fatal).toBe(false);
  });
});
