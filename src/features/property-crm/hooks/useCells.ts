import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { listCells, setCell } from '../api/cells';

export function useCells(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'cells', workspaceId],
    queryFn: () => listCells(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useSetCell(workspaceId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ row_id, field_id, value }: { row_id: string; field_id: string; value: unknown }) => {
      if (!user) throw new Error('Not signed in');
      return setCell({ row_id, field_id, value, updated_by: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'cells', workspaceId] }),
  });
}
