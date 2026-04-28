// PR 138 (Hugo 2026-04-28): map Twilio error codes to friendly messages
// + fatal flag. Centralised so the toast text + reducer dispatch share
// one source of truth.
//
// NOTE: this is the bare scaffold for commit 3. Commit 8 expands the
// table (13224, 31000, 31005 friendly mappings + the dialer error
// banner). Kept thin here so commit 3 compiles cleanly.

export interface MappedTwilioError {
  friendlyMessage: string;
  fatal: boolean;
}

export function mapTwilioError(code: number, message: string): MappedTwilioError {
  // 31401 (mic blocked) is the ONE recoverable Call-level error: the
  // call could continue once the user grants mic permission. Everything
  // else that lands here means "this call is over". Treating gateway
  // errors as fatal is what stops the room getting stuck in RINGING
  // and the repeated-31005 loop (PR 142, Hugo 2026-04-28).
  if (code === 31401) {
    return {
      friendlyMessage:
        'Mic blocked. Click the lock icon next to the URL → Microphone → Allow → reload.',
      fatal: false,
    };
  }
  if (code === 31403 || code === 31486) {
    return {
      friendlyMessage: `Call refused by Twilio (${code}). Check phone number / caller ID.`,
      fatal: true,
    };
  }
  if (code === 31005 || code === 31009) {
    // PR 142: was fatal=false. The SDK fires 31005 with "Error sent
    // from gateway in HANGUP" when the carrier definitively ends the
    // call — there's no recovery from that, retrying just produces
    // more 31005 events. Mark fatal so the reducer flips out of the
    // live phase immediately.
    return {
      friendlyMessage: `Connection lost (${code}). Refresh the page if it doesn't recover.`,
      fatal: true,
    };
  }
  if (code === 31000) {
    return {
      friendlyMessage: 'Call dropped — please try again.',
      fatal: true,
    };
  }
  if (code === 13224) {
    return {
      friendlyMessage: 'Number unreachable on UK carrier — try a different number.',
      fatal: true,
    };
  }
  return {
    friendlyMessage: `Call error ${code || ''}: ${message || 'unknown'}`.trim(),
    fatal: false,
  };
}
