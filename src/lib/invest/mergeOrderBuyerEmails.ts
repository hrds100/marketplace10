/**
 * Attach buyer email from profiles rows to inv_orders-shaped rows.
 * inv_orders.user_id equals auth.users.id, which equals profiles.id (current schema).
 */
export function mergeBuyerEmailsIntoOrders<
  T extends { user_id: string },
>(
  orders: T[],
  profiles: { id: string; email: string | null }[],
): (T & { user_email: string })[] {
  const map = new Map(
    profiles.map((p) => [p.id, (p.email ?? '').trim()]),
  );
  return orders.map((o) => ({
    ...o,
    user_email: map.get(o.user_id) ?? '',
  }));
}
