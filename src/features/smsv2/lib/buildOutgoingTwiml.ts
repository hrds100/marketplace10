// buildOutgoingTwiml — pure TwiML builder for the manual-dial outbound flow.
//
// Lives under src/ so vitest can exercise it directly. The Deno edge
// function `supabase/functions/wk-voice-twiml-outgoing/index.ts` keeps an
// inline copy of this exact function (Deno deploy can't import from src/).
// If you change one, change the other — the tests pin the contract.
//
// Audit reference: PR that added live transcript wiring (Twilio Media
// Streams to wk-ai-live-coach).

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
   * Public WebSocket URL of wk-ai-live-coach. When provided, we emit
   * `<Start><Stream …/></Start>` before `<Dial>` so Twilio Media Streams
   * forks the audio to the AI coach. Pass null to skip (kill-switch on,
   * coach disabled, etc.) — call still bridges normally.
   */
  streamWssUrl: string | null;
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

  // <Start><Stream> must appear BEFORE <Dial> so the stream is open as soon
  // as the bridge connects. track="both_tracks" forks both legs (caller +
  // agent) so the AI coach hears the full conversation.
  const streamBlock = args.streamWssUrl
    ? [
        `<Start>`,
        `  <Stream url="${escapeXml(args.streamWssUrl)}" track="both_tracks">`,
        `    <Parameter name="callSid" value="{{CallSid}}"/>`,
        `  </Stream>`,
        `</Start>`,
      ].join('\n')
    : '';

  const body = [streamBlock, dialBlock].filter((s) => s.length > 0).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n${body}\n</Response>`;
}
