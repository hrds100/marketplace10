// NFStay pricing calculation utility
// Calculates: (base rate × nights) + cleaning fee + extra guest fee + custom fees − discounts

import type { NfsProperty } from './types';

export interface PricingInput {
  property: NfsProperty;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  adults: number;
  children: number;
  promoDiscount?: { type: 'fixed' | 'percentage'; value: number };
}

export interface PricingLineItem {
  label: string;
  amount: number;
  type: 'base' | 'fee' | 'discount';
}

export interface PricingBreakdown {
  nights: number;
  nightlyRate: number;
  currency: string;
  lineItems: PricingLineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
}

function daysBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { property, checkIn, checkOut, adults, children, promoDiscount } = input;
  const nights = daysBetween(checkIn, checkOut);
  const totalGuests = adults + children;
  const nightlyRate = property.base_rate_amount || 0;
  const currency = property.base_rate_currency || 'USD';

  const lineItems: PricingLineItem[] = [];

  // Base accommodation
  const baseAmount = nightlyRate * nights;
  lineItems.push({
    label: `${nights} night${nights !== 1 ? 's' : ''} × ${currency} ${nightlyRate.toFixed(2)}`,
    amount: baseAmount,
    type: 'base',
  });

  // Cleaning fee
  if (property.cleaning_fee?.enabled && property.cleaning_fee.amount) {
    lineItems.push({
      label: 'Cleaning fee',
      amount: property.cleaning_fee.amount,
      type: 'fee',
    });
  }

  // Extra guest fee
  if (property.extra_guest_fee?.enabled && property.extra_guest_fee.amount) {
    const threshold = property.extra_guest_fee.after_guests || 1;
    const extraGuests = Math.max(0, totalGuests - threshold);
    if (extraGuests > 0) {
      const extraAmount = property.extra_guest_fee.amount * extraGuests * nights;
      lineItems.push({
        label: `Extra guest fee (${extraGuests} guest${extraGuests !== 1 ? 's' : ''} × ${nights} night${nights !== 1 ? 's' : ''})`,
        amount: extraAmount,
        type: 'fee',
      });
    }
  }

  // Custom fees from property
  if (Array.isArray(property.custom_fees)) {
    for (const fee of property.custom_fees as { name?: string; amount?: number }[]) {
      if (fee.amount && fee.amount > 0) {
        lineItems.push({
          label: fee.name || 'Additional fee',
          amount: fee.amount,
          type: 'fee',
        });
      }
    }
  }

  // Subtotal before discounts
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);

  // Weekly discount
  if (nights >= 7 && property.weekly_discount?.enabled && property.weekly_discount.percentage) {
    const weeklyAmount = (baseAmount * property.weekly_discount.percentage) / 100;
    lineItems.push({
      label: `Weekly discount (${property.weekly_discount.percentage}%)`,
      amount: -weeklyAmount,
      type: 'discount',
    });
  }

  // Monthly discount
  if (nights >= 28 && property.monthly_discount?.enabled && property.monthly_discount.percentage) {
    const monthlyAmount = (baseAmount * property.monthly_discount.percentage) / 100;
    lineItems.push({
      label: `Monthly discount (${property.monthly_discount.percentage}%)`,
      amount: -monthlyAmount,
      type: 'discount',
    });
  }

  // Promo code discount
  if (promoDiscount) {
    let promoAmount: number;
    if (promoDiscount.type === 'percentage') {
      promoAmount = (subtotal * promoDiscount.value) / 100;
      lineItems.push({
        label: `Promo discount (${promoDiscount.value}%)`,
        amount: -promoAmount,
        type: 'discount',
      });
    } else {
      promoAmount = promoDiscount.value;
      lineItems.push({
        label: `Promo discount`,
        amount: -promoAmount,
        type: 'discount',
      });
    }
  }

  const totalDiscount = Math.abs(
    lineItems.filter(i => i.type === 'discount').reduce((sum, i) => sum + i.amount, 0)
  );
  const total = Math.max(0, lineItems.reduce((sum, i) => sum + i.amount, 0));

  return {
    nights,
    nightlyRate,
    currency,
    lineItems,
    subtotal,
    totalDiscount,
    total,
  };
}
