import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { createRow, deleteRow, duplicateRow, getRow, listRows, updateRow } from '../api/rows';
import type { PcrmRow } from '../types';

export function useRows(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'rows', workspaceId],
    queryFn: () => listRows(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useRow(rowId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'row', rowId],
    queryFn: () => getRow(rowId!),
    enabled: !!rowId,
  });
}

export function useCreateRow(workspaceId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { property_name?: string; address?: string; status?: string; position?: number }) => {
      if (!user) throw new Error('Not signed in');
      return createRow({ workspace_id: workspaceId, created_by: user.id, ...input });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'rows', workspaceId] }),
  });
}

export function useUpdateRow(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<PcrmRow, 'property_name' | 'address' | 'status' | 'position'>>;
    }) => updateRow(id, patch),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['pcrm', 'rows', workspaceId] });
      qc.invalidateQueries({ queryKey: ['pcrm', 'row', id] });
    },
  });
}

export function useDeleteRow(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'rows', workspaceId] }),
  });
}

export function useDuplicateRow(workspaceId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => {
      if (!user) throw new Error('Not signed in');
      return duplicateRow(id, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pcrm', 'rows', workspaceId] });
      qc.invalidateQueries({ queryKey: ['pcrm', 'cells', workspaceId] });
    },
  });
}
