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
    priceId: '69b5b794c6731008d7ae723c',
  },
  lifetime: {
    productId: '69b5b777711f98f382f110ff',
    priceId: '69b5b7a8081db612f9fbfe60',
  },
  annual: {
    productId: '69b5b7791fe1a8f21eb651b5',
    priceId: '69b5b7ab247cf6a48020f434',
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
};

/**
 * GHL Funnel entry URL.
 * This is the URL of the first funnel step (cart page) built in GHL dashboard.
 * Set via VITE_GHL_FUNNEL_URL env var once the funnel is created in GHL.
 * The full flow (cart → upsell → downsell → thank you) is handled by GHL.
 */
export function getFunnelUrl(contactInfo?: { email?: string; name?: string; phone?: string }): string {
  const base = import.meta.env.VITE_GHL_FUNNEL_URL || '';
  if (!base) return '';
  const params = new URLSearchParams();
  if (contactInfo?.email) params.set('email', contactInfo.email);
  if (contactInfo?.name) params.set('name', contactInfo.name);
  if (contactInfo?.phone) params.set('phone', contactInfo.phone);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
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
