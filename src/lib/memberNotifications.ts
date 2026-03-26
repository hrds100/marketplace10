import { supabase } from '@/integrations/supabase/client';

/**
 * Create an in-app notification for a member.
 * Fire-and-forget — never blocks the caller.
 *
 * NOTE: The `notifications` table is not in generated types — uses `as any`.
 * RLS: If INSERT is restricted to service-role only, these inserts will
 * silently fail. In that case, an RLS policy granting authenticated users
 * INSERT access is needed:
 *   CREATE POLICY "Users can insert notifications"
 *     ON notifications FOR INSERT
 *     TO authenticated
 *     WITH CHECK (true);
 */
export function createMemberNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  propertyId?: string | null;
}) {
  (supabase.from('notifications') as any)
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      property_id: params.propertyId || null,
      read: false,
    })
    .then(({ error }: { error: unknown }) => {
      if (error) console.warn('[memberNotifications] insert failed:', error);
    });
}
