import { useQuery } from '@tanstack/react-query';
import { sb } from '../api/client';
import type { PcrmRole } from '../types';

// Returns the calling user's role in a workspace ('admin'|'manager'|'staff'|
// 'viewer'), or null if they aren't a member. Hardcoded admin emails always
// resolve to 'admin' via the SECURITY DEFINER function pcrm_workspace_role().
export function useMyWorkspaceRole(workspaceId: string | undefined) {
  return useQuery<PcrmRole | null>({
    queryKey: ['pcrm', 'my-role', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await sb.rpc('pcrm_workspace_role', {
        p_workspace_id: workspaceId,
      });
      if (error) return null;
      return (data as PcrmRole | null) ?? null;
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
