/**
 * SamCart checkout query params for card investments.
 *
 * Human-readable contact fields (legacy UX: last_name is NOT the wallet — SamCart maps
 * last_name to "Last Name"). Wallet + property id for the webhook live in `phone_number`
 * as compact JSON (no zero agentWallet — webhook defaults agent to zero on-chain).
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
  return {
    first_name: firstName,
    last_name: lastName,
    phone_number: JSON.stringify({
      propertyId,
      recipient: wallet,
    }),
    email,
    custom_0zdAJJKy: wallet,
    amount: String(investAmount),
  };
}
