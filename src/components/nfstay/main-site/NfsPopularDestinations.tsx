// Exact port of VPS PopularDestinations.tsx
// Queries distinct cities from Supabase nfs_properties instead of REST API
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Destination {
  city: string;
  country: string;
  propertyCount: number;
}

// Gradient palettes used as fallback when no image available
const CITY_GRADIENTS = [
  'from-purple-400 to-indigo-600',
  'from-teal-400 to-cyan-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600',
  'from-emerald-400 to-green-600',
  'from-blue-400 to-violet-600',
];

export default function NfsPopularDestinations() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 768) setVisibleCount(2);
      else if (w < 1024) setVisibleCount(3);
      else if (w < 1280) setVisibleCount(4);
      else setVisibleCount(5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase.from('nfs_properties') as any)
          .select('city, country')
          .eq('listing_status', 'listed')
          .not('city', 'is', null);

        if (data) {
          const counts: Record<string, { country: string; count: number }> = {};
          for (const row of data) {
            if (!row.city) continue;
            const key = row.city;
            if (!counts[key]) counts[key] = { country: row.country || '', count: 0 };
            counts[key].count++;
          }
          setDestinations(
            Object.entries(counts)
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 12)
              .map(([city, { country, count }]) => ({ city, country, propertyCount: count })),
          );
        }
      } catch {
        // silently skip if table doesn't exist yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Popular Destinations</h2>
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        </div>
      </section>
    );
  }

  if (destinations.length === 0) return null;

  const next = () => setCurrentIndex((i) => (i + visibleCount >= destinations.length ? 0 : i + 1));
  const prev = () => setCurrentIndex((i) => (i === 0 ? Math.max(0, destinations.length - visibleCount) : i - 1));

  return (
    <section className="py-16">
      <div className="container mx-auto sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Popular Destinations</h2>

        <div className="relative">
          <div className="flex justify-center items-center">
            <div className="overflow-hidden w-full container mx-auto">
              <div
                className="flex transition-transform duration-300 ease-in-out gap-4"
                style={{
                  transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
                  width: `${(destinations.length / visibleCount) * 100}%`,
                }}
              >
                {destinations.map((dest, idx) => (
                  <div
                    key={`${dest.city}-${idx}`}
                    className="flex-shrink-0 cursor-pointer group"
                    style={{ width: `${100 / destinations.length}%` }}
                    onClick={() =>
                      navigate(`/search?query=${encodeURIComponent(dest.city)}&city=${encodeURIComponent(dest.city)}`)
                    }
                  >
                    <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                      {/* Gradient background (VPS uses images from API; here we use gradients) */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${CITY_GRADIENTS[idx % CITY_GRADIENTS.length]}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-end p-6">
                        <h3 className="text-xl font-semibold text-white mb-1" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                          {dest.city}
                        </h3>
                        {dest.propertyCount > 0 && (
                          <p className="text-white/80 text-sm">
                            {dest.propertyCount} propert{dest.propertyCount === 1 ? 'y' : 'ies'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {destinations.length > visibleCount && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {destinations.length > visibleCount && (
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil(destinations.length - visibleCount + 1) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  i === currentIndex ? 'bg-purple-600 scale-110' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
