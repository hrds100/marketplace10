// PR 149 (Hugo 2026-04-29): single structured-log helper for the dialer
// stack. Replaces ad-hoc `console.info('[twilio-call]', ...)` style logs
// with a single `[dialer]` prefix carrying a typed payload that includes
// the call/contact/agent/campaign correlation IDs.
//
// Goal: replay any call by grepping `[dialer]` for a single callId and
// reconstructing the full event chain (start → ringing → connected →
// ended → outcome.picked → outcome.saved → next.requested → next.selected).
//
// Out of scope for v1: persisting logs to a server-side audit table. The
// helper is console-only; if/when audit persistence lands, swap the
// transport here without touching call sites.
//
// Convention: emit ONLY at intent points (agent click) and state-
// transition points (reducer dispatch). NEVER on render, NEVER on tick,
// NEVER on mute toggle. Otherwise the log becomes noise and replay is
// useless.

export type DialerLogLevel = 'info' | 'warn' | 'error';

/** Event names mirror the reducer event types but in lowercase dotted
 *  form so they're easy to grep. Add new ones as the state machine
 *  grows (PR 150+). */
export type DialerLogEvent =
  // Call lifecycle
  | 'start'
  | 'callid'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'error'
  // Outcome
  | 'outcome.picked'
  | 'outcome.saved'
  | 'outcome.failed'
  // Next-call resolution
  | 'next.requested'
  | 'next.selected'
  | 'next.empty'
  | 'skip'
  // Session pacing
  | 'pause'
  | 'resume'
  | 'pacing.armed'
  | 'pacing.fire'
  | 'pacing.cancelled'
  // Inbound / winner
  | 'winner'
  | 'inbound'
  // Room visibility
  | 'room.open'
  | 'room.close'
  | 'room.min'
  | 'room.max'
  // Mute (logged at intent only, not on every Twilio echo)
  | 'mute'
  // Hard reset
  | 'clear';

export interface DialerLogContext {
  /** wk_calls.id of the call this event relates to. The single most
   *  important correlation key — every replay starts here. */
  callId?: string | null;
  /** wk_contacts.id of the contact this event relates to. */
  contactId?: string | null;
  /** profiles.id of the agent — derived once on session start; cheap
   *  to attach to every line. */
  agentId?: string | null;
  /** wk_dialer_campaigns.id when relevant (queue-driven flows). */
  campaignId?: string | null;
  /** Twilio CallSid when known. Useful for cross-checking against
   *  Twilio Debugger / Voice Insights. */
  twilioCallSid?: string | null;
  /** dialerSessionStore.sessionId — groups all events from one
   *  agent session together. */
  sessionId?: string | null;
  /** Reducer state transition info. */
  fromPhase?: string;
  toPhase?: string;
  /** Free-form layer tag — useful for distinguishing "edge fn",
   *  "twilio sdk", "ui click", "realtime". */
  source?: string;
  /** Anything else worth replaying — keep it small / serialisable. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: Record<string, any>;
}

/** Emit a single structured log line for a dialer event. Console-only
 *  for v1. Always includes `ts` (ms epoch) and `ev` (event name). */
export function dialerLog(
  event: DialerLogEvent,
  ctx: DialerLogContext = {},
  level: DialerLogLevel = 'info'
): void {
  const payload = {
    ts: Date.now(),
    ev: event,
    ...stripUndefined(ctx),
  };
  // Single tag prefix `[dialer]` makes every call's full lifecycle
  // greppable by callId + sorted by ts.
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.info;
  fn('[dialer]', payload);
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as Array<keyof T>) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}
