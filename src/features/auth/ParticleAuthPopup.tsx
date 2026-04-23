// Popup-mode Particle social login callback.
//
// This page ONLY runs inside the popup window opened by
// `particlePopupSocialLogin()` (see src/lib/particlePopupLogin.ts).
//
// Two states:
//   1. Initial load (no `particleThirdpartyParams` in URL):
//      → Initialise Particle auth-core in this popup and call
//        `thirdpartyAuth({ authType, redirectUrl: <this same page> })`.
//        That navigates THIS popup (not the opener) to Particle, which
//        then redirects the popup back here with OAuth params.
//
//   2. OAuth return (`particleThirdpartyParams` in URL):
//      → Decode code + nonce, postMessage them to the opener, close.
//
// No Supabase logic here. No DB writes. The opener finalises the session.

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Provider = 'google' | 'apple' | 'twitter' | 'facebook';

function sendToOpener(msg: {
  type: 'particle-social-auth';
  provider?: string;
  code?: string;
  nonce?: string;
  error?: string;
}) {
  try {
    if (window.opener) {
      window.opener.postMessage(msg, window.location.origin);
    }
  } catch {
    /* ignore */
  }
}

export default function ParticleAuthPopup() {
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [errMsg, setErrMsg] = useState('');
  // Guard against React StrictMode double-invoke consuming OAuth state twice.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    try {
      const url = new URL(window.location.href);
      const provider = (url.searchParams.get('provider') || '') as Provider;
      const particleThirdpartyParams = url.searchParams.get('particleThirdpartyParams');

      // --- State 2: OAuth return ---
      if (particleThirdpartyParams) {
        let code: string | undefined;
        let nonce: string | undefined;
        try {
          const decoded = JSON.parse(atob(particleThirdpartyParams));
          code = decoded.code;
          nonce = decoded.nonce;
        } catch (e: any) {
          sendToOpener({
            type: 'particle-social-auth',
            error: `Failed to decode OAuth params: ${e?.message || 'unknown'}`,
          });
          setErrMsg('Failed to decode OAuth response.');
          setStatus('error');
          return;
        }
        if (!code || !nonce) {
          sendToOpener({
            type: 'particle-social-auth',
            error: 'OAuth response missing code or nonce.',
          });
          setErrMsg('OAuth response incomplete.');
          setStatus('error');
          return;
        }
        sendToOpener({
          type: 'particle-social-auth',
          provider,
          code,
          nonce,
        });
        // Opener closes us too, but close defensively in case message was dropped.
        try { window.close(); } catch { /* ignore */ }
        return;
      }

      // --- State 1: initial load — kick off thirdpartyAuth inside this popup ---
      if (!provider) {
        sendToOpener({
          type: 'particle-social-auth',
          error: 'Missing provider param.',
        });
        setErrMsg('Missing provider.');
        setStatus('error');
        return;
      }

      const { particleAuth, thirdpartyAuth } = await import('@particle-network/auth-core');
      const { bsc } = await import('@particle-network/authkit/chains');
      const { PARTICLE_LEGACY_CONFIG } = await import('@/lib/particle');
      const pa = particleAuth as any;
      try {
        pa.init({
          projectId: PARTICLE_LEGACY_CONFIG.projectId,
          clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
          appId: PARTICLE_LEGACY_CONFIG.appId,
          chains: [bsc],
        });
      } catch { /* already initialized */ }

      // Particle will redirect the popup BACK to this same URL with params.
      const returnUrl = `${window.location.origin}/auth/particle-popup?provider=${encodeURIComponent(provider)}`;
      await thirdpartyAuth({
        authType: provider as any,
        redirectUrl: returnUrl,
      });
      // navigation in progress; nothing else to do.
    } catch (err: any) {
      console.error('[ParticleAuthPopup] Error:', err);
      const msg = err?.message || 'Particle social login failed.';
      sendToOpener({ type: 'particle-social-auth', error: msg });
      setErrMsg(msg);
      setStatus('error');
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-500 font-medium">Sign in failed</p>
          <p className="text-sm text-muted-foreground mt-2">{errMsg}</p>
          <button
            type="button"
            onClick={() => { try { window.close(); } catch { /* ignore */ } }}
            className="mt-4 text-sm text-primary font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="AUTH__POPUP" className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D084]" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
