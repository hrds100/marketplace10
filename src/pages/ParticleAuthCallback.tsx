// Particle social login callback page.
// After thirdpartyAuth() redirects the user through Google/Apple/etc OAuth,
// Particle redirects back to this page. We complete the connect() call here.
//
// State is persisted in localStorage before the redirect:
//   particle_intent: { type: 'signup'|'signin', provider: 'google'|..., redirectTo?: string }
//
// After connect() resolves, userInfo is saved to localStorage and the user
// is forwarded to SignUp (phone step) or SignIn (auto sign-in).

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function derivedPassword(uuid: string): string {
  return uuid.slice(0, 10) + '_NFsTay2!' + uuid.slice(-6);
}

export default function ParticleAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCallback() {
    try {
      const rawIntent = localStorage.getItem('particle_intent');
      if (!rawIntent) {
        setErrMsg('Session expired. Please try again.');
        setStatus('error');
        return;
      }
      const intent: { type: 'signup' | 'signin'; provider: string; redirectTo?: string } =
        JSON.parse(rawIntent);
      localStorage.removeItem('particle_intent');

      // Init Particle
      const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
      const { bsc } = await import('@particle-network/authkit/chains');
      const { PARTICLE_LEGACY_CONFIG } = await import('@/lib/particle');
      const pa = particleAuth as any;

      // Use legacy project for social login — same Google account → same wallet (0xAA884...)
      try {
        pa.init({
          projectId: PARTICLE_LEGACY_CONFIG.projectId,
          clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
          appId: PARTICLE_LEGACY_CONFIG.appId,
          chains: [bsc],

        });
      } catch { /* already initialized */ }

      // Decode Particle's callback params from URL
      const urlParams = new URLSearchParams(window.location.search);
      const particleThirdpartyParams = urlParams.get('particleThirdpartyParams');
      let code: string | undefined;
      let nonce: string | undefined;

      if (particleThirdpartyParams) {
        try {
          const decoded = JSON.parse(atob(particleThirdpartyParams));
          code = decoded.code;
          nonce = decoded.nonce;
          console.log('[ParticleCallback] Decoded params — code length:', code?.length, 'nonce:', nonce);
        } catch (e) {
          console.log('[ParticleCallback] Could not decode particleThirdpartyParams:', e);
        }
      }

      // Complete the OAuth flow — pass code + nonce back to Particle
      const userInfo = await particleConnect({
        socialType: intent.provider as any,
        ...(code ? { code } : {}),
        ...(nonce ? { nonce } : {}),
      });

      const evmWallet = (userInfo as any).wallets?.find((w: any) => w.chain_name === 'evm_chain');
      const walletAddress = evmWallet?.public_address || '';
      const email =
        (userInfo as any)[`${intent.provider}_email`] ||
        (userInfo as any).thirdparty_user_info?.user_info?.email ||
        '';
      const name =
        (userInfo as any).thirdparty_user_info?.user_info?.name ||
        email.split('@')[0] ||
        intent.provider;
      const uuid = (userInfo as any).uuid || '';

      try {
        sessionStorage.setItem('particle_uuid', uuid);
        sessionStorage.setItem('particle_auth_method', intent.provider);
      } catch { /* skip */ }

      if (!uuid || !email) {
        setErrMsg('Could not retrieve your account details. Please try again.');
        setStatus('error');
        return;
      }

      const pw = derivedPassword(uuid);

      if (intent.type === 'signup') {
        // Signup path: collect WhatsApp number before creating account
        localStorage.setItem(
          'particle_user',
          JSON.stringify({ email, name, wallet: walletAddress, uuid, authMethod: intent.provider }),
        );
        window.location.href = '/signup';
        return;
      }

      // Signin path: try signIn first, auto-create if no account
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pw });

      if (signInErr) {
        // No account yet — create one automatically (WhatsApp can be added in Settings)
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { data: { name } },
        });

        if (signUpErr) {
          setErrMsg(`Could not create account: ${signUpErr.message}`);
          setStatus('error');
          return;
        }

        // Ensure we have a session (signUp may not return one)
        if (!signUpData?.session) {
          const { error: reSignInErr } = await supabase.auth.signInWithPassword({ email, password: pw });
          if (reSignInErr) {
            setErrMsg(`Sign in after signup failed: ${reSignInErr.message}`);
            setStatus('error');
            return;
          }
        }
      }

      // Always update wallet_auth_method — profile exists (created by trigger on signUp).
      // Use .update() not .upsert() — profiles has no INSERT RLS for regular users.
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        const refCode = localStorage.getItem('nfstay_ref');
        const updatePayload: Record<string, string> = {
          wallet_auth_method: intent.provider,
        };
        if (walletAddress) updatePayload.wallet_address = walletAddress;
        if (refCode) updatePayload.referred_by = refCode;
        await (supabase.from('profiles') as any)
          .update(updatePayload)
          .eq('id', userId);

        // Track referral signup for auto-created accounts (signin path)
        if (refCode) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
          fetch(`${supabaseUrl}/functions/v1/track-referral?code=${encodeURIComponent(refCode)}&event=signup&userId=${userId}&userName=${encodeURIComponent(name)}&userEmail=${encodeURIComponent(email)}`, { method: 'POST' }).catch(() => {});
          localStorage.removeItem('nfstay_ref');
        }
      }

      const dest = intent.redirectTo ? decodeURIComponent(intent.redirectTo) : '/dashboard/deals';
      window.location.href = dest;
    } catch (err: any) {
      console.error('[ParticleAuthCallback] Error:', err);
      setErrMsg(err?.message || 'Authentication failed. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-red-500 font-medium">Sign in failed</p>
          <p className="text-sm text-muted-foreground mt-2">{errMsg}</p>
          <a href="/signup" className="text-primary font-semibold text-sm mt-4 inline-block">
            Back to sign up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div data-feature="AUTH" className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D084]" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
