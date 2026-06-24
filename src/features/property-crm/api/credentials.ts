import { sb } from './client';
import type { PcrmCredentials } from '../types';

export async function getCredentials(rowId: string): Promise<PcrmCredentials | null> {
  const { data, error } = await sb
    .from('pcrm_credentials')
    .select('*')
    .eq('row_id', rowId)
    .maybeSingle();
  if (error) throw error;
  return (data as PcrmCredentials) ?? null;
}

export async function upsertCredentials(
  rowId: string,
  patch: Partial<Omit<PcrmCredentials, 'id' | 'row_id' | 'updated_at'>>,
  updatedBy: string,
): Promise<void> {
  const { error } = await sb
    .from('pcrm_credentials')
    .upsert(
      { row_id: rowId, ...patch, updated_by: updatedBy },
      { onConflict: 'row_id' },
    );
  if (error) throw error;
}
