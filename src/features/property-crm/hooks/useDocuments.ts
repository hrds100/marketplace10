import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { deleteDocument, listDocuments, uploadDocument } from '../api/documents';
import type { PcrmDocument } from '../types';

export function useDocuments(rowId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'documents', rowId],
    queryFn: () => listDocuments(rowId!),
    enabled: !!rowId,
  });
}

export function useUploadDocument(workspaceId: string, rowId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (file: File) => {
      if (!user) throw new Error('Not signed in');
      return uploadDocument({ workspace_id: workspaceId, row_id: rowId, file, uploaded_by: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'documents', rowId] }),
  });
}

export function useDeleteDocument(rowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: PcrmDocument) => deleteDocument(doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'documents', rowId] }),
  });
}
