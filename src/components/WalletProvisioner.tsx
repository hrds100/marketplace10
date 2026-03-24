// WalletProvisioner — Runs once per session inside DashboardLayout.
// If the user has no wallet_address, shows a modal prompting them to connect.
// For email/password users, Particle requires email verification (interactive popup).
// For social login users, wallet was already created at signup — just restores session.

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// CSS injection to rebrand the Particle popup
const PARTICLE_CSS = `
  .particle-auth-core-modal [class*="title"],
  .particle-auth-core-modal h2 {
    font-family: 'Inter', sans-serif !important;
  }
  .particle-auth-core-modal button[class*="primary"],
  .particle-auth-core-modal button[type="submit"] {
    background: #1E9A80 !important;
    border-radius: 10px !important;
  }
  .particle-auth-core-modal button[class*="primary"]:hover,
  .particle-auth-core-modal button[type="submit"]:hover {
    background: #178a72 !important;
  }
`;

function injectParticleBranding() {
  // Inject CSS once
  if (!document.getElementById('nfstay-particle-css')) {
    const style = document.createElement('style');
    style.id = 'nfstay-particle-css';
    style.textContent = PARTICLE_CSS;
    document.head.appendChild(style);
  }

  // Watch for Particle iframes/modals and rebrand them
  const observer = new MutationObserver(() => {
    // Target the Particle popup iframe content
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        const src = iframe.src || '';
        if (!src.includes('particle') && !src.includes('auth-core')) return;
        const doc = iframe.contentDocument;
        if (!doc) return;
        if (doc.getElementById('nfstay-particle-css')) return;
        const style = doc.createElement('style');
        style.id = 'nfstay-particle-css';
        style.textContent = PARTICLE_CSS;
        doc.head.appendChild(style);
      } catch { /* cross-origin — can't access iframe content */ }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

export default function WalletProvisioner() {
  const { user } = useAuth();
  const { address: walletAddress, connect: connectWallet, connecting } = useWallet();
  const checkedRef = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [walletDone, setWalletDone] = useState(false);

  // Inject Particle branding CSS
  useEffect(() => {
    const observer = injectParticleBranding();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    checkedRef.current = true;

    // Check if user needs a wallet
    (supabase.from('profiles') as any)
      .select('wallet_address, wallet_auth_method')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.wallet_address) {
          // Wallet exists — restore Particle session silently
          restoreSession(user.id, data.wallet_auth_method || 'jwt');
          return;
        }

        // Social login users should already have a wallet — skip modal
        const authMethod = data?.wallet_auth_method || 'jwt';
        if (authMethod !== 'jwt') return;

        // Email user with no wallet — show the connect modal
        // Small delay so the dashboard loads first
        setTimeout(() => setShowModal(true), 1000);
      });
  }, [user?.id]);

  // Close modal when wallet appears (from connectWallet or other source)
  useEffect(() => {
    if (walletAddress && showModal) {
      setWalletDone(true);
      setTimeout(() => {
        setShowModal(false);
        setWalletDone(false);
      }, 1500);
    }
  }, [walletAddress, showModal]);

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast.success('Account verified!');
    } catch {
      toast.error('Verification incomplete. Please try again.');
    }
  };

  if (!showModal) return null;

  // While Particle popup is active: show blurred backdrop but no card (so Particle gets focus)
  if (connecting) {
    return (
      <div className="fixed inset-0 z-[9998]" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }} />
    );
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] mx-4 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5" style={{ color: '#1E9A80' }} />
          <h2 className="text-lg font-bold text-foreground">Quick account verification</h2>
        </div>

        {walletDone ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: '#1E9A80' }} />
            <p className="text-sm font-medium mt-3" style={{ color: '#1E9A80' }}>Account verified!</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              We need to quickly verify your account. Click continue and enter the email you used to register.
            </p>

            <div className="mt-4">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full h-11 text-white font-semibold"
                style={{ background: '#1E9A80' }}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Check your email for the code...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Session restore helpers (kept from original — no user interaction needed) ──

async function restoreSession(userId: string, authMethod: string) {
  if (authMethod !== 'jwt') {
    await restoreParticleSocialSession(authMethod);
  } else {
    await restoreParticleSession(userId);
  }
}

async function restoreParticleSocialSession(authMethod: string) {
  try {
    const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
    const { bsc } = await import('@particle-network/authkit/chains');
    const { PARTICLE_LEGACY_CONFIG, PARTICLE_CUSTOM_STYLE } = await import('@/lib/particle');
    const pa = particleAuth as any;

    try {
      pa.init({
        projectId: PARTICLE_LEGACY_CONFIG.projectId,
        clientKey: PARTICLE_LEGACY_CONFIG.clientKey,
        appId: PARTICLE_LEGACY_CONFIG.appId,
        chains: [bsc],
        customStyle: PARTICLE_CUSTOM_STYLE,
      });
    } catch { /* already initialized */ }

    let accounts: string[] = [];
    if (pa.ethereum) {
      try {
        accounts = await pa.ethereum.request({ method: 'eth_accounts' });
      } catch { /* not connected yet */ }
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      console.log('[WalletProvisioner] Social Particle session active:', accounts[0]);
      return;
    }

    console.log('[WalletProvisioner] Social session not found — reconnecting via', authMethod);
    await particleConnect({ socialType: authMethod as any });
    console.log('[WalletProvisioner] Social Particle session restored via', authMethod);
  } catch (err) {
    console.log('[WalletProvisioner] Social session restore deferred (no user interaction):', (err as any)?.message || err);
  }
}

async function restoreParticleSession(userId: string) {
  try {
    const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
    const { bsc } = await import('@particle-network/authkit/chains');
    const { PARTICLE_CONFIG, PARTICLE_CUSTOM_STYLE } = await import('@/lib/particle');
    const pa = particleAuth as any;

    try {
      pa.init({
        projectId: PARTICLE_CONFIG.projectId,
        clientKey: PARTICLE_CONFIG.clientKey,
        appId: PARTICLE_CONFIG.appId,
        chains: [bsc],
        customStyle: PARTICLE_CUSTOM_STYLE,
      });
    } catch { /* already initialized */ }

    let accounts: string[] = [];
    if (pa.ethereum) {
      try {
        accounts = await pa.ethereum.request({ method: 'eth_accounts' });
      } catch { /* not connected yet */ }
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      console.log('[WalletProvisioner] Particle session active:', accounts[0]);
      return;
    }

    console.log('[WalletProvisioner] Particle session not found — reconnecting...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    const res = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
      body: JSON.stringify({ user_id: userId }),
    });
    const jwtData = await res.json();
    const jwt: string | null = jwtData?.jwt || null;
    if (!jwt) {
      console.log('[WalletProvisioner] JWT fetch returned nothing — cannot restore Particle session');
      return;
    }

    await particleConnect({ provider: 'jwt' as any, thirdpartyCode: jwt });
    console.log('[WalletProvisioner] Particle signing session restored via JWT');
  } catch (err) {
    console.log('[WalletProvisioner] Particle session restore failed (non-blocking):', err);
  }
}
