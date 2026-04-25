// Pins the TwiML returned by wk-voice-twiml-outgoing.
//
// Critical contract: when streamWssUrl is set, the response MUST include
// <Start><Stream> BEFORE <Dial>, with track="both_tracks" so the AI coach
// receives both legs of audio.
//
// When streamWssUrl is null, the response MUST be backward-compatible (just
// <Dial>) — kill switch / coach disabled / openai key empty all collapse to
// the same null on the caller's side.

import { describe, it, expect } from 'vitest';
import { buildOutgoingTwiml } from '../buildOutgoingTwiml';

const BASE = {
  to: '+447863992555',
  callerIdE164: '+447380308316',
  statusUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-voice-status',
  recordingUrl: 'https://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-voice-recording',
};

describe('buildOutgoingTwiml — without stream URL', () => {
  it('emits <Dial> with caller-ID and no <Start><Stream>', () => {
    const out = buildOutgoingTwiml({ ...BASE, streamWssUrl: null });
    expect(out).toContain('<Response>');
    expect(out).toContain('<Dial');
    expect(out).toContain('callerId="+447380308316"');
    expect(out).toContain('<Number>+447863992555</Number>');
    expect(out).not.toContain('<Start>');
    expect(out).not.toContain('<Stream');
  });

  it('omits caller-ID attribute when null', () => {
    const out = buildOutgoingTwiml({ ...BASE, callerIdE164: null, streamWssUrl: null });
    expect(out).not.toContain('callerId=');
    expect(out).toContain('<Dial');
  });
});

describe('buildOutgoingTwiml — with stream URL', () => {
  const STREAM = 'wss://asazddtvjvmckouxcmmo.supabase.co/functions/v1/wk-ai-live-coach';

  it('includes <Start><Stream> before <Dial>', () => {
    const out = buildOutgoingTwiml({ ...BASE, streamWssUrl: STREAM });
    const startIdx = out.indexOf('<Start>');
    const dialIdx = out.indexOf('<Dial');
    expect(startIdx).toBeGreaterThan(-1);
    expect(dialIdx).toBeGreaterThan(-1);
    expect(startIdx).toBeLessThan(dialIdx);
  });

  it('uses track="both_tracks" so caller AND agent audio reach the coach', () => {
    const out = buildOutgoingTwiml({ ...BASE, streamWssUrl: STREAM });
    expect(out).toContain('track="both_tracks"');
  });

  it('emits the wss URL XML-escaped', () => {
    const out = buildOutgoingTwiml({
      ...BASE,
      streamWssUrl: 'wss://example.test/coach?callSid=abc&agent=u1',
    });
    // Ampersand must be escaped to &amp; for valid XML.
    expect(out).toContain('callSid=abc&amp;agent=u1');
  });

  it('passes CallSid through as a Stream parameter', () => {
    const out = buildOutgoingTwiml({ ...BASE, streamWssUrl: STREAM });
    expect(out).toContain('<Parameter name="callSid" value="{{CallSid}}"/>');
  });

  it('still emits the <Dial> block with caller-ID + recording webhook', () => {
    const out = buildOutgoingTwiml({ ...BASE, streamWssUrl: STREAM });
    expect(out).toContain('<Dial');
    expect(out).toContain('callerId="+447380308316"');
    expect(out).toContain('record="record-from-answer-dual"');
    expect(out).toContain('<Number>+447863992555</Number>');
  });
});
