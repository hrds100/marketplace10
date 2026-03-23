/**
 * SamCart checkout query params for card investments.
 * Legacy (placeMyOrder.js): last_name = plain wallet.
 * Webhook (inv-samcart-webhook): recipient from last_name; property JSON from phone_number fallback.
 */
export function buildSamcartPrefillParams(input: {
  firstName: string;
  email: string;
  wallet: string;
  /** On-chain property id for BuyLP / RWA (prefer blockchain_property_id from inv_properties) */
  propertyId: number;
  investAmount: number;
}): Record<string, string> {
  const { firstName, email, wallet, propertyId, investAmount } = input;
  return {
    first_name: firstName,
    last_name: wallet,
    phone_number: JSON.stringify({
      propertyId,
      agentWallet: '0x0000000000000000000000000000000000000000',
      recipient: wallet,
    }),
    email,
    custom_0zdAJJKy: wallet,
    amount: String(investAmount),
  };
}
