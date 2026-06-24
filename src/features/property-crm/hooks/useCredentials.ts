import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getCredentials, upsertCredentials } from '../api/credentials';
import type { PcrmCredentials } from '../types';

export function useCredentials(rowId: string | undefined) {
  return useQuery({
    queryKey: ['pcrm', 'credentials', rowId],
    queryFn: () => getCredentials(rowId!),
    enabled: !!rowId,
  });
}

type CredentialPatch = Partial<Omit<PcrmCredentials, 'id' | 'row_id' | 'updated_at'>>;

export function useUpsertCredentials(rowId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (patch: CredentialPatch) => {
      if (!user) throw new Error('Not signed in');
      return upsertCredentials(rowId, patch, user.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pcrm', 'credentials', rowId] }),
  });
}
