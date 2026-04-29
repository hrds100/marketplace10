// V2 Imperative DialerEngine — a vanilla class. No useReducer, no
// effect chains, no stale-state-ref bugs possible. State lives on the
// instance. UI subscribes via subscribe(); reads via getState().
//
// Public methods are async functions that run sequentially:
//   start(opts)         — register Twilio device, set active campaign
//   dialContact(id)     — dial a specific contact id
//   hangUp()            — sync disconnect + dispatch wrap-up
//   next()              — wrap up current → fetch next lead → dial it
//   applyOutcome(col)   — write disposition + auto-advance if armed
//   pause() / resume()  — gate auto-advance
//
// One file, one class, one queue of work. If next() doesn't dial,
// the bug is in next() — easy to diagnose.

import type { Call as TwilioCall } from '@twilio/voice-sdk';
import {
  disconnectAllCalls,
  disconnectAllCallsAndWait,
} from '@/core/integrations/twilio-voice';
import { api } from '../../data/api';
import { mapTwilioError } from '../../lib/twilioErrorMap';

export type CallPhase =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'in_call'
  | 'wrap_up'
  | 'outcome_done';

export type WrapReason =
  | 'unknown'
  | 'connected'
  | 'user_hangup'
  | 'twilio_disconnect'
  | 'no_answer'
  | 'busy'
  | 'voicemail'
  | 'failed';

export interface ActiveCall {
  contactId: string;
  contactName: string;
  phone: string;
  callId: string | null;
  campaignId: string;
  startedAt: number;
}

export interface EngineState {
  callPhase: CallPhase;
  call: ActiveCall | null;
  errorCode: number | null;
  errorMessage: string | null;
  reason: WrapReason;
  noNewLeadsBanner: number | null; // count of skipped already-dialed
  paused: boolean;
  /** When auto-next is armed, ms epoch when it'll fire. */
  autoNextAtMs: number | null;
  autoNextSeconds: number; // 0 = manual; >0 = seconds delay
  busy: boolean; // any next() in flight
  campaignId: string | null;
  dialedThisSession: ReadonlySet<string>;
}

const INITIAL: EngineState = {
  callPhase: 'idle',
  call: null,
  errorCode: null,
  errorMessage: null,
  reason: 'unknown',
  noNewLeadsBanner: null,
  paused: false,
  autoNextAtMs: null,
  autoNextSeconds: 0,
  busy: false,
  campaignId: null,
  dialedThisSession: new Set<string>(),
};

type Listener = (s: EngineState) => void;

export interface DialerEngineDeps {
  /** Async dial — given by the Twilio device adapter. */
  dial: (
    phone: string,
    extraParams: Record<string, string>
  ) => Promise<TwilioCall>;
  /** Resolve full contact info by id. */
  fetchContact: (
    id: string
  ) => Promise<{ id: string; name: string; phone: string } | null>;
  /** Notify the agent (toast) — UI provides. Optional. */
  toast?: (msg: string, tone: 'info' | 'error' | 'success') => void;
}

export class DialerEngine {
  private state: EngineState = { ...INITIAL };
  private listeners = new Set<Listener>();
  private activeCall: TwilioCall | null = null;
  private autoNextTimer: ReturnType<typeof setTimeout> | null = null;
  private deps: DialerEngineDeps;

  constructor(deps: DialerEngineDeps) {
    this.deps = deps;
  }

