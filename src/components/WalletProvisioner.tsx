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
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (data?.wallet_address) {
      console.log('[WalletProvisioner] Wallet exists:', data.wallet_address);
      return; // Already has wallet
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
