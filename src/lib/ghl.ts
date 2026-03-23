/**
 * GoHighLevel (GHL) configuration
 * Products created via GHL Products API — GBP only
 *
 * The payment funnel (cart → upsell → downsell → thank you)
 * lives entirely inside GHL. This file only stores IDs for
 * webhook tier-mapping and the funnel entry URL.
 */

export const GHL_LOCATION_ID = 'eFBsWXY3BmWDGIRez13x';

export const GHL_PRODUCTS = {
  monthly: {
    productId: '69b5b769081db66d1afbf145',
    priceId: '69b5d533d314dc23b8a6f918',
  },
  lifetime: {
    productId: '69b5b777711f98f382f110ff',
    priceId: '69b5d535a0334430aa1f2eac',
  },
  annual: {
    productId: '69b5b7791fe1a8f21eb651b5',
    priceId: '69b5d5371fe1a88dbdba1590',
  },
} as const;

/** Map GHL product IDs → tier names (used by n8n webhook) */
export const PRODUCT_ID_TO_TIER: Record<string, string> = {
  [GHL_PRODUCTS.monthly.productId]: 'monthly',
  [GHL_PRODUCTS.lifetime.productId]: 'lifetime',
  [GHL_PRODUCTS.annual.productId]: 'yearly',
};

export const PRICE_ID_TO_TIER: Record<string, string> = {
  [GHL_PRODUCTS.monthly.priceId]: 'monthly',
  [GHL_PRODUCTS.lifetime.priceId]: 'lifetime',
  [GHL_PRODUCTS.annual.priceId]: 'yearly',
  // Legacy price IDs — wrong amounts (6700/99700/39700 pennies) from initial GHL setup.
  // Keep mapped for backward compatibility with any existing webhook calls.
  '69b5b794c6731008d7ae723c': 'monthly',
  '69b5b7a8081db612f9fbfe60': 'lifetime',
  '69b5b7ab247cf6a48020f434': 'yearly',
};

/**
 * GHL Funnel entry URL.
 * Custom domain: pay.nfstay.com
 *
 * Funnel flow (all hosted on GHL):
 *   1. Cart:      https://pay.nfstay.com/order        (£67/mo)
 *   2. Upsell:    https://pay.nfstay.com/upsell       (£997 lifetime)
 *   3. Downsell:  https://pay.nfstay.com/Down          (£397/yr)
 *   4. Thank You: https://pay.nfstay.com/thank-You
 *
 * Set VITE_GHL_FUNNEL_URL to the cart page URL.
 * IMPORTANT: Do NOT use preview URLs (app.leadconnectorhq.com/v2/preview/...) —
 * they cause fingerprint errors. Always use the published pay.nfstay.com domain.
 */
export function getFunnelUrl(contactInfo?: { email?: string; name?: string; phone?: string; ref?: string }): string {
  const base = import.meta.env.VITE_GHL_FUNNEL_URL || '';
  if (!base) return '';
  const params = new URLSearchParams();
  if (contactInfo?.email) params.set('email', contactInfo.email);
  if (contactInfo?.name) params.set('name', contactInfo.name);
  if (contactInfo?.phone) params.set('phone', contactInfo.phone);
  if (contactInfo?.ref) params.set('ref', contactInfo.ref);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Returns a GHL funnel URL with tier pre-selected for analytics.
 */
export function getUpgradeUrl(targetTier: string, contactInfo?: { email?: string; ref?: string }): string {
  const base = import.meta.env.VITE_GHL_FUNNEL_URL || '';
  if (!base) return '';
  const params = new URLSearchParams();
  params.set('tier', targetTier);
  if (contactInfo?.email) params.set('email', contactInfo.email);
  if (contactInfo?.ref) params.set('ref', contactInfo.ref);
  return `${base}?${params.toString()}`;
}

// ── Tier helpers ──

export type TierName = 'free' | 'monthly' | 'yearly' | 'lifetime';

export function isPaidTier(tier: string | null | undefined): boolean {
  return tier === 'monthly' || tier === 'yearly' || tier === 'lifetime';
}

export function tierDisplayName(tier: TierName): string {
  switch (tier) {
    case 'monthly': return 'Monthly (£67/mo)';
    case 'yearly': return 'Annual (£397/yr)';
    case 'lifetime': return 'Lifetime (£997)';
    default: return 'Free';
  }
}
