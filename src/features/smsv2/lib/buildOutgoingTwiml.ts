// buildOutgoingTwiml — pure TwiML builder for the manual-dial outbound flow.
//
// Lives under src/ so vitest can exercise it directly. The Deno edge
// function `supabase/functions/wk-voice-twiml-outgoing/index.ts` keeps an
// inline copy of this exact function (Deno deploy can't import from src/).
// If you change one, change the other — the tests pin the contract.
//
// Audit reference: live coach refactor — switched from <Start><Stream>
// (WebSocket-based, unreliable behind Supabase Edge Functions, returned
// Twilio error 31920 every time) to <Start><Transcription> which delivers
// transcripts over plain HTTP webhooks. wk-voice-transcription handles the
// inserts and triggers OpenAI Chat for coaching events.

export interface BuildOutgoingTwimlArgs {
  /** E.164 destination number to dial through Twilio. */
  to: string;
  /** Caller-ID number (E.164) to present to the callee. May be null. */
  callerIdE164: string | null;
  /** Public URL Twilio will POST when the bridge ends (status webhook). */
  statusUrl: string;
  /** Public URL Twilio will POST when the recording is ready. */
  recordingUrl: string;
  /**
   * Public URL of wk-voice-transcription. When provided, we emit
   * `<Start><Transcription …/></Start>` before `<Dial>` so Twilio's
   * Real-Time Transcription forwards transcript chunks to that endpoint
   * over HTTP POST. Pass null to skip (kill switch / coach disabled /
   * openai key empty) — call still bridges normally.
   */
  transcriptionCallbackUrl: string | null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildOutgoingTwiml(args: BuildOutgoingTwimlArgs): string {
  const callerIdAttr = args.callerIdE164
    ? `callerId="${escapeXml(args.callerIdE164)}"`
    : '';

  const dialBlock = [
    `<Dial ${callerIdAttr} answerOnBridge="true" record="record-from-answer-dual"`,
    `      recordingStatusCallback="${escapeXml(args.recordingUrl)}"`,
    `      recordingStatusCallbackEvent="completed"`,
    `      action="${escapeXml(args.statusUrl)}"`,
    `      method="POST">`,
    `  <Number>${escapeXml(args.to)}</Number>`,
    `</Dial>`,
  ].join('\n');

  // <Start><Transcription> must come BEFORE <Dial> so transcription begins
  // the moment the bridge connects. track="both_tracks" captures BOTH legs:
  //   inbound_track  → caller (the dialed number's audio)
  //   outbound_track → agent  (Twilio Client → bridged in)
  // wk-voice-transcription maps these labels back to the speaker enum.
  const transcriptionBlock = args.transcriptionCallbackUrl
    ? [
        `<Start>`,
        `  <Transcription`,
        `    statusCallbackUrl="${escapeXml(args.transcriptionCallbackUrl)}"`,
        `    statusCallbackMethod="POST"`,
        `    track="both_tracks"`,
        `    languageCode="en-GB"`,
        `    enableAutomaticPunctuation="true"`,
        `    profanityFilter="false"`,
        `    speechModel="telephony"`,
        `    inboundTrackLabel="caller"`,
        `    outboundTrackLabel="agent"`,
        `    partialResults="false"`,
        `  />`,
        `</Start>`,
      ].join('\n')
    : '';

  const body = [transcriptionBlock, dialBlock].filter((s) => s.length > 0).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`;
}
