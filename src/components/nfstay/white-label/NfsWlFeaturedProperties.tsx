// Featured properties grid — fetches 6 most recent listed properties
// Platform mode: all operators. Operator mode: scoped to operator.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNfsWhiteLabel } from '@/hooks/nfstay/use-nfs-white-label';
import { supabase } from '@/integrations/supabase/client';
import NfsWlPropertyCard from './NfsWlPropertyCard';
import type { NfsProperty } from '@/lib/nfstay/types';

export default function NfsWlFeaturedProperties() {
  const navigate = useNavigate();
  const { operator, isPlatform } = useNfsWhiteLabel();
  const [properties, setProperties] = useState<NfsProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!operator?.id) return;

    const fetchFeatured = async () => {
      try {
        let q = (supabase.from('nfs_properties') as any)
          .select('*')
          .eq('listing_status', 'listed')
          .order('updated_at', { ascending: false })
          .limit(6);

        // Only filter by operator if not platform mode
        if (!isPlatform) {
          q = q.eq('operator_id', operator.id);
        }

        const { data } = await q;
        setProperties((data as NfsProperty[]) ?? []);
      } catch {
        // Silently fail — featured section is non-critical
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, [operator?.id, isPlatform]);

  if (!loading && properties.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-2 text-2xl font-bold text-center">Featured Properties</h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Our most recent listings
        </p>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <NfsWlPropertyCard
                key={p.id}
                property={p}
                onClick={() => navigate(`/property/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
