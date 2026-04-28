// PR 143 (Hugo 2026-04-28): parse the Twilio Voice Client identity that
// wk-voice-token mints.
//
// History: identity used to be just `user.id` (UUID). Multiple tabs of
// the same agent collided at the Twilio gateway — the newer client
// evicted the older with `error 31005 HANGUP`. Now wk-voice-token mints
// `${user.id}:${sessionId}` so each tab is a distinct gateway client.
//
// Several callers — wk-voice-twiml-outgoing (which receives
// `From=client:<identity>` from Twilio) and any future client-side code
// that reads the granted identity — need to recover the bare agent_id
// for DB lookups. This helper is the single canonical parser. The
// edge function inlines the same shape (Deno can't import from src/);
// this file's tests pin the contract.

export interface ParsedVoiceIdentity {
  /** The bare agent UUID — what was wk-voice-token's `user.id`. */
  agentId: string;
  /** The per-tab session UUID, or null for legacy un-suffixed tokens. */
  sessionId: string | null;
  /** The full identity string as Twilio sees it. */
  raw: string;
}

/**
 * Parses a Twilio Voice Client identity. Accepts:
 *   - `${agentId}:${sessionId}` — current scheme (PR 143)
 *   - `${agentId}` — legacy, returned with sessionId=null
 *
 * Also accepts the `client:` prefix Twilio adds to `From` params on
 * outbound TwiML callbacks; the prefix is stripped if present.
 *
 * Returns null only if the input is empty or doesn't look like a UUID-ish
 * agentId (i.e. there's no recognisable id at all).
 */
export function parseVoiceIdentity(input: string | null | undefined): ParsedVoiceIdentity | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const stripped = trimmed.startsWith('client:') ? trimmed.slice(7) : trimmed;
  if (!stripped) return null;
  const colonIdx = stripped.indexOf(':');
  if (colonIdx < 0) {
    return { agentId: stripped, sessionId: null, raw: stripped };
  }
  const agentId = stripped.slice(0, colonIdx);
  const sessionId = stripped.slice(colonIdx + 1);
  if (!agentId) return null;
  return { agentId, sessionId: sessionId || null, raw: stripped };
}

/**
 * Combines an agent_id with the active session_id (if any) to produce
 * the identity string Twilio's `<Dial><Client>...</Client></Dial>` needs
 * to ring a specific tab. Pass sessionId=null to fall back to the bare
 * agent_id (legacy compatibility for users who haven't minted a token
 * since the migration).
 */
export function buildVoiceIdentity(agentId: string, sessionId: string | null): string {
  if (!sessionId) return agentId;
  return `${agentId}:${sessionId}`;
}
