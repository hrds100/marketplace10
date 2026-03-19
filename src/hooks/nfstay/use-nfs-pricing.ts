import { useState, useMemo } from 'react';
import type { NfsProperty } from '@/lib/nfstay/types';
import { calculatePricing, type PricingBreakdown } from '@/lib/nfstay/pricing';

interface UseNfsPricingReturn {
  pricing: PricingBreakdown | null;
  promoDiscount: { type: 'fixed' | 'percentage'; value: number } | undefined;
  setPromoDiscount: (d: { type: 'fixed' | 'percentage'; value: number } | undefined) => void;
}

export function useNfsPricing(
  property: NfsProperty | null,
  checkIn: string,
  checkOut: string,
  adults: number,
  children: number
): UseNfsPricingReturn {
  const [promoDiscount, setPromoDiscount] = useState<{ type: 'fixed' | 'percentage'; value: number } | undefined>();

  const pricing = useMemo(() => {
    if (!property || !checkIn || !checkOut) return null;

    try {
      return calculatePricing({
        property,
        checkIn,
        checkOut,
        adults,
        children,
        promoDiscount,
      });
    } catch {
      return null;
    }
  }, [property, checkIn, checkOut, adults, children, promoDiscount]);

  return { pricing, promoDiscount, setPromoDiscount };
}
