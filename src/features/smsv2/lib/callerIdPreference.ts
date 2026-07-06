// callerIdPreference — remembers which wk_numbers row the agent picked as
// their outbound caller ID in the softphone "Calling from" dropdown.
//
// Stored per-browser in localStorage. Empty / absent = automatic: the
// server-side chain in wk-voice-twiml-outgoing decides (profile default →
// first voice-enabled number). The id is only a REQUEST — the edge function
// validates it against wk_numbers (voice_enabled=true) before honouring it,
// so a stale or tampered value can never spoof an arbitrary caller ID.

const KEY = 'smsv2.callerIdNumberId';

export function getCallerIdPreference(): string | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function setCallerIdPreference(numberId: string | null): void {
  try {
    if (numberId) window.localStorage.setItem(KEY, numberId);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode / storage disabled — selection just won't persist.
  }
}
