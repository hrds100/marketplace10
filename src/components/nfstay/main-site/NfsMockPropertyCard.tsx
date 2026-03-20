// Property card for mock/demo properties on nfstay.app main site
// Uses MockProperty type (not Supabase NfsProperty)
import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ChevronLeft, ChevronRight, MapPin, Users, BedDouble, Bath } from "lucide-react";
import type { MockProperty } from "@/data/nfstay/mock-properties";
import { CURRENCIES } from "@/lib/nfstay/constants";

interface Props {
  property: MockProperty;
}

export function NfsMockPropertyCard({ property }: Props) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavourite, setIsFavourite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sortedImages = [...property.images].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return a.order - b.order;
  });

  const isNew = Date.now() - new Date(property.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const currency = CURRENCIES.find(c => c.code === property.base_rate_currency);

  const toggleFavourite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const favs: string[] = JSON.parse(localStorage.getItem('nfs_favourites') || '[]');
    const next = isFavourite ? favs.filter(id => id !== property.id) : [...favs, property.id];
    localStorage.setItem('nfs_favourites', JSON.stringify(next));
    setIsFavourite(!isFavourite);
  };

  return (
    <Link
      to={`/property/${property.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2.5">
        <img
          src={sortedImages[currentImage]?.url}
          alt={sortedImages[currentImage]?.caption || property.public_title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Badges */}
        {isNew && (
          <div className="absolute top-3 left-3 bg-card text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
            New
          </div>
        )}

        {/* Favourite */}
        <button onClick={toggleFavourite} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition">
          <Heart className={`w-4 h-4 ${isFavourite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
        </button>

        {/* Prev / Next */}
        {sortedImages.length > 1 && isHovered && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); setCurrentImage(i => (i - 1 + sortedImages.length) % sortedImages.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center transition text-gray-700 hover:scale-105"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setCurrentImage(i => (i + 1) % sortedImages.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center transition text-gray-700 hover:scale-105"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
            {sortedImages.slice(0, 5).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImage ? 'bg-white scale-125' : 'bg-white/60'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate leading-snug">{property.public_title}</p>
          <span className="text-xs font-medium text-primary flex-shrink-0">{property.property_type}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {property.city}, {property.country}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{property.max_guests}</span>
          <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{property.room_counts.bedrooms} bd</span>
          <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{property.room_counts.bathrooms} ba</span>
        </div>
        <p className="text-sm text-foreground mt-0.5">
          <span className="font-semibold">{currency?.symbol ?? property.base_rate_currency} {property.base_rate_amount}</span>
          <span className="font-normal text-muted-foreground"> / night</span>
        </p>
      </div>
    </Link>
  );
}
