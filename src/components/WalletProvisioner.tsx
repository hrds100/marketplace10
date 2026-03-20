// WalletProvisioner — Runs once per session inside DashboardLayout.
// If the user has no wallet_address in their profile, generates a JWT
// and creates a Particle wallet in the background.
// Renders nothing. Completely silent.

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createParticleWallet, destroyIframe } from '@/lib/particleIframe';

export default function WalletProvisioner() {
  const { user } = useAuth();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || attemptedRef.current) return;
    attemptedRef.current = true;

    provisionWallet(user.id);
  }, [user?.id]);

  return null;
}

async function provisionWallet(userId: string) {
  try {
    // 1. Check if wallet already exists
    const { data } = await (supabase.from('profiles') as any)
      .select('wallet_address, wallet_auth_method, wallet_change_allowed_until')
      .eq('id', userId)
      .single();

    if (data?.wallet_address) {
      console.log('[WalletProvisioner] Wallet exists:', data.wallet_address);
      const authMethod = (data as any).wallet_auth_method || 'jwt';
      if (authMethod !== 'jwt') {
        // Social login user — wallet was set at signup. Restore session via social reconnect.
        await restoreParticleSocialSession(authMethod);
      } else {
        // JWT user — restore via JWT
        await restoreParticleSession(userId);
      }
      return;
    }

    // Skip JWT creation for social users (wallet should have been set at signup)
    const authMethod = (data as any)?.wallet_auth_method || 'jwt';
    if (authMethod !== 'jwt') {
      console.log('[WalletProvisioner] Social user — skipping JWT wallet creation');
      await restoreParticleSocialSession(authMethod);
      return;
    }

    // Also skip if wallet change was recently granted (user is managing their own wallet)
    if (data?.wallet_change_allowed_until && new Date(data.wallet_change_allowed_until) > new Date()) {
      console.log('[WalletProvisioner] Wallet change window active — skipping auto-creation');
      return;
    }

    console.log('[WalletProvisioner] No wallet — starting creation...');

    // 2. Get or generate JWT
    let jwt: string | null = null;
    try { jwt = sessionStorage.getItem('particle_jwt'); } catch { /* skip */ }

    if (!jwt) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asazddtvjvmckouxcmmo.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const res = await fetch(`${supabaseUrl}/functions/v1/particle-generate-jwt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ user_id: userId }),
      });
      const jwtData = await res.json();
      jwt = jwtData?.jwt || null;
      if (!jwt) {
        console.log('[WalletProvisioner] JWT generation failed');
        return;
      }
    }

    // 3. Create wallet via lazy-loaded Particle SDK
    const address = await createParticleWallet(jwt);

    if (address) {
      // 4. Save to profile
      await (supabase.from('profiles') as any)
        .update({ wallet_address: address })
        .eq('id', userId);
      console.log('[WalletProvisioner] Wallet created:', address);
      try { sessionStorage.removeItem('particle_jwt'); } catch { /* skip */ }

      // 5. Notify user via WhatsApp + email (fire-and-forget)
      try {
        const { data: profile } = await (supabase.from('profiles') as any)
          .select('name, whatsapp, email:id')
          .eq('id', userId)
          .single();
        const { data: authData } = await supabase.auth.getUser();
        const email = authData?.user?.email || '';
        const phone = profile?.whatsapp || '';
        const name = profile?.name || '';

        const N8N_BASE = (import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv886554.hstgr.cloud').replace(/\/$/, '');
        fetch(`${N8N_BASE}/webhook/wallet-created`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            wallet_address: address,
            email,
            phone,
            name,
          }),
        }).catch(() => {}); // Silent — never block on notification failure
      } catch {
        // Notification failed — wallet is still created, non-critical
      }
    }

    destroyIframe();
  } catch (err) {
    console.log('[WalletProvisioner] Failed (non-blocking):', err);
    destroyIframe();
  }
}

// Restore Particle session for social login users (Google, Apple, Twitter, Facebook).
// Checks if session is already live; if not, triggers social reconnect.
async function restoreParticleSocialSession(authMethod: string) {
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

    // Check if already connected
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

    // Session expired — reconnect with social provider (opens popup on interaction)
    console.log('[WalletProvisioner] Social session not found — reconnecting via', authMethod);
    await particleConnect({ socialType: authMethod as any });
    console.log('[WalletProvisioner] Social Particle session restored via', authMethod);
  } catch (err) {
    // Expected if user hasn't interacted yet — not an error
    console.log('[WalletProvisioner] Social session restore deferred (no user interaction):', (err as any)?.message || err);
  }
}

// Restore Particle auth-core signing session for users who already have a wallet.
// Called on every dashboard load so particleAuth.ethereum is ready before any tx.
async function restoreParticleSession(userId: string) {
  try {
    const { particleAuth, connect: particleConnect } = await import('@particle-network/auth-core');
    const { bsc } = await import('@particle-network/authkit/chains');
    const { PARTICLE_CONFIG } = await import('@/lib/particle');
    const pa = particleAuth as any;

    // Step 1: init (idempotent — safe to call multiple times)
    try {
      pa.init({
        projectId: PARTICLE_CONFIG.projectId,
        clientKey: PARTICLE_CONFIG.clientKey,
        appId: PARTICLE_CONFIG.appId,
        chains: [bsc],
      });
    } catch { /* already initialized */ }

    // Step 2: check if session is already live
    // NOTE: must NOT use optional chaining + .catch() together — if pa.ethereum is
    // undefined, `pa.ethereum?.request()` returns undefined, then undefined.catch()
    // throws TypeError before the outer catch can help.
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

    // Step 3: session expired or first load — reconnect silently with a fresh JWT
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
