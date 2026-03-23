import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { mergeBuyerEmailsIntoOrders } from '@/lib/invest/mergeOrderBuyerEmails';

// ── Investment Properties ──────────────────────────────────────────────

export function useInvestProperties() {
  return useQuery({
    queryKey: ['inv_properties'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('inv_properties') as any)
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInvestProperty(id: number) {
  return useQuery({
    queryKey: ['inv_properties', id],
    queryFn: async () => {
      const { data, error } = await (supabase.from('inv_properties') as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ── Admin: Create/Update/Delete Properties ─────────────────────────────

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (property: Record<string, unknown>) => {
      const { data, error } = await (supabase.from('inv_properties') as any)
        .insert(property)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_properties'] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Record<string, unknown>) => {
      const { data, error } = await (supabase.from('inv_properties') as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_properties'] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await (supabase.from('inv_properties') as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_properties'] }),
  });
}

// ── User Holdings ──────────────────────────────────────────────────────

export function useMyHoldings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['inv_shareholdings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from('inv_shareholdings') as any)
        .select('*, inv_properties(*)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ── Orders ─────────────────────────────────────────────────────────────

export function useInvestOrders() {
  return useQuery({
    queryKey: ['inv_orders'],
    queryFn: async () => {
      const { data: orders, error } = await (supabase.from('inv_orders') as any)
        .select('*, inv_properties(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = orders || [];
      if (list.length === 0) return [];
      const ids = [...new Set(list.map((o: { user_id: string }) => o.user_id).filter(Boolean))];
      const { data: profs, error: pe } = await (supabase.from('profiles') as any)
        .select('id, email')
        .in('id', ids);
      if (pe) throw pe;
      return mergeBuyerEmailsIntoOrders(list, profs || []);
    },
  });
}

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['inv_orders', 'mine', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from('inv_orders') as any)
        .select('*, inv_properties(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ── Payouts ────────────────────────────────────────────────────────────

export function useMyPayouts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['inv_payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from('inv_payouts') as any)
        .select('*, inv_properties(title, image)')
        .eq('user_id', user.id)
        .order('period_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ── Proposals ──────────────────────────────────────────────────────────

export function useProposals() {
  return useQuery({
    queryKey: ['inv_proposals'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('inv_proposals') as any)
        .select('*, inv_properties(title, image)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposal: Record<string, unknown>) => {
      const { data, error } = await (supabase.from('inv_proposals') as any)
        .insert(proposal)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_proposals'] }),
  });
}

export function useCastVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vote: { proposal_id: string; user_id: string; choice: 'yes' | 'no'; shares_weight?: number }) => {
      const { data, error } = await (supabase.from('inv_votes') as any)
        .insert(vote)
        .select()
        .single();
      if (error) throw error;
      // F10: Update vote count using select-then-update to avoid undefined
      const voteField = vote.choice === 'yes' ? 'votes_yes' : 'votes_no';
      const { data: currentProposal } = await (supabase.from('inv_proposals') as any)
        .select(voteField)
        .eq('id', vote.proposal_id)
        .single();
      const currentCount = currentProposal ? Number(currentProposal[voteField] ?? 0) : 0;
      await (supabase.from('inv_proposals') as any)
        .update({ [voteField]: currentCount + 1 })
        .eq('id', vote.proposal_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inv_proposals'] });
      qc.invalidateQueries({ queryKey: ['inv_votes'] });
    },
  });
}

// ── Boost ──────────────────────────────────────────────────────────────

export function useMyBoosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['inv_boost_status', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from('inv_boost_status') as any)
        .select('*, inv_properties(title)')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ── Commission Settings (Admin) ────────────────────────────────────────

export function useCommissionSettings() {
  return useQuery({
    queryKey: ['aff_commission_settings'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('aff_commission_settings') as any)
        .select('*')
        .order('commission_type');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateCommissionRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      const { error } = await (supabase.from('aff_commission_settings') as any)
        .update({ rate, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aff_commission_settings'] }),
  });
}

// ── Affiliate Profile ──────────────────────────────────────────────────

export function useMyAffiliateProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['aff_profiles', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.from('aff_profiles') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// ── Commissions ────────────────────────────────────────────────────────

export function useAllCommissions() {
  return useQuery({
    queryKey: ['aff_commissions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('aff_commissions') as any)
        .select('*, aff_profiles(referral_code, full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Bank Accounts ──────────────────────────────────────────────────────

export function useMyBankAccount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user_bank_accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase.from('user_bank_accounts') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useSaveBankDetails() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (details: Record<string, unknown>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await (supabase.from('user_bank_accounts') as any)
        .upsert({ ...details, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_bank_accounts'] }),
  });
}

// ── Payout Claims ──────────────────────────────────────────────────────

export function useMyPayoutClaims() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['payout_claims', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase.from('payout_claims') as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ── Admin: All Shareholders ────────────────────────────────────────────

export function useAllShareholders() {
  return useQuery({
    queryKey: ['inv_shareholdings', 'all'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('inv_shareholdings') as any)
        .select('*, inv_properties(title)');
      if (error) throw error;
      return data || [];
    },
  });
}

// ── Admin: All Payout Claims ───────────────────────────────────────────

export function useAllPayoutClaims() {
  return useQuery({
    queryKey: ['payout_claims', 'all'],
    queryFn: async () => {
      const { data: claims, error } = await (supabase.from('payout_claims') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!claims?.length) return [];

      // Fetch profile details for each unique user
      const userIds = [...new Set(claims.map((c: any) => c.user_id))];
      const { data: profiles } = await (supabase.from('profiles') as any)
        .select('id, name, whatsapp')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return claims.map((c: any) => ({
        ...c,
        profiles: profileMap.get(c.user_id) || null,
      }));
    },
  });
}
