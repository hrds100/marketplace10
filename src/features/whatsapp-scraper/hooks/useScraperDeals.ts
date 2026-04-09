import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ScraperDeal, DealStatus } from '../types';

export function useScraperDeals(statusFilter?: DealStatus) {
  const [deals, setDeals] = useState<ScraperDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = (supabase.from('wa_scraper_deals') as any)
        .select('id, group_id, group_name, wa_message_id, sender_phone, sender_name, raw_text, parsed_data, images, status, property_id, created_at');

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setDeals([]);
        return;
      }

      setDeals(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deals');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const approveDeal = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await (supabase.from('wa_scraper_deals') as any)
        .update({ status: 'approved' })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDeals(prev => prev.map(d => d.id === id ? { ...d, status: 'approved' as const } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve deal');
    }
  }, []);

  const rejectDeal = useCallback(async (id: string) => {
    try {
      const { error: updateError } = await (supabase.from('wa_scraper_deals') as any)
        .update({ status: 'rejected' })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDeals(prev => prev.map(d => d.id === id ? { ...d, status: 'rejected' as const } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject deal');
    }
  }, []);

  const submitDeal = useCallback(async (id: string) => {
    try {
      const deal = deals.find(d => d.id === id);
      if (!deal || !deal.parsed_data) {
        setError('Cannot submit deal without parsed data');
        return;
      }

      const pd = deal.parsed_data;

      // Insert into properties table
      const { data: property, error: insertError } = await (supabase.from('properties') as any)
        .insert({
          title: pd.title ?? 'Untitled Deal',
          city: pd.city ?? null,
          postcode: pd.postcode ?? null,
          bedrooms: pd.bedrooms ?? null,
          bathrooms: pd.bathrooms ?? null,
          rent_monthly: pd.rent_monthly ?? null,
          profit_est: pd.profit_est ?? null,
          property_type: pd.property_type ?? null,
          property_category: pd.property_category ?? null,
          deal_type: pd.deal_type ?? null,
          furnished: pd.furnished ?? null,
          description: pd.description ?? null,
          contact_whatsapp: deal.sender_phone ?? null,
          photos: deal.images ?? [],
          status: 'pending',
          source: 'whatsapp_scraper',
        })
        .select('id')
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // Update deal status
      const { error: updateError } = await (supabase.from('wa_scraper_deals') as any)
        .update({ status: 'submitted', property_id: property.id })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDeals(prev => prev.map(d => d.id === id ? { ...d, status: 'submitted' as const, property_id: property.id } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit deal');
    }
  }, [deals]);

  const bulkApprove = useCallback(async (ids: string[]) => {
    try {
      const { error: updateError } = await (supabase.from('wa_scraper_deals') as any)
        .update({ status: 'approved' })
        .in('id', ids);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'approved' as const } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk approve');
    }
  }, []);

  const bulkReject = useCallback(async (ids: string[]) => {
    try {
      const { error: updateError } = await (supabase.from('wa_scraper_deals') as any)
        .update({ status: 'rejected' })
        .in('id', ids);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setDeals(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'rejected' as const } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk reject');
    }
  }, []);

  return { deals, loading, error, approveDeal, rejectDeal, submitDeal, bulkApprove, bulkReject, refetch: fetchDeals };
}
