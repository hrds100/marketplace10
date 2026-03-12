import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import { listings } from '@/data/mockData';
import { useFavourites } from '@/hooks/useFavourites';

export default function FavouritesPage() {
  const { toggle, isFav, favourites } = useFavourites();
  const favListings = listings.filter(l => favourites.has(l.id));

  if (favListings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart className="w-12 h-12 text-border mb-4" strokeWidth={1.5} />
        <h3 className="text-xl font-semibold text-foreground">No saved deals yet</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-[300px]">Browse live deals and tap the heart icon to save them here.</p>
        <Link to="/dashboard/deals" className="mt-5 h-11 px-6 rounded-lg bg-nfstay-black text-nfstay-black-foreground font-semibold text-sm inline-flex items-center hover:opacity-90 transition-opacity">
          Browse Deals →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[28px] font-bold text-foreground">Favourites</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Your saved rent-to-rent deals</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {favListings.map(l => (
          <PropertyCard key={l.id} listing={l} isFav={true} onToggleFav={() => toggle(l.id)} showSavedBadge />
        ))}
      </div>
    </div>
  );
}
