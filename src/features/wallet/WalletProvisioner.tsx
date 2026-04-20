// WalletProvisioner — Lives in DashboardLayout.
// Behaviour on dashboard mount:
//   - If the user has a wallet: silently restore the Particle session.
//   - If the user has NO wallet: auto-show the interactive Particle modal so the
//     user can create one immediately (primarily for email signups; social users
//     arrive with a wallet already attached from the OAuth callback).
// Also exposes requireWallet(message) so pages can trigger the modal on demand
// (e.g. "Copy referral link" button, "Become a Partner" on invest marketplace).

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

  // On mount: restore session for existing wallets, OR auto-show modal for new users.
  // The interactive modal uses the same working path as the "Copy referral link" button —
  // the silent JWT path was unreliable for email-signup users and has been removed.
  useEffect(() => {
    if (!user?.id || checkedRef.current) return;
    if (window.location.pathname.includes('/settings')) return;
    checkedRef.current = true;

    (supabase.from('profiles') as any)
      .select('wallet_address, wallet_auth_method')
      .eq('id', user.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.wallet_address) {
          restoreSession(user.id, data.wallet_auth_method || 'jwt');
        } else {
          // No wallet yet (new email-signup user). Auto-show the modal so the user
          // completes the Particle interactive flow. Delay slightly so the dashboard
          // can paint before the modal overlays it.
          setTimeout(() => {
            setModalMessage("Let's finish setting up your account so you can use all nfstay features.");
            setShowModal(true);
          }, 1500);
        }
      });
  }, [user?.id]);

  // Close modal when wallet appears, sync the wallet to GHL, then hard refresh.
  useEffect(() => {
    if (walletAddress && showModal) {
      setWalletDone(true);
      if (resolveRef.current) resolveRef.current(true);
      resolveRef.current = null;

      // Push wallet to GHL BEFORE reloading. Previously the reload fired in parallel,
      // which cancelled the in-flight fetch for fast Particle sessions and left the
      // Wallet Address custom field empty in GHL (confirmed via contact audit).
      (async () => {
        if (user?.id) {
          try {
            const { data } = await (supabase.from('profiles') as any)
              .select('name, email, whatsapp')
              .eq('id', user.id)
              .single();
            await supabase.functions.invoke('ghl-signup-sync', {
              body: {
                user_id: user.id,
                name: data?.name || '',
                email: data?.email || '',
                phone: data?.whatsapp || '',
                wallet_address: walletAddress,
              },
            });
          } catch (err) {
            console.error('[WalletProvisioner] ghl-signup-sync failed:', err);
          }
        }
        // Tiny delay so the user sees the "Account verified" success state.
        setTimeout(() => window.location.reload(), 600);
      })();
    }
  }, [walletAddress, showModal, user?.id]);

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

                <div className="flex flex-col gap-2 mt-4">
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full h-11 text-white font-semibold"
                    style={{ background: '#1E9A80' }}
                  >
                    Continue
                  </Button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      if (resolveRef.current) resolveRef.current(false);
                      resolveRef.current = null;
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Not now
                  </button>
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

