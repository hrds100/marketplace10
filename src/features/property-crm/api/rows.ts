import { sb } from './client';
import type { PcrmRow } from '../types';

export async function listRows(workspaceId: string): Promise<PcrmRow[]> {
  const { data, error } = await sb
    .from('pcrm_rows')
    .select('id, workspace_id, property_name, address, status, position, created_by, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PcrmRow[];
}

export async function getRow(id: string): Promise<PcrmRow | null> {
  const { data, error } = await sb
    .from('pcrm_rows')
    .select('id, workspace_id, property_name, address, status, position, created_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PcrmRow) ?? null;
}

export async function createRow(input: {
  workspace_id: string;
  property_name?: string;
  address?: string;
  status?: string;
  position?: number;
  created_by: string;
}): Promise<PcrmRow> {
  const { data, error } = await sb
    .from('pcrm_rows')
    .insert({
      workspace_id: input.workspace_id,
      property_name: input.property_name ?? 'Untitled property',
      address: input.address ?? null,
      status: input.status ?? 'active',
      position: input.position ?? 0,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PcrmRow;
}

export async function updateRow(
  id: string,
  patch: Partial<Pick<PcrmRow, 'property_name' | 'address' | 'status' | 'position'>>,
): Promise<void> {
  const { error } = await sb.from('pcrm_rows').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteRow(id: string): Promise<void> {
  const { error } = await sb.from('pcrm_rows').delete().eq('id', id);
  if (error) throw error;
}
