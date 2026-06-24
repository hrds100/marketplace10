import { sb } from './client';
import type { PcrmWorkspace } from '../types';

export async function listWorkspaces(): Promise<PcrmWorkspace[]> {
  const { data, error } = await sb
    .from('pcrm_workspaces')
    .select('id, name, description, icon, color, created_by, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PcrmWorkspace[];
}

export async function getWorkspace(id: string): Promise<PcrmWorkspace | null> {
  const { data, error } = await sb
    .from('pcrm_workspaces')
    .select('id, name, description, icon, color, created_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PcrmWorkspace) ?? null;
}

export async function createWorkspace(input: {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_by: string;
}): Promise<PcrmWorkspace> {
  const { data, error } = await sb
    .from('pcrm_workspaces')
    .insert({
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PcrmWorkspace;
}

export async function renameWorkspace(id: string, name: string): Promise<void> {
  const { error } = await sb.from('pcrm_workspaces').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await sb.from('pcrm_workspaces').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateWorkspace(
  source: PcrmWorkspace,
  userId: string,
): Promise<PcrmWorkspace> {
  // Copy workspace + its fields. Rows are NOT copied (templates remain in
  // Phase 3); duplicate is a "fork the structure" operation.
  const newWs = await createWorkspace({
    name: `${source.name} (copy)`,
    description: source.description ?? undefined,
    icon: source.icon ?? undefined,
    color: source.color ?? undefined,
    created_by: userId,
  });

  const { data: fields } = await sb
    .from('pcrm_fields')
    .select('name, field_type, options, position, is_primary, is_system')
    .eq('workspace_id', source.id)
    .order('position', { ascending: true });

  if (fields && fields.length > 0) {
    const rows = (fields as Array<Record<string, unknown>>).map((f) => ({
      ...f,
      workspace_id: newWs.id,
    }));
    const { error } = await sb.from('pcrm_fields').insert(rows);
    if (error) throw error;
  }

  return newWs;
}
