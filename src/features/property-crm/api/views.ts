import { sb } from './client';
import type { PcrmView, PcrmViewType } from '../types';

export async function listViews(workspaceId: string): Promise<PcrmView[]> {
  const { data, error } = await sb
    .from('pcrm_views')
    .select('id, workspace_id, name, view_type, config, is_default, position, created_by, created_at')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PcrmView[];
}

export async function createView(input: {
  workspace_id: string;
  name: string;
  view_type: PcrmViewType;
  config?: Record<string, unknown>;
  created_by: string;
}): Promise<PcrmView> {
  const { data, error } = await sb
    .from('pcrm_views')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      view_type: input.view_type,
      config: input.config ?? {},
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PcrmView;
}

export async function deleteView(id: string): Promise<void> {
  const { error } = await sb.from('pcrm_views').delete().eq('id', id);
  if (error) throw error;
}
