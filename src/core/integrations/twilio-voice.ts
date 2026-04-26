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

  // Echo cancellation + noise suppression on the input stream. Without these,
  // an open speaker + open mic in the same room produces a feedback loop that
  // looks like "mute didn't work" — Hugo's exact complaint when self-testing.
  // The browser still has to honour these constraints (most do).
  try {
    // The AudioHelper API is on `device.audio`; not all SDK builds expose
    // `setAudioConstraints`, so wrap in try/catch.
    const audio = (d as unknown as { audio?: { setAudioConstraints?: (c: MediaTrackConstraints) => void } }).audio;
    audio?.setAudioConstraints?.({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    });
  } catch (e) {
    console.warn('[twilio-voice] could not set audio constraints', e);
  }

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
  // Auto-initialise the device if the agent clicks Call before the
  // useTwilioDevice hook's mount-effect has finished registering. This
  // happens on a fresh tab → click Call quickly → the previous code
  // threw "Voice device not initialised". Now we just register lazily.
  if (!device) {
    await createDevice();
  }
  if (!device) {
    throw new Error('Voice device failed to initialise. Try refreshing the page.');
  }
  // The TwiML App points at wk-voice-twiml-outgoing. Twilio forwards
  // these `params` as form fields on that POST.
  const call = await (device as TwilioDevice).connect({
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

/**
 * Return every Call the Twilio Device is currently maintaining.
 * The SDK keeps prior Calls alive across `device.connect()` invocations —
 * if we don't iterate them when muting, a zombie call from an earlier dial
 * keeps streaming the agent's mic to its (now stale) leg.
 */
export function getDeviceCalls(): TwilioCall[] {
  if (!device) return [];
  try {
    // The .calls getter returns the SDK's internal list directly.
    return [...device.calls];
  } catch {
    return [];
  }
}

// Stash original tracks so unmute can restore them. Keyed by sender object.
// Cleared as soon as we restore. Module-level because the Call object exposes
// no place to attach metadata.
const _stashedTracks = new WeakMap<RTCRtpSender, MediaStreamTrack>();

/**
 * Mute every active Call on the Device using THREE layered mechanisms so the
 * callee CANNOT hear the agent after toggling Mute, even when:
 *   - the Twilio SDK's own .mute() fails to take effect for any reason
 *   - the agent's environment is fighting back (echo, ambient pickup)
 *   - we have multiple Calls alive at once (zombies from prior dials)
 *
 * Layer 1: `call.mute(shouldMute)` — what the SDK officially exposes. Sets
 *           the local audio track's `enabled` to !shouldMute, which makes
 *           WebRTC send silence frames instead of voice. This is the soft
 *           mute Twilio documents.
 *
 * Layer 2: `track.enabled = !shouldMute` on every track of the Call's local
 *           MediaStream — belt-and-braces in case Layer 1's track binding
 *           drifted (e.g. after a track replacement during reconnect).
 *
 * Layer 3: `RTCRtpSender.replaceTrack(null)` on every audio sender of every
 *           PeerConnection — HARD mute. WebRTC stops sending RTP packets
 *           entirely (no silence frames either). This is the only way to be
 *           100% certain no audio leaves the browser. We stash the original
 *           track and restore it on unmute via `replaceTrack(originalTrack)`.
 *
 * Returns shouldMute when at least one Call was processed. Logs a detailed
 * report of every sender's state so DevTools console proves whether the
 * mute actually engaged at the WebRTC level. If the callee still hears the
 * agent after we log "every sender muted", the audio leak is environmental
 * (e.g. the callee's own mic picking up ambient sound) — not software.
 */
export function muteAllCalls(shouldMute: boolean, fallbackCall?: TwilioCall | null): boolean {
  // device.calls is only populated reliably for inbound calls — outbound
  // dials placed via device.connect() come back as a Call object that the
  // caller holds, but the SDK does NOT push them into the public `calls`
  // array (verified live: Hugo's mute logs showed `calls: 0, senders: []`
  // mid-call). If the device list is empty, fall back to whatever Call the
  // caller is holding (activeTwilioCallRef / device.activeCall).
  let calls = getDeviceCalls();
  if (calls.length === 0 && fallbackCall) {
    calls = [fallbackCall];
  }
  let processed = false;
  const report: Array<{ idx: number; sender: number; trackId: string; enabled: boolean; replaced: boolean }> = [];

  for (let i = 0; i < calls.length; i++) {
    const c = calls[i];

    // Layer 1: the SDK's documented mute (also fires the 'mute' event).
    try { c.mute(shouldMute); processed = true; } catch (e) { console.warn('[twilio-voice] mute layer1 threw', e); }

    // Layer 2: directly disable every track on the Call's local stream.
    try {
      const stream = c.getLocalStream?.();
      stream?.getAudioTracks?.().forEach((t: MediaStreamTrack) => {
        t.enabled = !shouldMute;
      });
    } catch (e) { console.warn('[twilio-voice] mute layer2 threw', e); }

    // Layer 3: replace the audio sender's track. This is the only mute that
    // truly stops RTP packets from being sent. We have to reach into the
    // SDK's private _mediaHandler to get the RTCPeerConnection.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pc: RTCPeerConnection | undefined = (c as any)?._mediaHandler?.version?.pc;
      if (pc && typeof pc.getSenders === 'function') {
        const senders = pc.getSenders();
        for (let s = 0; s < senders.length; s++) {
          const sender = senders[s];
          if (sender.track && sender.track.kind !== 'audio') continue;

          if (shouldMute) {
            // Stash the current track so we can restore on unmute.
            if (sender.track) _stashedTracks.set(sender, sender.track);
            // Fire-and-forget — replaceTrack returns a Promise but we don't
            // need to await it for the mute to engage at the sender level.
            void sender.replaceTrack(null).catch((e) =>
              console.warn('[twilio-voice] replaceTrack(null) rejected', e)
            );
            report.push({
              idx: i,
              sender: s,
              trackId: sender.track?.id ?? '<gone>',
              enabled: false,
              replaced: true,
            });
          } else {
            // Restore the original track if we have it stashed.
            const original = _stashedTracks.get(sender);
            if (original) {
              void sender.replaceTrack(original).catch((e) =>
                console.warn('[twilio-voice] replaceTrack(restore) rejected', e)
              );
              _stashedTracks.delete(sender);
              report.push({
                idx: i,
                sender: s,
                trackId: original.id,
                enabled: true,
                replaced: true,
              });
            } else {
              // No stash — re-enable whatever's there.
              if (sender.track) sender.track.enabled = true;
              report.push({
                idx: i,
                sender: s,
                trackId: sender.track?.id ?? '<none>',
                enabled: sender.track?.enabled ?? false,
                replaced: false,
              });
            }
          }
        }
      }
    } catch (e) { console.warn('[twilio-voice] mute layer3 threw', e); }
  }

  console.info('[twilio-voice] muteAllCalls', { shouldMute, calls: calls.length, senders: report });
  return processed && shouldMute;
}

/**
 * Disconnect every active Call on the Device. Used to evict zombies before
 * placing a fresh dial so we don't accumulate parallel audio paths.
 */
export function disconnectAllCalls(): void {
  if (!device) return;
  try {
    device.disconnectAll();
  } catch (e) {
    console.warn('[twilio-voice] disconnectAll threw', e);
  }
}
