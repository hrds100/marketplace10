import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { NfsProperty } from '@/lib/nfstay/types';

interface NfsPropertySearchParams {
  query?: string;
  city?: string;
  country?: string;
  minGuests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
}

interface UseNfsPropertySearchReturn {
  results: NfsProperty[];
  loading: boolean;
  error: string | null;
  search: (params: NfsPropertySearchParams) => Promise<void>;
}

export function useNfsPropertySearch(): UseNfsPropertySearchReturn {
  const [results, setResults] = useState<NfsProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: NfsPropertySearchParams) => {
    setLoading(true);
    setError(null);

    try {
      let query = (supabase.from('nfs_properties') as any)
        .select('*')
        .eq('listing_status', 'listed');

      if (params.query) {
        query = query.or(
          `public_title.ilike.%${params.query}%,description.ilike.%${params.query}%,address.ilike.%${params.query}%`
        );
      }

      if (params.city) {
        query = query.ilike('city', `%${params.city}%`);
      }

      if (params.country) {
        query = query.ilike('country', `%${params.country}%`);
      }

      if (params.minGuests != null) {
        query = query.gte('max_guests', params.minGuests);
      }

      if (params.minPrice != null) {
        query = query.gte('base_rate_amount', params.minPrice);
      }

      if (params.maxPrice != null) {
        query = query.lte('base_rate_amount', params.maxPrice);
      }

      if (params.propertyType) {
        query = query.eq('property_type', params.propertyType);
      }

      const { data, error: dbError } = await query.order('updated_at', { ascending: false });

      if (dbError) {
        if (dbError.code === '42P01') {
          setError('nfstay tables not yet created. Run the Phase 2 migration first.');
        } else {
          setError(dbError.message);
        }
        setResults([]);
      } else {
        setResults((data as NfsProperty[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}
