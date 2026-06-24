import { supabase } from '@/integrations/supabase/client';
import { sb } from './client';
import type { PcrmDocument } from '../types';

const BUCKET = 'pcrm-docs';

export async function listDocuments(rowId: string): Promise<PcrmDocument[]> {
  const { data, error } = await sb
    .from('pcrm_documents')
    .select('*')
    .eq('row_id', rowId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PcrmDocument[];
}

export async function uploadDocument(input: {
  workspace_id: string;
  row_id: string;
  file: File;
  uploaded_by: string;
}): Promise<PcrmDocument> {
  const storagePath = `${input.workspace_id}/${input.row_id}/${Date.now()}-${input.file.name}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file, { upsert: false });
  if (uploadErr) throw uploadErr;

  const { data, error } = await sb
    .from('pcrm_documents')
    .insert({
      workspace_id: input.workspace_id,
      row_id: input.row_id,
      name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      uploaded_by: input.uploaded_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PcrmDocument;
}

export async function deleteDocument(doc: PcrmDocument): Promise<void> {
  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  const { error } = await sb.from('pcrm_documents').delete().eq('id', doc.id);
  if (error) throw error;
}

export async function getDocumentUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}
