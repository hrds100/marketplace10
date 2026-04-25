// core/integrations/twilio-voice.ts
//
// Single owner of the Twilio Voice SDK in the browser.
// Features (e.g. /smsv2 softphone, dialer) MUST go through this wrapper —
// never import @twilio/voice-sdk directly from a feature.
//
// Lifecycle:
//   1. fetchVoiceToken()                  — calls wk-voice-token (Bearer = Supabase JWT)
//   2. createDevice(token)                — registers a Twilio Device for this tab
//   3. device.connect({ params })         — places an outbound call via TwiML App
//   4. device.on('incoming', cb)          — inbound calls from <Client> dial
//   5. destroyDevice()                    — on logout / tab close
//
// Failure modes are surfaced via typed events; UI shows banners for them.

import type { Device as TwilioDevice, Call as TwilioCall } from '@twilio/voice-sdk';
import { supabase } from '@/integrations/supabase/client';

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// ----------------------------------------------------------------------------
// Token fetch
// ----------------------------------------------------------------------------

export interface VoiceTokenResponse {
  token: string;
  identity: string;          // profile uuid
  ttl_seconds: number;
  extension: string | null;
}

export interface VoiceTokenError {
  error: string;
  missing_env?: string[];
  hint?: string;
}

export async function fetchVoiceToken(): Promise<VoiceTokenResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated — sign in to use the softphone.');
  }

  const resp = await fetch(`${FN_BASE}/wk-voice-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    let body: VoiceTokenError | null = null;
    try { body = await resp.json(); } catch { /* ignore */ }
    if (resp.status === 503 && body?.missing_env) {
      throw new Error(
        `Voice SDK not configured. Missing env vars: ${body.missing_env.join(', ')}.`
      );
    }
    throw new Error(body?.error ?? `Voice token fetch failed (${resp.status})`);
  }

  return resp.json() as Promise<VoiceTokenResponse>;
}

// ----------------------------------------------------------------------------
// Device manager
// ----------------------------------------------------------------------------

let device: TwilioDevice | null = null;
let currentToken: VoiceTokenResponse | null = null;
let renewalTimer: number | null = null;

// Module-level listener registry for inbound calls. Subscribers are notified
// after the device has auto-accepted the call so the UI can transition into
// the live-call screen. Returning the unsubscribe handle keeps callers
// reference-clean (e.g. ActiveCallProvider on unmount).
type IncomingCallListener = (call: TwilioCall) => void;
const incomingCallListeners = new Set<IncomingCallListener>();

export function addIncomingCallListener(listener: IncomingCallListener): () => void {
  incomingCallListeners.add(listener);
  return () => {
    incomingCallListeners.delete(listener);
  };
}

/** Lazy-import the SDK so SSR / non-voice routes don't pay the bundle cost. */
async function loadVoiceSdk(): Promise<typeof import('@twilio/voice-sdk')> {
  return import('@twilio/voice-sdk');
}

export interface DeviceHandle {
  device: TwilioDevice;
  identity: string;
  extension: string | null;
}

export async function createDevice(): Promise<DeviceHandle> {
  if (device && currentToken) {
    return { device, identity: currentToken.identity, extension: currentToken.extension };
  }

  const tokenResp = await fetchVoiceToken();
  const { Device } = await loadVoiceSdk();

  const d = new Device(tokenResp.token, {
    // Background audio constraints — keep mic open during the call lifecycle.
    closeProtection: true,
    logLevel: 'warn',
    edge: 'roaming',         // pick best Twilio edge automatically
  });

  // Inbound calls — wk-voice-twiml-incoming routes a PSTN ring to a Client
  // identity. The agent's browser receives an 'incoming' Call here. We
  // auto-accept (matches the dialer-winner flow) and notify subscribers so
  // ActiveCallProvider can morph straight into the live-call view.
  d.on('incoming', (call: TwilioCall) => {
    try {
      call.accept();
    } catch (e) {
      console.warn('[twilio-voice] incoming call accept failed:', e);
    }
    incomingCallListeners.forEach((listener) => {
      try {
        listener(call);
      } catch (e) {
        console.warn('[twilio-voice] incoming listener threw:', e);
      }
    });
  });

  await d.register();

  device = d;
  currentToken = tokenResp;
  scheduleTokenRenewal(tokenResp.ttl_seconds);

  return { device: d, identity: tokenResp.identity, extension: tokenResp.extension };
}

function scheduleTokenRenewal(ttlSeconds: number): void {
  if (renewalTimer !== null) {
    window.clearTimeout(renewalTimer);
    renewalTimer = null;
  }
  // Renew 5 minutes before expiry.
  const renewInMs = Math.max(30_000, (ttlSeconds - 300) * 1000);
  renewalTimer = window.setTimeout(async () => {
    try {
      if (!device) return;
      const fresh = await fetchVoiceToken();
      await device.updateToken(fresh.token);
      currentToken = fresh;
      scheduleTokenRenewal(fresh.ttl_seconds);
    } catch (e) {
      console.error('[twilio-voice] token renewal failed:', e);
    }
  }, renewInMs);
}

export async function destroyDevice(): Promise<void> {
  if (renewalTimer !== null) {
    window.clearTimeout(renewalTimer);
    renewalTimer = null;
  }
  if (device) {
    try { await device.unregister(); } catch { /* ignore */ }
    try { device.destroy(); } catch { /* ignore */ }
  }
  device = null;
  currentToken = null;
}

// ----------------------------------------------------------------------------
// Outbound call helper
// ----------------------------------------------------------------------------

export interface OutboundParams {
  to: string;                // E.164 number to dial
  agentId?: string;          // for server-side logging hint (TwiML App ignores it)
  /** Extra params forwarded as form fields on the wk-voice-twiml-outgoing
   *  POST. Used to bake CallId (our wk_calls UUID) + ContactId in so the
   *  TwiML handler can match the existing row instead of inserting a dupe. */
  extraParams?: Record<string, string>;
}

export async function dial(params: OutboundParams): Promise<TwilioCall> {
  if (!device) {
    throw new Error('Voice device not initialised — call createDevice() first.');
  }
  // The TwiML App points at wk-voice-twiml-outgoing. Twilio forwards
  // these `params` as form fields on that POST.
  const call = await device.connect({
    params: {
      To: params.to,
      ...(params.agentId ? { AgentId: params.agentId } : {}),
      ...(params.extraParams ?? {}),
    },
  });
  return call;
}

// ----------------------------------------------------------------------------
// Helpers for UI hooks
// ----------------------------------------------------------------------------

export function getDevice(): TwilioDevice | null {
  return device;
}

export function getIdentity(): string | null {
  return currentToken?.identity ?? null;
}
