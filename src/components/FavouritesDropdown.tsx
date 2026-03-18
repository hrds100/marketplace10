import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFavourites } from '@/hooks/useFavourites';

interface FavProperty {
  id: string;
  name: string;
  city: string;
  rent_monthly: number;
  profit_est: number;
  photos: string[] | null;
}

export default function FavouritesDropdown() {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { favourites } = useFavourites();

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch property data when dropdown opens
  useEffect(() => {
    if (!open || favourites.size === 0) return;
    setLoading(true);
    const ids = [...favourites];
    supabase
      .from('properties')
      .select('id, name, city, rent_monthly, profit_est, photos')
      .in('id', ids)
      .then(({ data }) => {
        setProperties((data as FavProperty[]) || []);
        setLoading(false);
      });
  }, [open, favourites]);

  const handleClick = (propertyId: string) => {
    setOpen(false);
    const isDealsPage = location.pathname === '/dashboard/deals' || location.pathname === '/dashboard';
    if (isDealsPage) {
      // Already on deals — scroll to card
      const el = document.getElementById(`property-${propertyId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Brief highlight
        el.style.transition = 'box-shadow 0.3s';
        el.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.4)';
        setTimeout(() => { el.style.boxShadow = ''; }, 2000);
      }
    } else {
      // Navigate to deals page with hash
      navigate(`/dashboard/deals#property-${propertyId}`);
    }
  };

  const count = favourites.size;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          open ? 'text-red-500 bg-red-50' : 'text-muted-foreground hover:text-red-500 hover:bg-red-50'
        }`}
        title="Favourites"
      >
        <Heart className="w-[18px] h-[18px]" strokeWidth={1.8} fill={open || count > 0 ? 'currentColor' : 'none'} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[340px] bg-white border border-border/40 rounded-xl shadow-2xl z-[200] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/20">
            <span className="text-[13px] font-semibold text-foreground">Favourites</span>
            <span className="text-[11px] text-muted-foreground ml-2">{count} saved</span>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : properties.length === 0 ? (
              <div className="py-10 text-center">
                <Heart className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No favourites yet</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Click the heart on any deal to save it here</p>
              </div>
            ) : (
              properties.map((p, i) => {
                const photo = p.photos?.[0] || `https://placehold.co/96x96/f3f4f6/9ca3af?text=${encodeURIComponent(p.city || '?')}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleClick(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors ${i < properties.length - 1 ? 'border-b border-border/10' : ''}`}
                  >
                    <img
                      src={photo}
                      alt={p.name}
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/96x96/f3f4f6/9ca3af?text=${encodeURIComponent(p.city || '?')}`; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.city}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-medium text-foreground">£{p.rent_monthly?.toLocaleString()}<span className="text-muted-foreground font-normal">/mo</span></p>
                      <p className="text-[11px] font-semibold text-emerald-600">£{p.profit_est?.toLocaleString()}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
