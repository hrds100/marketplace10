// PR 143 (Hugo 2026-04-28): pin the identity contract.
//
// wk-voice-token mints `${user.id}:${sessionId}` to avoid multi-tab
// gateway collisions. wk-voice-twiml-outgoing parses `From=client:<id>`
// to recover the bare agent_id for DB lookups. These tests pin the
// behaviour both sides depend on.

import { describe, it, expect } from 'vitest';
import { parseVoiceIdentity, buildVoiceIdentity } from '../parseVoiceIdentity';

const AGENT = '11111111-1111-1111-1111-111111111111';
const SESSION = '22222222-2222-2222-2222-222222222222';

describe('parseVoiceIdentity', () => {
  it('parses the current scheme: agentId:sessionId', () => {
    expect(parseVoiceIdentity(`${AGENT}:${SESSION}`)).toEqual({
      agentId: AGENT,
      sessionId: SESSION,
      raw: `${AGENT}:${SESSION}`,
    });
  });

  it('parses with the Twilio client: prefix that arrives in From params', () => {
    expect(parseVoiceIdentity(`client:${AGENT}:${SESSION}`)).toEqual({
      agentId: AGENT,
      sessionId: SESSION,
      raw: `${AGENT}:${SESSION}`,
    });
  });

  it('parses legacy un-suffixed identity (back-compat)', () => {
    expect(parseVoiceIdentity(AGENT)).toEqual({
      agentId: AGENT,
      sessionId: null,
      raw: AGENT,
    });
  });

  it('parses legacy un-suffixed identity with client: prefix', () => {
    expect(parseVoiceIdentity(`client:${AGENT}`)).toEqual({
      agentId: AGENT,
      sessionId: null,
      raw: AGENT,
    });
  });

  it('handles whitespace', () => {
    expect(parseVoiceIdentity(`  client:${AGENT}:${SESSION}  `)).toEqual({
      agentId: AGENT,
      sessionId: SESSION,
      raw: `${AGENT}:${SESSION}`,
    });
  });

  it('returns null for empty / nullish inputs', () => {
    expect(parseVoiceIdentity('')).toBeNull();
    expect(parseVoiceIdentity(null)).toBeNull();
    expect(parseVoiceIdentity(undefined)).toBeNull();
    expect(parseVoiceIdentity('   ')).toBeNull();
    expect(parseVoiceIdentity('client:')).toBeNull();
  });

  it('treats trailing colon with no session as legacy (sessionId null)', () => {
    expect(parseVoiceIdentity(`${AGENT}:`)).toEqual({
      agentId: AGENT,
      sessionId: null,
      raw: `${AGENT}:`,
    });
  });
});

describe('buildVoiceIdentity', () => {
  it('joins agent + session with a colon', () => {
    expect(buildVoiceIdentity(AGENT, SESSION)).toBe(`${AGENT}:${SESSION}`);
  });

  it('returns the bare agent_id when sessionId is null (legacy fallback)', () => {
    expect(buildVoiceIdentity(AGENT, null)).toBe(AGENT);
  });

  it('round-trips through parseVoiceIdentity', () => {
    const built = buildVoiceIdentity(AGENT, SESSION);
    const parsed = parseVoiceIdentity(built);
    expect(parsed?.agentId).toBe(AGENT);
    expect(parsed?.sessionId).toBe(SESSION);
  });
});
