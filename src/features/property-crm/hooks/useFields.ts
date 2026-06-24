import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createField,
  deleteField,
  listFields,
  renameField,
  reorderFields,
  updateFieldOptions,
} from '../api/fields';
import type { PcrmFieldType } from '../types';

export function useFields(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'fields', workspaceId],
    queryFn: () => listFields(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateField(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; field_type: PcrmFieldType; position: number }) =>
      createField({ workspace_id: workspaceId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'fields', workspaceId] }),
  });
}

export function useRenameField(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameField(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'fields', workspaceId] }),
  });
}

export function useUpdateFieldOptions(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options: unknown[] }) =>
      updateFieldOptions(id, options),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'fields', workspaceId] }),
  });
}

export function useReorderFields(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => reorderFields(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'fields', workspaceId] }),
  });
}

export function useDeleteField(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteField(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'fields', workspaceId] }),
  });
}
