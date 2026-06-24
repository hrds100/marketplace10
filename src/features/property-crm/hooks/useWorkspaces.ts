import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  createWorkspace,
  deleteWorkspace,
  duplicateWorkspace,
  getWorkspace,
  listWorkspaces,
  renameWorkspace,
} from '../api/workspaces';
import type { PcrmWorkspace } from '../types';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['pcrm', 'workspaces'],
    queryFn: listWorkspaces,
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'workspace', id],
    queryFn: () => getWorkspace(id!),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => {
      if (!user) throw new Error('Not signed in');
      return createWorkspace({ ...input, created_by: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'workspaces'] }),
  });
}

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkspace(id, name),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['pcrm', 'workspaces'] });
      qc.invalidateQueries({ queryKey: ['pcrm', 'workspace', id] });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'workspaces'] }),
  });
}

export function useDuplicateWorkspace() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (source: PcrmWorkspace) => {
      if (!user) throw new Error('Not signed in');
      return duplicateWorkspace(source, user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'workspaces'] }),
  });
}
