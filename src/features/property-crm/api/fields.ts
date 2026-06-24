import { sb } from './client';
import type { PcrmField, PcrmFieldType } from '../types';

export async function listFields(workspaceId: string): Promise<PcrmField[]> {
  const { data, error } = await sb
    .from('pcrm_fields')
    .select('id, workspace_id, name, field_type, options, position, is_primary, is_system, created_at')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PcrmField[];
}

export async function createField(input: {
  workspace_id: string;
  name: string;
  field_type: PcrmFieldType;
  position: number;
  options?: unknown[];
}): Promise<PcrmField> {
  const { data, error } = await sb
    .from('pcrm_fields')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      field_type: input.field_type,
      position: input.position,
      options: input.options ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as PcrmField;
}

export async function renameField(id: string, name: string): Promise<void> {
  const { error } = await sb.from('pcrm_fields').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function updateFieldOptions(id: string, options: unknown[]): Promise<void> {
  const { error } = await sb.from('pcrm_fields').update({ options }).eq('id', id);
  if (error) throw error;
}

export async function reorderFields(ids: string[]): Promise<void> {
  // Persist a new order by writing position for each id in sequence.
  // Done one-by-one to keep RLS-checked updates simple.
  for (let i = 0; i < ids.length; i++) {
    const { error } = await sb
      .from('pcrm_fields')
      .update({ position: i })
      .eq('id', ids[i]);
    if (error) throw error;
  }
}

export async function deleteField(id: string): Promise<void> {
  const { error } = await sb.from('pcrm_fields').delete().eq('id', id);
  if (error) throw error;
}
