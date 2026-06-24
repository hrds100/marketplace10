import { sb } from './client';
import type { PcrmCell } from '../types';

export async function listCells(workspaceId: string): Promise<PcrmCell[]> {
  // Pull every cell whose row belongs to the workspace. Two-step to avoid
  // a JOIN through PostgREST: first the row ids, then the cells.
  const { data: rowIds, error: rowsErr } = await sb
    .from('pcrm_rows')
    .select('id')
    .eq('workspace_id', workspaceId);
  if (rowsErr) throw rowsErr;

  const ids = ((rowIds ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) return [];

  const { data, error } = await sb
    .from('pcrm_cells')
    .select('id, row_id, field_id, value, updated_by, updated_at')
    .in('row_id', ids);
  if (error) throw error;
  return (data ?? []) as PcrmCell[];
}

export async function setCell(input: {
  row_id: string;
  field_id: string;
  value: unknown;
  updated_by: string;
}): Promise<void> {
  const { error } = await sb
    .from('pcrm_cells')
    .upsert(
      {
        row_id: input.row_id,
        field_id: input.field_id,
        value: input.value,
        updated_by: input.updated_by,
      },
      { onConflict: 'row_id,field_id' },
    );
  if (error) throw error;
}
