import { sb } from './client';
import type { PcrmActivityEntry } from '../types';

export async function listActivityForRow(rowId: string): Promise<PcrmActivityEntry[]> {
  const { data, error } = await sb
    .from('pcrm_activity')
    .select('id, workspace_id, row_id, user_id, action, payload, created_at')
    .eq('row_id', rowId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PcrmActivityEntry[];
}

export async function listActivityForWorkspace(workspaceId: string): Promise<PcrmActivityEntry[]> {
  const { data, error } = await sb
    .from('pcrm_activity')
    .select('id, workspace_id, row_id, user_id, action, payload, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as PcrmActivityEntry[];
}

export async function logActivity(input: {
  workspace_id: string;
  row_id?: string | null;
  user_id: string;
  action: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await sb.from('pcrm_activity').insert({
    workspace_id: input.workspace_id,
    row_id: input.row_id ?? null,
    user_id: input.user_id,
    action: input.action,
    payload: input.payload ?? {},
  });
  if (error) {
    // Activity log failures must not break the user's action.
    // eslint-disable-next-line no-console
    console.warn('[pcrm] activity log failed', error);
  }
}
