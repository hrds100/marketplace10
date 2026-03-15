/**
 * Admin audit log — persistent, queryable record of all admin actions.
 * Fire-and-forget: never blocks UI, never shows errors to user.
 * Table: admin_audit_log (not in generated types — uses as any).
 */
import { supabase } from '@/integrations/supabase/client';

interface AuditEntry {
  action: string;
  target_table: string;
  target_id: string;
  metadata?: Record<string, unknown>;
}

export function logAdminAction(userId: string, entry: AuditEntry): void {
  // admin_audit_log not in generated Supabase types
  (supabase.from('admin_audit_log') as any)
    .insert({
      user_id: userId,
      action: entry.action,
      target_table: entry.target_table,
      target_id: entry.target_id,
      metadata: entry.metadata || {},
    })
    .then(() => {})
    .catch((err: unknown) => {
      console.error('[AuditLog] Failed to write:', err);
    });
}
