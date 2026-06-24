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

// Duplicates a row inside the same workspace, copying every cell value
// and the credentials block. Documents are NOT copied (files in storage
// — large objects, less likely to want a second copy).
export async function duplicateRow(rowId: string, userId: string): Promise<PcrmRow> {
  const { data: source, error: srcErr } = await sb
    .from('pcrm_rows')
    .select('workspace_id, property_name, address, status, position')
    .eq('id', rowId)
    .single();
  if (srcErr) throw srcErr;
  const src = source as Pick<PcrmRow, 'workspace_id' | 'property_name' | 'address' | 'status' | 'position'>;

  const { data: newRowRaw, error: insErr } = await sb
    .from('pcrm_rows')
    .insert({
      workspace_id: src.workspace_id,
      property_name: `${src.property_name} (copy)`,
      address: src.address,
      status: src.status,
      position: src.position,
      created_by: userId,
    })
    .select()
    .single();
  if (insErr) throw insErr;
  const newRow = newRowRaw as PcrmRow;

  const { data: cells, error: cellsErr } = await sb
    .from('pcrm_cells')
    .select('field_id, value')
    .eq('row_id', rowId);
  if (cellsErr) throw cellsErr;

  const cellRows = (cells ?? []) as Array<{ field_id: string; value: unknown }>;
  if (cellRows.length > 0) {
    const { error: cellsInsErr } = await sb.from('pcrm_cells').insert(
      cellRows.map((c) => ({
        row_id: newRow.id,
        field_id: c.field_id,
        value: c.value,
        updated_by: userId,
      })),
    );
    if (cellsInsErr) throw cellsInsErr;
  }

  const { data: creds } = await sb
    .from('pcrm_credentials')
    .select(
      'wifi_name, wifi_password, wifi_provider, broadband_email, broadband_password, broadband_provider, broadband_account_number, booking_email, booking_password, booking_provider, notes',
    )
    .eq('row_id', rowId)
    .maybeSingle();
  if (creds) {
    await sb.from('pcrm_credentials').insert({
      row_id: newRow.id,
      ...(creds as Record<string, unknown>),
      updated_by: userId,
    });
  }

  return newRow;
}
