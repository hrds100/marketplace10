import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { sb } from '../api/client';
import type { PcrmRole } from '../types';

// One-shot lookup of the calling user's role across every workspace they
// belong to. Hardcoded admin emails (hugo / admin / chris) get an empty
// map but the home page treats them as workspace admin via useAuth().isAdmin.
export function useMyMemberships() {
  const { user } = useAuth();
  return useQuery<Record<string, PcrmRole>>({
    queryKey: ['pcrm', 'my-memberships', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await sb
        .from('pcrm_members')
        .select('workspace_id, role')
        .eq('user_id', user.id);
      if (error) return {};
      const map: Record<string, PcrmRole> = {};
      for (const m of (data ?? []) as Array<{ workspace_id: string; role: PcrmRole }>) {
        map[m.workspace_id] = m.role;
      }
      return map;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
