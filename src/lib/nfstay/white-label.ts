// NFStay White-Label — hostname detection and operator resolution
// Determines if the current page is being viewed on a white-label domain

import { supabase } from '@/integrations/supabase/client';
import type { NfsOperator } from './types';

/** Reserved subdomains that cannot be claimed by operators */
const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'connect', 'cd', 'admin', 'app', 'mail', 'staging', 'dev',
]);

/** Hub domain — marketplace10 routes, NOT white-label */
const HUB_DOMAIN = 'hub.nfstay.com';

/** Main NFStay domain — traveler-facing (not white-label) */
const MAIN_DOMAIN = 'nfstay.app';

/** Wildcard parent for white-label subdomains */
const WL_PARENT = '.nfstay.app';

export type WhiteLabelMode =
  | { type: 'hub' }                         // hub.nfstay.com — marketplace10 + operator dashboard
  | { type: 'main' }                        // nfstay.app — traveler-facing
  | { type: 'subdomain'; subdomain: string } // brand.nfstay.app — white-label
  | { type: 'custom'; domain: string }       // bookings.example.com — custom domain
  | { type: 'dev' };                         // localhost or preview — normal dev

/**
 * Detect the white-label mode from the current hostname.
 * Pure function — no DB calls.
 */
export function detectWhiteLabelMode(hostname: string): WhiteLabelMode {
  const host = hostname.toLowerCase();

  // localhost or Vercel preview URLs → dev mode
  if (
    host === 'localhost' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1') ||
    host.endsWith('.vercel.app')
  ) {
    return { type: 'dev' };
  }

  // hub.nfstay.com → marketplace10
  if (host === HUB_DOMAIN) {
    return { type: 'hub' };
  }

  // nfstay.app (exact) → main traveler site
  if (host === MAIN_DOMAIN) {
    return { type: 'main' };
  }

  // *.nfstay.app → white-label subdomain
  if (host.endsWith(WL_PARENT)) {
    const subdomain = host.slice(0, -WL_PARENT.length);
    if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
      return { type: 'subdomain', subdomain };
    }
    // Reserved subdomain → treat as main
    return { type: 'main' };
  }

  // Any other hostname → custom domain
  return { type: 'custom', domain: host };
}

/**
 * Resolve the operator for a white-label domain.
 * Returns null if the operator is not found or not verified.
 */
export async function resolveWhiteLabelOperator(
  mode: WhiteLabelMode
): Promise<NfsOperator | null> {
  if (mode.type === 'hub' || mode.type === 'dev' || mode.type === 'main') {
    return null; // Not white-label
  }

  try {
    if (mode.type === 'subdomain') {
      const { data } = await (supabase.from('nfs_operators') as any)
        .select('*')
        .eq('subdomain', mode.subdomain)
        .eq('landing_page_enabled', true)
        .maybeSingle();
      return data as NfsOperator | null;
    }

    if (mode.type === 'custom') {
      const { data } = await (supabase.from('nfs_operators') as any)
        .select('*')
        .eq('custom_domain', mode.domain)
        .eq('custom_domain_verified', true)
        .eq('landing_page_enabled', true)
        .maybeSingle();
      return data as NfsOperator | null;
    }
  } catch {
    return null;
  }

  return null;
}
