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
      const { PARTICLE_CONFIG } = await import('@/lib/particle');
      const pa = particleAuth as any;

      try {
        pa.init({
          projectId: PARTICLE_CONFIG.projectId,
          clientKey: PARTICLE_CONFIG.clientKey,
          appId: PARTICLE_CONFIG.appId,
          chains: [bsc],
        });
      } catch { /* already initialized */ }

      // Complete the OAuth flow — Particle reads the callback params from the URL
      const userInfo = await particleConnect({ socialType: intent.provider as any });

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

      if (intent.type === 'signup') {
        // Save particle info for SignUp phone collection step
        localStorage.setItem(
          'particle_user',
          JSON.stringify({ email, name, wallet: walletAddress, uuid, authMethod: intent.provider }),
        );
        window.location.href = '/signup';
        return;
      }

      // signin: create Supabase session
      if (!uuid || !email) {
        setErrMsg('Could not retrieve account details. Please try signing up first.');
        setStatus('error');
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: derivedPassword(uuid),
      });

      if (signInErr) {
        // No account — redirect to signup
        localStorage.setItem(
          'particle_user',
          JSON.stringify({ email, name, wallet: walletAddress, uuid, authMethod: intent.provider }),
        );
        toast.error('No account found. Please sign up first.');
        window.location.href = '/signup';
        return;
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00D084]" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
