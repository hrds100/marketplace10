import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { listActivityForRow, listActivityForWorkspace, logActivity } from '../api/activity';

export function useRowActivity(rowId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'activity', 'row', rowId],
    queryFn: () => listActivityForRow(rowId!),
    enabled: !!rowId,
  });
}

export function useWorkspaceActivity(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'activity', 'workspace', workspaceId],
    queryFn: () => listActivityForWorkspace(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (input: {
      workspace_id: string;
      row_id?: string | null;
      action: string;
      payload?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not signed in');
      return logActivity({ ...input, user_id: user.id });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pcrm', 'activity', 'workspace', vars.workspace_id] });
      if (vars.row_id) qc.invalidateQueries({ queryKey: ['pcrm', 'activity', 'row', vars.row_id] });
    },
  });
}
