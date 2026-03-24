// WalletProvisioner — Lives in DashboardLayout.
// Does NOT auto-show on page load. Instead, exposes a trigger that pages can call
// when a user without a wallet tries to do something that requires one
// (copy affiliate link, invest in a property).

import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Context: lets any page trigger the wallet verification modal ──
type WalletGateContextType = {
  requireWallet: (message: string) => Promise<boolean>;
  hasWallet: boolean;
};

const WalletGateContext = createContext<WalletGateContextType>({
  requireWallet: async () => false,
  hasWallet: false,
});

export function useWalletGate() {
  return useContext(WalletGateContext);
}

// ── Provider + Modal ──
export default function WalletProvisioner({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const { address: walletAddress, connect: connectWallet, connecting } = useWallet();
  const checkedRef = useRef(false);
  const [showModal, setShowModal] = useState(false);
  const [walletDone, setWalletDone] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  // Restore Particle session silently on mount (no modal)
  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    checkedRef.current = true;

    (supabase.from('profiles') as any)
      .select('wallet_address, wallet_auth_method')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.wallet_address) {
          restoreSession(user.id, data.wallet_auth_method || 'jwt');
        }
      });
  }, [user?.id]);

  // Close modal when wallet appears
  useEffect(() => {
    if (walletAddress && showModal) {
      setWalletDone(true);
      if (resolveRef.current) resolveRef.current(true);
      resolveRef.current = null;
      setTimeout(() => {
        setShowModal(false);
        setWalletDone(false);
      }, 1500);
    }
  }, [walletAddress, showModal]);

  // The trigger: returns a promise that resolves true if wallet connected, false if user closed
  const requireWallet = useCallback(async (message: string): Promise<boolean> => {
    if (walletAddress) return true; // already has wallet
    setModalMessage(message);
    setShowModal(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, [walletAddress]);

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast.success('Account verified!');
    } catch {
      toast.error('Verification incomplete. Please try again.');
    }
  };

  const contextValue = { requireWallet, hasWallet: !!walletAddress };

  return (
    <WalletGateContext.Provider value={contextValue}>
      {children}

      {/* Modal overlay */}
      {showModal && !connecting && (
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
                  {modalMessage}
                </p>

                <div className="mt-4">
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full h-11 text-white font-semibold"
                    style={{ background: '#1E9A80' }}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Blurred backdrop while Particle popup is active */}
      {showModal && connecting && (
        <div className="fixed inset-0 z-[9998]" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }} />
      )}
    </WalletGateContext.Provider>
  );
}

// ── Session restore helpers (silent, no user interaction) ──

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

    let accounts: string[] = [];
    if (pa.ethereum) {
      try {
        accounts = await pa.ethereum.request({ method: 'eth_accounts' });
      } catch { /* not connected yet */ }
    }

    if (Array.isArray(accounts) && accounts.length > 0) return;

    await particleConnect({ socialType: authMethod as any });
  } catch (err) {
    console.log('[WalletProvisioner] Social session restore deferred:', (err as any)?.message || err);
  }
}

async function restoreParticleSession(userId: string) {
  try {
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

    let accounts: string[] = [];
    if (pa.ethereum) {
      try {
        accounts = await pa.ethereum.request({ method: 'eth_accounts' });
      } catch { /* not connected yet */ }
    }

    if (Array.isArray(accounts) && accounts.length > 0) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
    const res = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
      body: JSON.stringify({ user_id: userId }),
    });
    const jwtData = await res.json();
    const jwt: string | null = jwtData?.jwt || null;
    if (!jwt) return;

    await particleConnect({ provider: 'jwt' as any, thirdpartyCode: jwt });
  } catch (err) {
    console.log('[WalletProvisioner] Particle session restore failed:', err);
  }
}
