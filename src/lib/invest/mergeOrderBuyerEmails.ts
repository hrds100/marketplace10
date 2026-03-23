/**
 * Attach buyer email from profiles rows to inv_orders-shaped rows (same user_id as auth.users).
 */
export function mergeBuyerEmailsIntoOrders<
  T extends { user_id: string },
>(
  orders: T[],
  profiles: { user_id: string; email: string | null }[],
): (T & { user_email: string })[] {
  const map = new Map(
    profiles.map((p) => [p.user_id, (p.email ?? '').trim()]),
  );
  return orders.map((o) => ({
    ...o,
    user_email: map.get(o.user_id) ?? '',
  }));
}
