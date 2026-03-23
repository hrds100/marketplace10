/**
 * SamCart checkout query params for card investments.
 *
 * Human-readable contact fields (legacy UX: last_name is NOT the wallet — SamCart maps
 * last_name to "Last Name"). Wallet + property id for the webhook live in `phone_number`
 * as compact JSON (no zero agentWallet — webhook defaults agent to zero on-chain).
 *
 * SamCart’s checkout JS only reads URL params: first_name, last_name, email, phone_number,
 * coupon (and context). There is no supported URL parameter to pre-fill Pay What You Want /
 * “Name your price”. The UI shows the contribution amount above the iframe instead.
 */
export function buildSamcartPrefillParams(input: {
  firstName: string;
  lastName: string;
  email: string;
  wallet: string;
  /** On-chain property id for BuyLP / RWA (prefer blockchain_property_id from inv_properties) */
  propertyId: number;
  investAmount: number;
}): Record<string, string> {
  const { firstName, lastName, email, wallet, propertyId, investAmount } = input;
  const n = Number(investAmount);
  const investAmountUsd =
    Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;

  return {
    first_name: firstName,
    last_name: lastName,
    email,
    phone_number: JSON.stringify({
      propertyId,
      recipient: wallet,
      investAmountUsd,
    }),
    custom_0zdAJJKy: wallet,
  };
}