  // ─── State accessors ───────────────────────────────────────────
  getState(): EngineState {
    return this.state;
  }
  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private setState(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  // ─── Setup ─────────────────────────────────────────────────────
  setCampaign(id: string | null): void {
    this.setState({ campaignId: id });
  }
  setAutoNextSeconds(n: number): void {
    this.setState({ autoNextSeconds: Math.max(0, Math.floor(n)) });
    // Re-evaluate auto-next if we're already in outcome_done.
    if (this.state.callPhase === 'outcome_done') this.maybeArmAutoNext();
  }
  pause(): void {
    if (this.state.paused) return;
    this.setState({ paused: true });
    this.cancelAutoNext();
  }
  resume(): void {
    if (!this.state.paused) return;
    this.setState({ paused: false });
    if (this.state.callPhase === 'outcome_done') this.maybeArmAutoNext();
  }

  // ─── Auto-next ─────────────────────────────────────────────────
  private cancelAutoNext(): void {
    if (this.autoNextTimer) {
      clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
    if (this.state.autoNextAtMs !== null) {
      this.setState({ autoNextAtMs: null });
    }
  }
  private maybeArmAutoNext(): void {
    this.cancelAutoNext();
    if (this.state.paused) return;
    if (this.state.autoNextSeconds <= 0) return;
    if (this.state.callPhase !== 'outcome_done') return;
    const delayMs = this.state.autoNextSeconds * 1000;
    const deadlineMs = Date.now() + delayMs;
    this.setState({ autoNextAtMs: deadlineMs });
    this.autoNextTimer = setTimeout(() => {
      this.autoNextTimer = null;
      console.info('[v2 engine] auto-next fired');
      void this.next();
    }, delayMs);
  }

  // ─── Dial a specific contact ───────────────────────────────────
  async dialContact(input: {
    contactId: string;
    contactName: string;
    phone: string;
    campaignId: string;
  }): Promise<void> {
    if (this.state.busy) {
      console.info('[v2 engine] dialContact REFUSED — engine busy');
      return;
    }
    const live = ['dialing', 'ringing', 'in_call'].includes(this.state.callPhase);
    if (live) {
      console.info('[v2 engine] dialContact REFUSED — already live');
      return;
    }

    const dialed = new Set(this.state.dialedThisSession);
    if (!input.contactId.startsWith('manual-')) dialed.add(input.contactId);

    this.cancelAutoNext();
    this.setState({
      busy: true,
      callPhase: 'dialing',
      call: {
        contactId: input.contactId,
        contactName: input.contactName,
        phone: input.phone,
        callId: null,
        campaignId: input.campaignId,
        startedAt: Date.now(),
      },
      errorCode: null,
      errorMessage: null,
      reason: 'unknown',
      noNewLeadsBanner: null,
      dialedThisSession: dialed,
      campaignId: input.campaignId,
    });

    console.info('[v2 engine] dialContact', input);
    try {
      const create = await api.callsCreate({
        to_phone: input.phone,
        contact_id: input.contactId,
        campaign_id: input.campaignId,
      });
      if (!create.ok) {
        console.warn('[v2 engine] callsCreate failed', create.error);
        this.deps.toast?.(`Dial failed: ${create.error}`, 'error');
        this.setState({
          callPhase: 'wrap_up',
          reason: 'failed',
          errorMessage: create.error,
          busy: false,
        });
        return;
      }
      if (!create.data.allowed) {
        console.warn('[v2 engine] callsCreate refused', create.data);
        this.deps.toast?.('Daily spend or kill switch', 'error');
        this.setState({
          callPhase: 'wrap_up',
          reason: 'failed',
          errorMessage: 'spend gate',
          busy: false,
        });
        return;
      }
      const callId = create.data.call_id;
      this.setState({
        call: this.state.call ? { ...this.state.call, callId } : null,
      });

      let twCall: TwilioCall;
      try {
        twCall = await this.deps.dial(input.phone, {
          CallId: callId,
          ContactId: input.contactId,
          From: create.data.from_e164,
        });
      } catch (e) {
        const code = (e as { code?: number })?.code ?? 0;
        const mapped = mapTwilioError(code, (e as Error)?.message ?? '');
        console.warn('[v2 engine] device.dial threw', e);
        this.deps.toast?.(mapped.friendlyMessage, 'error');
        this.setState({
          callPhase: 'wrap_up',
          reason: 'failed',
          errorCode: code,
          errorMessage: mapped.friendlyMessage,
          busy: false,
        });
        return;
      }

      this.activeCall = twCall;
      const isThis = () => this.activeCall === twCall;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (twCall as any).on?.('ringing', () => {
        if (!isThis()) return;
        if (this.state.callPhase === 'dialing') this.setState({ callPhase: 'ringing' });
      });
      twCall.on('accept', () => {
        if (!isThis()) return;
        const c = this.state.call;
        this.setState({
          callPhase: 'in_call',
          reason: 'connected',
          call: c ? { ...c, startedAt: Date.now() } : null,
        });
      });
      const onEnd = (reason: WrapReason) => () => {
        if (!isThis()) return;
        this.activeCall = null;
        if (this.state.callPhase === 'wrap_up' || this.state.callPhase === 'outcome_done') {
          // Already in wrap-up — duplicate event, ignore.
          return;
        }
        this.setState({ callPhase: 'wrap_up', reason });
      };
      twCall.on('disconnect', onEnd('twilio_disconnect'));
      twCall.on('cancel', onEnd('twilio_disconnect'));
      twCall.on('reject', onEnd('failed'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      twCall.on('error', (err: any) => {
        if (!isThis()) return;
        const code = (err?.code as number | undefined) ?? 0;
        const mapped = mapTwilioError(code, err?.message ?? '');
        console.warn('[v2 engine] twilio call error', { code, mapped });
        this.activeCall = null;
        this.setState({
          callPhase: 'wrap_up',
          reason: mapped.fatal ? 'failed' : this.state.reason,
          errorCode: code,
          errorMessage: mapped.friendlyMessage,
        });
        if (mapped.fatal) {
          void disconnectAllCallsAndWait(1500).catch(() => {
            try {
              disconnectAllCalls();
            } catch {
              /* ignore */
            }
          });
        }
      });
    } finally {
      this.setState({ busy: false });
    }
  }

  // ─── Hang up ──────────────────────────────────────────────────
  hangUp(): void {
    const tw = this.activeCall;
    this.activeCall = null;
    if (tw) {
      try {
        tw.disconnect();
      } catch {
        /* ignore */
      }
    }
    try {
      disconnectAllCalls();
    } catch {
      /* ignore */
    }
    if (
      this.state.callPhase === 'dialing' ||
      this.state.callPhase === 'ringing' ||
      this.state.callPhase === 'in_call'
    ) {
      this.setState({
        callPhase: 'wrap_up',
        reason: 'user_hangup',
      });
    }
  }

  // ─── Apply outcome ────────────────────────────────────────────
  async applyOutcome(columnId: string, note?: string): Promise<void> {
    const c = this.state.call;
    if (!c?.callId) return;
    if (
      this.state.callPhase !== 'wrap_up' &&
      this.state.callPhase !== 'outcome_done'
    ) {
      return;
    }
    if (columnId === 'skipped' || columnId === 'next-now') {
      this.setState({ callPhase: 'outcome_done' });
      this.maybeArmAutoNext();
      return;
    }
    const res = await api.outcomeApply({
      call_id: c.callId,
      contact_id: c.contactId,
      column_id: columnId,
      agent_note: note ?? null,
    });
    if (!res.ok) {
      this.deps.toast?.(`Outcome save failed: ${res.error}`, 'error');
    }
    this.setState({ callPhase: 'outcome_done' });
    this.maybeArmAutoNext();
  }

  // ─── Next — the heart of the dialer ────────────────────────────
  // ONE async function. Runs sequentially. No state machines, no
  // effects, no refs to React state. If this doesn't dial, the bug is
  // here and obvious.
  async next(): Promise<void> {
    if (this.state.busy) {
      console.info('[v2 engine] next() REFUSED — engine busy');
      return;
    }
    this.cancelAutoNext();
    this.setState({ busy: true });
    try {
      // 1. Hang up current Twilio call if live.
      const live = ['dialing', 'ringing', 'in_call'].includes(this.state.callPhase);
      if (live) {
        this.hangUp();
      }
      // 2. If we're in wrap-up with no outcome picked, treat as 'skipped'
      //    so the call is closed out server-side. Best-effort.
      if (this.state.callPhase === 'wrap_up' && this.state.call?.callId) {
        // No await — fire and forget. We don't block the next dial on this.
        void api.outcomeApply({
          call_id: this.state.call.callId,
          contact_id: this.state.call.contactId,
          column_id: 'skipped',
        });
      }
      // Mark as done locally regardless.
      if (
        this.state.callPhase === 'wrap_up' ||
        this.state.callPhase === 'outcome_done'
      ) {
        this.setState({ callPhase: 'outcome_done' });
      }
      // 3. Resolve next lead.
      const campaignId = this.state.call?.campaignId ?? this.state.campaignId;
      if (!campaignId) {
        console.info('[v2 engine] next() — no campaignId');
        this.setState({ noNewLeadsBanner: 0, callPhase: 'idle', call: null });
        return;
      }
      let nextContactId: string | null = null;
      let skipped = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        console.info(`[v2 engine] next() attempt ${attempt + 1}/5 wk-leads-next`);
        const res = await api.leadsNext({ campaign_id: campaignId });
        if (!res.ok) {
          console.warn('[v2 engine] wk-leads-next FAILED', res.error);
          break;
        }
        const data = res.data;
        if (data.empty || !('contact_id' in data) || !data.contact_id) {
          console.info('[v2 engine] wk-leads-next empty');
          break;
        }
        if (this.state.dialedThisSession.has(data.contact_id)) {
          console.info('[v2 engine] anti-loop skip', data.contact_id);
          skipped++;
          continue;
        }
        nextContactId = data.contact_id;
        break;
      }
      if (!nextContactId) {
        this.setState({
          callPhase: 'idle',
          call: null,
          noNewLeadsBanner: skipped,
        });
        return;
      }
      const contact = await this.deps.fetchContact(nextContactId);
      if (!contact) {
        this.setState({ callPhase: 'idle', call: null, noNewLeadsBanner: skipped });
        return;
      }
      // 4. Dial it. dialContact takes care of state transitions.
      // We must clear `busy` before calling dialContact since it has its
      // own busy guard. Setting busy=false here, then dialContact
      // immediately re-sets busy=true.
      this.setState({ busy: false });
      await this.dialContact({
        contactId: contact.id,
        contactName: contact.name,
        phone: contact.phone,
        campaignId,
      });
    } finally {
      // dialContact handles its own busy=false in finally. If we threw
      // before reaching dialContact, clear it here.
      if (this.state.busy) this.setState({ busy: false });
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────
  destroy(): void {
    this.cancelAutoNext();
    this.hangUp();
    this.listeners.clear();
  }
}
