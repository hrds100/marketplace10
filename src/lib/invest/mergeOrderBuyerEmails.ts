/**
 * Attach buyer email + wallet + name + whatsapp from profiles rows to inv_orders-shaped rows.
 * inv_orders.user_id equals auth.users.id, which equals profiles.id (current schema).
 */
export function mergeBuyerEmailsIntoOrders<
  T extends { user_id: string },
>(
  orders: T[],
  profiles: { id: string; email: string | null; wallet_address: string | null; name?: string | null; whatsapp?: string | null }[],
): (T & { user_email: string; investor_wallet: string; user_name: string; user_whatsapp: string })[] {
  const map = new Map(
    profiles.map((p) => [
      p.id,
      {
        email: (p.email ?? '').trim(),
        wallet: (p.wallet_address ?? '').trim(),
        name: (p.name ?? '').trim(),
        whatsapp: (p.whatsapp ?? '').trim(),
      },
    ]),
  );
  return orders.map((o) => {
    const b = map.get(o.user_id);
    return {
      ...o,
      user_email: b?.email ?? '',
      investor_wallet: b?.wallet ?? '',
      user_name: b?.name ?? '',
      user_whatsapp: b?.whatsapp ?? '',
    };
  });
}
